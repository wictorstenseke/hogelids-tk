import { describe, expect, it } from 'vitest'
import {
  BOOKING_BOARD_REFETCH_ON_MOUNT,
  BOOKING_BOARD_STALE_TIME_MS,
} from './queryStaleTimes'

describe('booking board query freshness', () => {
  it('does not treat public booking board data as indefinitely fresh', () => {
    expect(BOOKING_BOARD_STALE_TIME_MS).toBeLessThan(60 * 1000)
    expect(BOOKING_BOARD_REFETCH_ON_MOUNT).toBe('always')
  })
})
