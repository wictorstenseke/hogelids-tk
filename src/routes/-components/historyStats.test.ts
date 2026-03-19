import { describe, it, expect } from 'vitest'
import { Timestamp } from 'firebase/firestore'
import { computeStats } from './historyStats'
import type { BookingWithId } from '../../services/BookingService'

function makeBooking(date: Date, id = Math.random().toString()): BookingWithId {
  const startTime = Timestamp.fromDate(date)
  const endTime = Timestamp.fromDate(new Date(date.getTime() + 60 * 60 * 1000))
  return {
    id,
    type: 'guest',
    ownerEmail: 'test@example.com',
    ownerUid: null,
    ownerDisplayName: 'Test User',
    startTime,
    endTime,
    createdAt: Timestamp.fromDate(new Date('2024-01-01')),
  }
}

const b2023jan = makeBooking(new Date('2023-01-15'), 'b2023jan')
const b2023feb = makeBooking(new Date('2023-02-20'), 'b2023feb')
const b2023feb2 = makeBooking(new Date('2023-02-28'), 'b2023feb2')
const b2024mar = makeBooking(new Date('2024-03-10'), 'b2024mar')
const b2024dec = makeBooking(new Date('2024-12-01'), 'b2024dec')

const allBookings = [b2023jan, b2023feb, b2023feb2, b2024mar, b2024dec]

describe('computeStats', () => {
  it('returns zero totals when selectedYears is empty', () => {
    const result = computeStats(allBookings, [])
    expect(result.totalBookings).toBe(0)
    expect(result.byYearByMonth).toEqual({})
  })

  it('counts correct total across selected years', () => {
    const result = computeStats(allBookings, [2023, 2024])
    expect(result.totalBookings).toBe(5)
  })

  it('counts correct total for a single selected year', () => {
    const result = computeStats(allBookings, [2023])
    expect(result.totalBookings).toBe(3)
  })

  it('groups bookings by year and month correctly', () => {
    const result = computeStats(allBookings, [2023, 2024])

    // 2023: January (0) → 1, February (1) → 2
    expect(result.byYearByMonth[2023][0]).toBe(1)
    expect(result.byYearByMonth[2023][1]).toBe(2)

    // 2024: March (2) → 1, December (11) → 1
    expect(result.byYearByMonth[2024][2]).toBe(1)
    expect(result.byYearByMonth[2024][11]).toBe(1)
  })

  it('excludes years not in selectedYears', () => {
    const result = computeStats(allBookings, [2024])
    expect(result.byYearByMonth[2023]).toBeUndefined()
    expect(result.totalBookings).toBe(2)
  })

  it('returns empty byYearByMonth when no bookings match selected years', () => {
    const result = computeStats(allBookings, [2022])
    expect(result.totalBookings).toBe(0)
    expect(result.byYearByMonth).toEqual({})
  })

  it('handles empty bookings array', () => {
    const result = computeStats([], [2023, 2024])
    expect(result.totalBookings).toBe(0)
    expect(result.byYearByMonth).toEqual({})
  })
})
