import {
  archivedToBooking,
  archivedToLadder,
  type HistoryArchive,
} from '../lib/historyArchive'
import type { BookingWithId } from './BookingService'
import type { Ladder } from './LadderService'

export const HISTORY_ARCHIVE_PATH = '/history-archive.json'
export const HISTORY_ARCHIVE_QUERY_KEY = ['history-archive'] as const

interface LoadedArchive {
  version: HistoryArchive['version']
  generatedAt: number
  earliestYear: number
  lastArchivedYear: number
  bookings: BookingWithId[]
  completedLadders: Ladder[]
}

export async function loadHistoryArchive(): Promise<LoadedArchive> {
  // `force-cache`: archive JSON is overwritten only when ops re-run `npm run archive:build`
  // and re-deploy. Within a session it never changes, so prefer the disk/HTTP cache.
  const res = await fetch(HISTORY_ARCHIVE_PATH, { cache: 'force-cache' })
  if (!res.ok) {
    throw new Error(`history archive fetch failed: ${res.status}`)
  }
  const text = await res.text()
  const raw = JSON.parse(text) as HistoryArchive
  return {
    version: raw.version,
    generatedAt: raw.generatedAt,
    earliestYear: raw.earliestYear,
    lastArchivedYear: raw.lastArchivedYear,
    bookings: raw.bookings.map(archivedToBooking),
    completedLadders: (raw.completedLadders ?? []).map(archivedToLadder),
  }
}

export function getArchivedBookingsByYear(
  archive: LoadedArchive,
  year: number
): BookingWithId[] {
  if (year > archive.lastArchivedYear || year < archive.earliestYear) return []
  return archive.bookings.filter(
    (b) => b.endTime.toDate().getFullYear() === year
  )
}

export type { LoadedArchive }
