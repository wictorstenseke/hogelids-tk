import { describe, it, expect, vi } from 'vitest'
import { Timestamp } from 'firebase/firestore'
import {
  hasConflict,
  mapBookingSnapshot,
  findConflictingBooking,
  isOwnBooking,
  canDeleteBooking,
} from './BookingService'
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

function makeMemberBooking(
  overrides: Partial<BookingWithId> = {}
): BookingWithId {
  return {
    id: 'b1',
    type: 'member',
    ownerEmail: 'member@htk.se',
    ownerUid: 'uid-member',
    ownerDisplayName: 'Test Member',
    startTime: Timestamp.fromDate(new Date(`${date}T10:00:00`)),
    endTime: Timestamp.fromDate(new Date(`${date}T12:00:00`)),
    createdAt: Timestamp.fromDate(new Date()),
    ...overrides,
  }
}

function makeGuestBooking(
  overrides: Partial<BookingWithId> = {}
): BookingWithId {
  return {
    ...makeMemberBooking(),
    type: 'guest',
    ownerEmail: 'guest@example.com',
    ownerUid: null,
    ...overrides,
  }
}

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

describe('findConflictingBooking', () => {
  it('returns null when no bookings', () => {
    const start = new Date(`${date}T10:00:00`)
    const end = new Date(`${date}T12:00:00`)
    expect(findConflictingBooking([], start, end)).toBeNull()
  })

  it('returns the conflicting booking when there is an overlap', () => {
    const booking = makeBooking(10, 12)
    const start = new Date(`${date}T11:00:00`)
    const end = new Date(`${date}T13:00:00`)
    const result = findConflictingBooking([booking], start, end)
    expect(result).not.toBeNull()
    expect(result?.id).toBe('test-id')
  })

  it('returns null for adjacent bookings (no overlap)', () => {
    const booking = makeBooking(10, 12)
    const start = new Date(`${date}T12:00:00`)
    const end = new Date(`${date}T14:00:00`)
    expect(findConflictingBooking([booking], start, end)).toBeNull()
  })

  it('returns the first conflicting booking among multiple', () => {
    const b1 = { ...makeBooking(8, 10), id: 'first' }
    const b2 = { ...makeBooking(11, 13), id: 'second' }
    const start = new Date(`${date}T09:00:00`)
    const end = new Date(`${date}T12:00:00`)
    const result = findConflictingBooking([b1, b2], start, end)
    expect(result?.id).toBe('first')
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

describe('isOwnBooking', () => {
  it('guest matches by email', () => {
    const b = makeGuestBooking({ ownerEmail: 'g@example.com' })
    expect(isOwnBooking(b, null, 'g@example.com')).toBe(true)
  })

  it('guest email mismatch → false', () => {
    const b = makeGuestBooking({ ownerEmail: 'g@example.com' })
    expect(isOwnBooking(b, null, 'other@example.com')).toBe(false)
  })

  it('member matches by ownerUid', () => {
    const b = makeMemberBooking({ ownerUid: 'uid-1' })
    expect(isOwnBooking(b, { uid: 'uid-1' }, null)).toBe(true)
  })

  it('member uid mismatch → false', () => {
    const b = makeMemberBooking({ ownerUid: 'uid-1' })
    expect(isOwnBooking(b, { uid: 'uid-2' }, null)).toBe(false)
  })

  it('ladder participant A is own booking', () => {
    const b = makeMemberBooking({ playerAId: 'uid-a', playerBId: 'uid-b' })
    expect(isOwnBooking(b, { uid: 'uid-a' }, null)).toBe(true)
  })

  it('ladder participant B is own booking', () => {
    const b = makeMemberBooking({ playerAId: 'uid-a', playerBId: 'uid-b' })
    expect(isOwnBooking(b, { uid: 'uid-b' }, null)).toBe(true)
  })

  it('non-participant is not own booking', () => {
    const b = makeMemberBooking({ playerAId: 'uid-a', playerBId: 'uid-b' })
    expect(isOwnBooking(b, { uid: 'uid-c' }, null)).toBe(false)
  })

  it('no user and no guestEmail → false', () => {
    const b = makeMemberBooking()
    expect(isOwnBooking(b, null, null)).toBe(false)
  })
})

describe('canDeleteBooking', () => {
  it('any user can delete a guest booking', () => {
    const b = makeGuestBooking()
    expect(canDeleteBooking(b, null)).toBe(true)
    expect(canDeleteBooking(b, { uid: 'uid-anyone' })).toBe(true)
  })

  it('member can delete own member booking', () => {
    const b = makeMemberBooking({ ownerUid: 'uid-1' })
    expect(canDeleteBooking(b, { uid: 'uid-1' })).toBe(true)
  })

  it("member cannot delete another member's booking", () => {
    const b = makeMemberBooking({ ownerUid: 'uid-1' })
    expect(canDeleteBooking(b, { uid: 'uid-2' })).toBe(false)
  })

  it('unauthenticated user cannot delete member booking', () => {
    const b = makeMemberBooking()
    expect(canDeleteBooking(b, null)).toBe(false)
  })

  it('ladder participant A can delete', () => {
    const b = makeMemberBooking({ playerAId: 'uid-a', playerBId: 'uid-b' })
    expect(canDeleteBooking(b, { uid: 'uid-a' })).toBe(true)
  })

  it('ladder participant B can delete', () => {
    const b = makeMemberBooking({ playerAId: 'uid-a', playerBId: 'uid-b' })
    expect(canDeleteBooking(b, { uid: 'uid-b' })).toBe(true)
  })

  it('non-participant cannot delete ladder booking', () => {
    const b = makeMemberBooking({ playerAId: 'uid-a', playerBId: 'uid-b' })
    expect(canDeleteBooking(b, { uid: 'uid-c' })).toBe(false)
  })
})
