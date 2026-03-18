import { describe, it, expect, vi } from 'vitest'
import { Timestamp } from 'firebase/firestore'
import { hasConflict } from './BookingService'
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
