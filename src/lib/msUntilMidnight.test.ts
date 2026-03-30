import { describe, it, expect, afterEach, vi } from 'vitest'
import { msUntilMidnight } from './msUntilMidnight'

describe('msUntilMidnight', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns a positive number', () => {
    expect(msUntilMidnight()).toBeGreaterThan(0)
  })

  it('returns less than one full day in ms (86_400_000)', () => {
    expect(msUntilMidnight()).toBeLessThan(86_400_000)
  })

  it('returns a small number (< 60_000ms) when it is just before midnight', () => {
    // 23:59:30.000 local time — 30 seconds before midnight
    const justBeforeMidnight = new Date()
    justBeforeMidnight.setHours(23, 59, 30, 0)
    vi.useFakeTimers()
    vi.setSystemTime(justBeforeMidnight)

    const ms = msUntilMidnight()
    expect(ms).toBeGreaterThan(0)
    expect(ms).toBeLessThan(60_000)
  })
})
