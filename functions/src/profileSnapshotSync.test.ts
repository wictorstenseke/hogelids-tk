import { describe, expect, it } from 'vitest'
import {
  PROFILE_BOOKING_SYNC_RULES,
  shouldSyncUpcomingBooking,
} from './profileSnapshotSync'

describe('profile snapshot sync helpers', () => {
  it('keeps booking sync queries to single user fields', () => {
    expect(PROFILE_BOOKING_SYNC_RULES.map((rule) => rule.userField)).toEqual([
      'ownerUid',
      'opponentUid',
      'playerAId',
      'playerBId',
    ])
  })

  it('filters past bookings after a single-field user query', () => {
    const now = Date.parse('2026-06-01T10:00:00Z')

    expect(
      shouldSyncUpcomingBooking(
        { endTime: { toMillis: () => now + 60_000 } },
        now
      )
    ).toBe(true)
    expect(
      shouldSyncUpcomingBooking(
        { endTime: { toMillis: () => now - 60_000 } },
        now
      )
    ).toBe(false)
  })
})
