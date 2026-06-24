/**
 * Backfills ownerDisplayName on member bookings that were migrated from guest
 * bookings before the migration started copying the display name.
 *
 * Two kinds of stale rows are repaired, both on member bookings with a linked
 * ownerUid:
 *   1. guest->member migrations that kept the email in ownerDisplayName
 *      (ownerDisplayName === ownerEmail)
 *   2. legacy-imported bookings with a blank ownerDisplayName ('')
 * For both, ownerDisplayName is replaced with the live profile name from
 * users/{ownerUid}.
 *
 * Auth: requires GOOGLE_APPLICATION_CREDENTIALS env pointing at a service
 * account JSON, OR `gcloud auth application-default login`.
 *
 * Dry run (default, no writes):
 *   npm run backfill:names                          # prod
 *   FIREBASE_PROJECT_ID=hogelids-tk-dev npm run backfill:names
 *
 * Apply changes:
 *   npm run backfill:names -- --apply               # prod
 *   FIREBASE_PROJECT_ID=hogelids-tk-dev npm run backfill:names -- --apply
 */
import { readFileSync, existsSync } from 'node:fs'
import {
  initializeApp,
  applicationDefault,
  cert,
  getApps,
} from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

const PROJECT_ID = process.env['FIREBASE_PROJECT_ID'] ?? 'hogelids-tk-prod'
const APPLY = process.argv.includes('--apply')

function getCredential() {
  const keyPath = process.env['GOOGLE_APPLICATION_CREDENTIALS']
  if (keyPath && existsSync(keyPath)) {
    const json = JSON.parse(readFileSync(keyPath, 'utf8'))
    return cert(json)
  }
  return applicationDefault()
}

async function main() {
  if (getApps().length === 0) {
    initializeApp({
      credential: getCredential(),
      projectId: PROJECT_ID,
    })
  }
  const db = getFirestore()

  console.log(
    `[backfill] project ${PROJECT_ID} — ${APPLY ? 'APPLY (writing)' : 'DRY RUN (no writes)'}`
  )

  // Stale rows: member bookings whose ownerUid is set but ownerDisplayName is
  // broken (equals the email, or blank). We filter in memory because Firestore
  // can't compare two fields against each other.
  const snapshot = await db
    .collection('bookings')
    .where('type', '==', 'member')
    .get()

  const profileCache = new Map<string, string | null>()
  async function profileName(uid: string): Promise<string | null> {
    if (profileCache.has(uid)) return profileCache.get(uid) ?? null
    const userSnap = await db.collection('users').doc(uid).get()
    const name = userSnap.exists
      ? ((userSnap.data()?.['displayName'] as string | undefined) ?? null)
      : null
    profileCache.set(uid, name)
    return name
  }

  let scanned = 0
  let stale = 0
  let fixed = 0
  let skippedNoProfile = 0
  const batch = db.batch()
  let pending = 0

  for (const docSnap of snapshot.docs) {
    scanned += 1
    const data = docSnap.data()
    const ownerUid = (data['ownerUid'] as string | null) ?? null
    const ownerEmail = (data['ownerEmail'] as string | undefined) ?? ''
    const ownerDisplayName =
      (data['ownerDisplayName'] as string | undefined) ?? ''

    // Stale signature: linked account, but the name is either the email
    // (guest->member migration) or blank (legacy import).
    const isStale =
      ownerUid !== null &&
      (ownerDisplayName === '' ||
        (ownerEmail !== '' && ownerDisplayName === ownerEmail))
    if (!isStale) {
      continue
    }
    stale += 1

    const name = await profileName(ownerUid)
    if (!name || name === ownerEmail) {
      skippedNoProfile += 1
      console.log(
        `[backfill]  SKIP ${docSnap.id} — no usable profile name for uid ${ownerUid} (email ${ownerEmail})`
      )
      continue
    }

    const oldLabel = ownerDisplayName === '' ? '(blank)' : ownerDisplayName
    console.log(
      `[backfill]  FIX  ${docSnap.id} — ${oldLabel} -> "${name}" (${ownerEmail})`
    )
    fixed += 1
    if (APPLY) {
      batch.update(docSnap.ref, { ownerDisplayName: name })
      pending += 1
      if (pending === 400) {
        await batch.commit()
        pending = 0
      }
    }
  }

  if (APPLY && pending > 0) {
    await batch.commit()
  }

  console.log(
    `[backfill] done — scanned ${scanned} member bookings, ${stale} stale, ${fixed} ${APPLY ? 'updated' : 'would update'}, ${skippedNoProfile} skipped (no profile name)`
  )
  if (!APPLY && fixed > 0) {
    console.log('[backfill] re-run with `-- --apply` to write these changes.')
  }
}

main().catch((err) => {
  console.error('[backfill] failed:', err)
  process.exit(1)
})
