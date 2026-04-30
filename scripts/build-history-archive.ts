/**
 * Generates public/history-archive.json from prod Firestore bookings.
 *
 * Auth: requires GOOGLE_APPLICATION_CREDENTIALS env pointing at a service
 * account JSON for hogelids-tk-prod, OR `gcloud auth application-default login`.
 *
 * Run: npm run archive:build
 */
import { writeFileSync, readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  initializeApp,
  applicationDefault,
  cert,
  getApps,
} from 'firebase-admin/app'
import { getFirestore, Timestamp } from 'firebase-admin/firestore'
import {
  buildArchive,
  HISTORY_ARCHIVE_VERSION,
  type HistoryArchive,
} from '../src/lib/historyArchive'
import type { BookingWithId } from '../src/services/BookingService'
import type { Ladder, LadderParticipant } from '../src/services/LadderService'

const PROJECT_ID = process.env['FIREBASE_PROJECT_ID'] ?? 'hogelids-tk-prod'
const OUT_PATH = resolve(process.cwd(), 'public', 'history-archive.json')

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
  const currentYear = new Date().getFullYear()
  const cutoff = Timestamp.fromDate(new Date(currentYear, 0, 1))

  console.log(
    `[archive] reading bookings with endTime < ${cutoff.toDate().toISOString()} from project ${PROJECT_ID}...`
  )
  const snapshot = await db
    .collection('bookings')
    .where('endTime', '<', cutoff)
    .orderBy('endTime', 'asc')
    .get()

  const bookings: BookingWithId[] = snapshot.docs.map((doc) => {
    const data = doc.data()
    const base: BookingWithId = {
      id: doc.id,
      type: data['type'] as 'guest' | 'member',
      ownerEmail: data['ownerEmail'] as string,
      ownerUid: (data['ownerUid'] as string | null) ?? null,
      ownerDisplayName: data['ownerDisplayName'] as string,
      startTime: data['startTime'] as unknown as BookingWithId['startTime'],
      endTime: data['endTime'] as unknown as BookingWithId['endTime'],
      createdAt: data['createdAt'] as unknown as BookingWithId['createdAt'],
    }
    if (data['ladderId']) {
      base.ladderId = data['ladderId'] as string
      base.playerAId = data['playerAId'] as string
      base.playerBId = data['playerBId'] as string
      base.playerAName = data['playerAName'] as string
      base.playerBName = data['playerBName'] as string
    }
    return base
  })

  console.log(
    `[archive] reading completed ladders from project ${PROJECT_ID}...`
  )
  const laddersSnap = await db
    .collection('ladders')
    .where('status', '==', 'completed')
    .get()

  const completedLadders: Ladder[] = laddersSnap.docs.map((doc) => {
    const data = doc.data()
    return {
      id: doc.id,
      name: data['name'] as string,
      year: data['year'] as number,
      status: 'completed',
      joinOpensAt:
        data['joinOpensAt'] != null
          ? (data['joinOpensAt'] as unknown as Ladder['joinOpensAt'])
          : null,
      tournamentStartsAt:
        data['tournamentStartsAt'] != null
          ? (data[
              'tournamentStartsAt'
            ] as unknown as Ladder['tournamentStartsAt'])
          : null,
      createdAt: data['createdAt'] as unknown as Ladder['createdAt'],
      completedAt:
        data['completedAt'] != null
          ? (data['completedAt'] as unknown as Ladder['completedAt'])
          : null,
      participants: (data['participants'] ?? []) as LadderParticipant[],
    }
  })

  const archive: HistoryArchive = buildArchive(
    bookings,
    currentYear,
    completedLadders
  )
  writeFileSync(OUT_PATH, JSON.stringify(archive))
  console.log(
    `[archive] wrote ${archive.bookings.length} bookings + ${archive.completedLadders.length} completed ladders (years ${archive.earliestYear}-${archive.lastArchivedYear}) to ${OUT_PATH} (version ${HISTORY_ARCHIVE_VERSION})`
  )
}

main().catch((err) => {
  console.error('[archive] failed:', err)
  process.exit(1)
})
