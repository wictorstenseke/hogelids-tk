import { describe, it, expect } from 'vitest'
import { Timestamp } from 'firebase/firestore'
import {
  buildArchive,
  archivedToBooking,
  HISTORY_ARCHIVE_VERSION,
} from './historyArchive'
import type { BookingWithId } from '../services/BookingService'

function mkBooking(
  overrides: { endTime: Date; id: string } & Omit<
    Partial<BookingWithId>,
    'endTime' | 'id'
  >
): BookingWithId {
  const start = overrides.startTime ?? Timestamp.fromDate(overrides.endTime)
  const end = Timestamp.fromDate(overrides.endTime)
  return {
    id: overrides.id,
    type: overrides.type ?? 'member',
    ownerEmail: overrides.ownerEmail ?? 'a@b.c',
    ownerUid: overrides.ownerUid ?? null,
    ownerDisplayName: overrides.ownerDisplayName ?? 'A',
    startTime: start as Timestamp,
    endTime: end,
    createdAt: overrides.createdAt ?? end,
    ...(overrides.ladderId
      ? {
          ladderId: overrides.ladderId,
          playerAId: overrides.playerAId,
          playerBId: overrides.playerBId,
          playerAName: overrides.playerAName,
          playerBName: overrides.playerBName,
        }
      : {}),
  }
}

describe('buildArchive', () => {
  it('only includes bookings with endTime.year < currentYear', () => {
    const bookings: BookingWithId[] = [
      mkBooking({ id: '1', endTime: new Date('2023-06-01T10:00:00Z') }),
      mkBooking({ id: '2', endTime: new Date('2024-12-31T23:59:00Z') }),
      mkBooking({ id: '3', endTime: new Date('2025-01-01T08:00:00Z') }),
      mkBooking({ id: '4', endTime: new Date('2026-04-29T12:00:00Z') }),
    ]
    const archive = buildArchive(bookings, 2026)
    const ids = archive.bookings.map((b) => b.id).sort()
    expect(ids).toEqual(['1', '2', '3'])
  })

  it('records lastArchivedYear and earliestYear from kept bookings', () => {
    const bookings: BookingWithId[] = [
      mkBooking({ id: 'a', endTime: new Date('2018-03-01T10:00:00Z') }),
      mkBooking({ id: 'b', endTime: new Date('2024-09-01T10:00:00Z') }),
    ]
    const archive = buildArchive(bookings, 2026)
    expect(archive.earliestYear).toBe(2018)
    expect(archive.lastArchivedYear).toBe(2025)
  })

  it('sets lastArchivedYear to currentYear-1 even when archive is empty', () => {
    const archive = buildArchive([], 2026)
    expect(archive.bookings).toEqual([])
    expect(archive.lastArchivedYear).toBe(2025)
    expect(archive.earliestYear).toBe(2025)
  })

  it('serializes Timestamps as {seconds, nanoseconds}', () => {
    const ts = Timestamp.fromMillis(1700000000_000)
    const bookings: BookingWithId[] = [
      mkBooking({
        id: 'x',
        endTime: ts.toDate(),
        startTime: ts,
        createdAt: ts,
      }),
    ]
    const archive = buildArchive(bookings, 2026)
    const archived = archive.bookings[0]
    expect(archived.endTime.seconds).toBe(ts.seconds)
    expect(archived.endTime.nanoseconds).toBe(ts.nanoseconds)
  })

  it('preserves optional ladder fields when present', () => {
    const bookings: BookingWithId[] = [
      mkBooking({
        id: 'l',
        endTime: new Date('2024-05-01T10:00:00Z'),
        ladderId: 'main',
        playerAId: 'pa',
        playerBId: 'pb',
        playerAName: 'Alice',
        playerBName: 'Bob',
      }),
    ]
    const archive = buildArchive(bookings, 2026)
    const archived = archive.bookings[0]
    expect(archived.ladderId).toBe('main')
    expect(archived.playerAName).toBe('Alice')
  })

  it('stamps version + generatedAt', () => {
    const before = Date.now()
    const archive = buildArchive([], 2026)
    expect(archive.version).toBe(HISTORY_ARCHIVE_VERSION)
    expect(archive.generatedAt).toBeGreaterThanOrEqual(before)
  })
})

describe('archivedToBooking', () => {
  it('round-trips through buildArchive + archivedToBooking', () => {
    const original: BookingWithId = mkBooking({
      id: 'r',
      endTime: new Date('2024-06-01T10:00:00Z'),
      type: 'guest',
      ownerEmail: 'g@h.se',
      ownerDisplayName: 'Gäst',
    })
    const archive = buildArchive([original], 2026)
    const restored = archivedToBooking(archive.bookings[0])
    expect(restored.id).toBe(original.id)
    expect(restored.type).toBe('guest')
    expect(restored.ownerDisplayName).toBe('Gäst')
    expect(restored.endTime.toMillis()).toBe(original.endTime.toMillis())
    expect(restored.endTime).toBeInstanceOf(Timestamp)
  })
})

describe('archive shape (consumed by historyStats)', () => {
  it('archived bookings provide endTime.toDate()', () => {
    const archive = buildArchive(
      [mkBooking({ id: '1', endTime: new Date('2024-01-01T00:00:00Z') })],
      2026
    )
    const restored = archivedToBooking(archive.bookings[0])
    expect(restored.endTime.toDate().getFullYear()).toBe(2024)
  })
})
