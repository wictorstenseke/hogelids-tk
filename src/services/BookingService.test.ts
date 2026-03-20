import { describe, it, expect, vi } from 'vitest'
import { Timestamp } from 'firebase/firestore'
import { hasConflict, mapBookingSnapshot } from './BookingService'
import type { BookingWithId } from './BookingService'

vi.mock('../lib/firebase', () => ({ db: {} }))

function makeBooking(
  startHour: number,
  endHour: number,
  date = '2026-03-18'
): BookingWithId {
  return {
    id: 'test-id',
    type: 'guest',
    ownerEmail: 'test@example.com',
    ownerUid: null,
    ownerDisplayName: 'Test User',
    startTime: Timestamp.fromDate(
      new Date(`${date}T${String(startHour).padStart(2, '0')}:00:00`)
    ),
    endTime: Timestamp.fromDate(
      new Date(`${date}T${String(endHour).padStart(2, '0')}:00:00`)
    ),
    createdAt: Timestamp.fromDate(new Date()),
  }
}

const date = '2026-03-18'

describe('hasConflict', () => {
  it('no bookings → false', () => {
    const start = new Date(`${date}T10:00:00`)
    const end = new Date(`${date}T12:00:00`)
    expect(hasConflict([], start, end)).toBe(false)
  })

  it('exact same time → true', () => {
    const booking = makeBooking(10, 12)
    const start = new Date(`${date}T10:00:00`)
    const end = new Date(`${date}T12:00:00`)
    expect(hasConflict([booking], start, end)).toBe(true)
  })

  it('new booking starts during existing → true (existing: 10-12, new: 11-13)', () => {
    const booking = makeBooking(10, 12)
    const start = new Date(`${date}T11:00:00`)
    const end = new Date(`${date}T13:00:00`)
    expect(hasConflict([booking], start, end)).toBe(true)
  })

  it('new booking ends during existing → true (existing: 10-12, new: 9-11)', () => {
    const booking = makeBooking(10, 12)
    const start = new Date(`${date}T09:00:00`)
    const end = new Date(`${date}T11:00:00`)
    expect(hasConflict([booking], start, end)).toBe(true)
  })

  it('new booking fully inside existing → true (existing: 10-12, new: 10:30-11:30)', () => {
    const booking = makeBooking(10, 12)
    const start = new Date(`${date}T10:30:00`)
    const end = new Date(`${date}T11:30:00`)
    expect(hasConflict([booking], start, end)).toBe(true)
  })

  it('existing fully inside new → true (existing: 10-12, new: 9-13)', () => {
    const booking = makeBooking(10, 12)
    const start = new Date(`${date}T09:00:00`)
    const end = new Date(`${date}T13:00:00`)
    expect(hasConflict([booking], start, end)).toBe(true)
  })

  it('adjacent end-to-start → false (existing: 10-12, new: 12-14)', () => {
    const booking = makeBooking(10, 12)
    const start = new Date(`${date}T12:00:00`)
    const end = new Date(`${date}T14:00:00`)
    expect(hasConflict([booking], start, end)).toBe(false)
  })

  it('adjacent start-to-end → false (existing: 12-14, new: 10-12)', () => {
    const booking = makeBooking(12, 14)
    const start = new Date(`${date}T10:00:00`)
    const end = new Date(`${date}T12:00:00`)
    expect(hasConflict([booking], start, end)).toBe(false)
  })

  it('multiple bookings, one conflicts → true', () => {
    const bookings = [
      makeBooking(8, 10),
      makeBooking(10, 12),
      makeBooking(14, 16),
    ]
    const start = new Date(`${date}T11:00:00`)
    const end = new Date(`${date}T13:00:00`)
    expect(hasConflict(bookings, start, end)).toBe(true)
  })

  it('multiple bookings, none conflict → false', () => {
    const bookings = [
      makeBooking(8, 10),
      makeBooking(10, 12),
      makeBooking(14, 16),
    ]
    const start = new Date(`${date}T12:00:00`)
    const end = new Date(`${date}T14:00:00`)
    expect(hasConflict(bookings, start, end)).toBe(false)
  })
})

describe('mapBookingSnapshot', () => {
  it('maps a regular booking snapshot correctly', () => {
    const start = new Date('2026-03-20T10:00:00')
    const end = new Date('2026-03-20T12:00:00')
    const created = new Date('2026-03-01T08:00:00')

    // Minimal mock of a Firestore QueryDocumentSnapshot
    const fakeSnap = {
      id: 'abc123',
      data: () => ({
        type: 'member',
        ownerEmail: 'test@htk.se',
        ownerUid: 'uid-1',
        ownerDisplayName: 'Anna Karlsson',
        startTime: Timestamp.fromDate(start),
        endTime: Timestamp.fromDate(end),
        createdAt: Timestamp.fromDate(created),
      }),
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = mapBookingSnapshot(fakeSnap as any)

    expect(result.id).toBe('abc123')
    expect(result.type).toBe('member')
    expect(result.ownerEmail).toBe('test@htk.se')
    expect(result.ownerUid).toBe('uid-1')
    expect(result.startTime.toDate()).toEqual(start)
    expect(result.endTime.toDate()).toEqual(end)
    expect(result.ladderId).toBeUndefined()
  })

  it('maps a ladder booking snapshot and includes ladder fields', () => {
    const fakeSnap = {
      id: 'ladder-booking-1',
      data: () => ({
        type: 'member',
        ownerEmail: 'a@htk.se',
        ownerUid: 'uid-a',
        ownerDisplayName: 'Player A',
        startTime: Timestamp.fromDate(new Date('2026-03-20T14:00:00')),
        endTime: Timestamp.fromDate(new Date('2026-03-20T15:00:00')),
        createdAt: Timestamp.fromDate(new Date()),
        ladderId: 'ladder-99',
        playerAId: 'uid-a',
        playerBId: 'uid-b',
        playerAName: 'Player A',
        playerBName: 'Player B',
      }),
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = mapBookingSnapshot(fakeSnap as any)

    expect(result.id).toBe('ladder-booking-1')
    expect(result.ladderId).toBe('ladder-99')
    expect(result.playerAId).toBe('uid-a')
    expect(result.playerBId).toBe('uid-b')
    expect(result.playerAName).toBe('Player A')
    expect(result.playerBName).toBe('Player B')
  })
})
