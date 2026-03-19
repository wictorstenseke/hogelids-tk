import { collection, writeBatch, doc, Timestamp } from 'firebase/firestore'
import { db } from './firebase'
import reservationsData from '../../docs/reservations.json'

interface LegacyReservation {
  id: string
  start: string
  stop: string
  name: string
  deleted_at: string | null
  created_at: string
  updated_at: string
}

function parseTimestamp(str: string): Timestamp {
  return Timestamp.fromDate(new Date(str.replace(' ', 'T')))
}

export async function migrateReservations(): Promise<void> {
  const records = (
    reservationsData[2] as { type: string; data: LegacyReservation[] }
  ).data

  const active = records.filter((r) => r.deleted_at === null)

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
    const batch = writeBatch(db)
    bookings.slice(i, i + BATCH_SIZE).forEach((b) => {
      batch.set(doc(collection(db, 'bookings')), b)
    })
    await batch.commit()
    console.log(`[migrate] Committed batch ${Math.floor(i / BATCH_SIZE) + 1}`)
  }

  console.log(
    `[migrate] Migration complete: ${bookings.length} bookings imported.`
  )
}
