import { Timestamp } from 'firebase/firestore'
import type { BookingWithId } from '../services/BookingService'

export const HISTORY_ARCHIVE_VERSION = 1 as const

interface ArchivedTimestamp {
  seconds: number
  nanoseconds: number
}

export interface ArchivedBooking {
  id: string
  type: 'guest' | 'member'
  ownerEmail: string
  ownerUid: string | null
  ownerDisplayName: string
  startTime: ArchivedTimestamp
  endTime: ArchivedTimestamp
  createdAt: ArchivedTimestamp
  ladderId?: string
  playerAId?: string
  playerBId?: string
  playerAName?: string
  playerBName?: string
}

export interface HistoryArchive {
  version: typeof HISTORY_ARCHIVE_VERSION
  generatedAt: number
  earliestYear: number
  lastArchivedYear: number
  bookings: ArchivedBooking[]
}

function tsToArchived(ts: Timestamp): ArchivedTimestamp {
  return { seconds: ts.seconds, nanoseconds: ts.nanoseconds }
}

function bookingToArchived(b: BookingWithId): ArchivedBooking {
  const base: ArchivedBooking = {
    id: b.id,
    type: b.type,
    ownerEmail: b.ownerEmail,
    ownerUid: b.ownerUid,
    ownerDisplayName: b.ownerDisplayName,
    startTime: tsToArchived(b.startTime),
    endTime: tsToArchived(b.endTime),
    createdAt: tsToArchived(b.createdAt),
  }
  if (b.ladderId) {
    base.ladderId = b.ladderId
    base.playerAId = b.playerAId
    base.playerBId = b.playerBId
    base.playerAName = b.playerAName
    base.playerBName = b.playerBName
  }
  return base
}

export function buildArchive(
  bookings: BookingWithId[],
  currentYear: number
): HistoryArchive {
  const cutoff = currentYear
  const archived = bookings
    .filter((b) => b.endTime.toDate().getFullYear() < cutoff)
    .map(bookingToArchived)
  const years = archived.map((a) =>
    new Date(a.endTime.seconds * 1000).getFullYear()
  )
  const earliestYear = years.length ? Math.min(...years) : cutoff - 1
  return {
    version: HISTORY_ARCHIVE_VERSION,
    generatedAt: Date.now(),
    earliestYear,
    lastArchivedYear: cutoff - 1,
    bookings: archived,
  }
}

export function archivedToBooking(a: ArchivedBooking): BookingWithId {
  const base: BookingWithId = {
    id: a.id,
    type: a.type,
    ownerEmail: a.ownerEmail,
    ownerUid: a.ownerUid,
    ownerDisplayName: a.ownerDisplayName,
    startTime: new Timestamp(a.startTime.seconds, a.startTime.nanoseconds),
    endTime: new Timestamp(a.endTime.seconds, a.endTime.nanoseconds),
    createdAt: new Timestamp(a.createdAt.seconds, a.createdAt.nanoseconds),
  }
  if (a.ladderId) {
    base.ladderId = a.ladderId
    base.playerAId = a.playerAId
    base.playerBId = a.playerBId
    base.playerAName = a.playerAName
    base.playerBName = a.playerBName
  }
  return base
}
