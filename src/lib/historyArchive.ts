import { Timestamp } from 'firebase/firestore'
import type { BookingWithId } from '../services/BookingService'
import type { Ladder, LadderParticipant } from '../services/LadderService'

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

export interface ArchivedLadder {
  id: string
  name: string
  year: number
  status: 'completed'
  joinOpensAt: ArchivedTimestamp | null
  tournamentStartsAt: ArchivedTimestamp | null
  createdAt: ArchivedTimestamp
  completedAt: ArchivedTimestamp | null
  participants: LadderParticipant[]
}

export interface HistoryArchive {
  version: typeof HISTORY_ARCHIVE_VERSION
  generatedAt: number
  earliestYear: number
  lastArchivedYear: number
  bookings: ArchivedBooking[]
  completedLadders: ArchivedLadder[]
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

function ladderToArchived(l: Ladder): ArchivedLadder {
  return {
    id: l.id,
    name: l.name,
    year: l.year,
    status: 'completed',
    joinOpensAt: l.joinOpensAt ? tsToArchived(l.joinOpensAt) : null,
    tournamentStartsAt: l.tournamentStartsAt
      ? tsToArchived(l.tournamentStartsAt)
      : null,
    createdAt: tsToArchived(l.createdAt),
    completedAt: l.completedAt ? tsToArchived(l.completedAt) : null,
    participants: l.participants,
  }
}

export function buildArchive(
  bookings: BookingWithId[],
  currentYear: number,
  completedLadders: Ladder[] = []
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
    completedLadders: completedLadders.map(ladderToArchived),
  }
}

export function archivedToLadder(a: ArchivedLadder): Ladder {
  return {
    id: a.id,
    name: a.name,
    year: a.year,
    status: 'completed',
    joinOpensAt: a.joinOpensAt
      ? new Timestamp(a.joinOpensAt.seconds, a.joinOpensAt.nanoseconds)
      : null,
    tournamentStartsAt: a.tournamentStartsAt
      ? new Timestamp(
          a.tournamentStartsAt.seconds,
          a.tournamentStartsAt.nanoseconds
        )
      : null,
    createdAt: new Timestamp(a.createdAt.seconds, a.createdAt.nanoseconds),
    completedAt: a.completedAt
      ? new Timestamp(a.completedAt.seconds, a.completedAt.nanoseconds)
      : null,
    participants: a.participants,
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
