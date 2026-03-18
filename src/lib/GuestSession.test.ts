import { describe, it, expect, beforeEach } from 'vitest'
import {
  getEmail,
  setEmail,
  getName,
  setName,
  getBookingCount,
  incrementBookingCount,
  shouldShowNudge,
} from './GuestSession'

beforeEach(() => {
  localStorage.clear()
})

describe('getEmail', () => {
  it('returns null when not set', () => {
    expect(getEmail()).toBeNull()
  })

  it('returns stored value', () => {
    localStorage.setItem('htk_guest_email', 'test@example.com')
    expect(getEmail()).toBe('test@example.com')
  })
})

describe('setEmail', () => {
  it('stores value', () => {
    setEmail('user@example.com')
    expect(localStorage.getItem('htk_guest_email')).toBe('user@example.com')
  })
})

describe('getName', () => {
  it('returns null when not set', () => {
    expect(getName()).toBeNull()
  })

  it('returns stored value', () => {
    localStorage.setItem('htk_guest_name', 'Anna')
    expect(getName()).toBe('Anna')
  })
})

describe('setName', () => {
  it('stores value', () => {
    setName('Erik')
    expect(localStorage.getItem('htk_guest_name')).toBe('Erik')
  })
})

describe('getBookingCount', () => {
  it('returns 0 when not set', () => {
    expect(getBookingCount()).toBe(0)
  })
})

describe('incrementBookingCount', () => {
  it('increments from 0 to 1', () => {
    incrementBookingCount()
    expect(getBookingCount()).toBe(1)
  })

  it('increments from 1 to 2', () => {
    localStorage.setItem('htk_booking_count', '1')
    incrementBookingCount()
    expect(getBookingCount()).toBe(2)
  })
})

describe('shouldShowNudge', () => {
  it('returns false when count is 0', () => {
    expect(shouldShowNudge()).toBe(false)
  })

  it('returns false when count is 1 (odd)', () => {
    localStorage.setItem('htk_booking_count', '1')
    expect(shouldShowNudge()).toBe(false)
  })

  it('returns true when count is 2 (even, > 0)', () => {
    localStorage.setItem('htk_booking_count', '2')
    expect(shouldShowNudge()).toBe(true)
  })

  it('returns false when count is 3', () => {
    localStorage.setItem('htk_booking_count', '3')
    expect(shouldShowNudge()).toBe(false)
  })

  it('returns true when count is 4', () => {
    localStorage.setItem('htk_booking_count', '4')
    expect(shouldShowNudge()).toBe(true)
  })
})
