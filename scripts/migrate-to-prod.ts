/**
 * One-off migration script: imports historical bookings from docs/reservations.json
 * into the prod Firestore project (hogelids-tk-prod).
 *
 * Usage:
 *   npx tsx scripts/migrate-to-prod.ts
 *
 * Requires the prod service account key at:
 *   ~/Documents/hogelids-tk-prod-firebase-adminsdk-fbsvc-95d5df7409.json
 */

import admin from 'firebase-admin'
import { readFileSync } from 'fs'
import { resolve } from 'path'

const SERVICE_ACCOUNT_PATH = resolve(
  process.env.HOME!,
  'Documents/hogelids-tk-prod-firebase-adminsdk-fbsvc-95d5df7409.json'
)

const serviceAccount = JSON.parse(readFileSync(SERVICE_ACCOUNT_PATH, 'utf-8'))

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'hogelids-tk-prod',
})

const db = admin.firestore()

interface LegacyReservation {
  id: string
  start: string
  stop: string
  name: string
  deleted_at: string | null
  created_at: string
  updated_at: string
}

function parseTimestamp(str: string): admin.firestore.Timestamp {
  return admin.firestore.Timestamp.fromDate(new Date(str.replace(' ', 'T')))
}

async function migrate() {
  const raw = JSON.parse(
    readFileSync(resolve(process.cwd(), 'docs/reservations.json'), 'utf-8')
  )
  const records = (raw[2] as { type: string; data: LegacyReservation[] }).data
  const active = records.filter((r) => r.deleted_at === null)

  console.log(
    `Found ${records.length} total records, ${active.length} active (deleted skipped).`
  )

  const bookings = active.map((r) => ({
    type: 'guest' as const,
    ownerEmail: 'migrated@htk.se',
    ownerUid: null,
    ownerDisplayName: r.name,
    startTime: parseTimestamp(r.start),
    endTime: parseTimestamp(r.stop),
    createdAt: parseTimestamp(r.created_at),
  }))

  const BATCH_SIZE = 499
  for (let i = 0; i < bookings.length; i += BATCH_SIZE) {
    const batch = db.batch()
    bookings.slice(i, i + BATCH_SIZE).forEach((b) => {
      batch.set(db.collection('bookings').doc(), b)
    })
    await batch.commit()
    console.log(`Committed batch ${Math.floor(i / BATCH_SIZE) + 1}`)
  }

  console.log(
    `Migration complete: ${bookings.length} bookings imported to prod.`
  )
}

migrate().catch((err) => {
  console.error('Migration failed:', err)
  process.exit(1)
})
