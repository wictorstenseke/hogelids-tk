import { describe, expect, it } from 'vitest'
import { resolveBookingInterval } from './bookingInterval'

const D = '2025-06-15'

describe('resolveBookingInterval', () => {
  it('accepts same-day when end is after start', () => {
    const r = resolveBookingInterval(D, '10:00', '12:00')
    expect(r).not.toBeNull()
    expect(r!.start.getHours()).toBe(10)
    expect(r!.end.getHours()).toBe(12)
    expect(r!.end.getDate()).toBe(r!.start.getDate())
  })

  it('rejects same-day when end is before start (not overnight)', () => {
    expect(resolveBookingInterval(D, '10:00', '09:00')).toBeNull()
  })

  it('accepts overnight 23:00–01:00 with end on next calendar day', () => {
    const r = resolveBookingInterval(D, '23:00', '01:00')
    expect(r).not.toBeNull()
    expect(r!.start.getDate()).toBe(15)
    expect(r!.end.getDate()).toBe(16)
    expect(r!.end.getHours()).toBe(1)
  })

  it('rejects 23:00–07:00 (end not before 06:00)', () => {
    expect(resolveBookingInterval(D, '23:00', '07:00')).toBeNull()
  })

  it('rejects 21:00–01:00 (start before 22:00)', () => {
    expect(resolveBookingInterval(D, '21:00', '01:00')).toBeNull()
  })

  it('rejects identical start and end', () => {
    expect(resolveBookingInterval(D, '22:00', '22:00')).toBeNull()
  })
})
