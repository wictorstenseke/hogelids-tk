import { Timestamp } from 'firebase/firestore'
import { describe, expect, it } from 'vitest'
import { isLadderChallengeOpenNow } from './ladderTournamentStart'

describe('isLadderChallengeOpenNow', () => {
  const enabled = { bookingEnabled: true }
  const disabled = { bookingEnabled: false }

  it('returns true when tournamentStartsAt is null and booking enabled', () => {
    expect(
      isLadderChallengeOpenNow(
        { tournamentStartsAt: null },
        enabled,
        new Date('2026-06-15T12:00:00')
      )
    ).toBe(true)
  })

  it('returns false when booking is disabled regardless of date', () => {
    expect(
      isLadderChallengeOpenNow(
        { tournamentStartsAt: null },
        disabled,
        new Date('2026-06-15T12:00:00')
      )
    ).toBe(false)
  })

  it('returns false when now is before tournamentStartsAt', () => {
    const starts = Timestamp.fromDate(new Date('2026-06-20T00:00:00'))
    expect(
      isLadderChallengeOpenNow(
        { tournamentStartsAt: starts },
        enabled,
        new Date('2026-06-15T12:00:00')
      )
    ).toBe(false)
  })

  it('returns true exactly at tournamentStartsAt', () => {
    const starts = Timestamp.fromDate(new Date('2026-06-20T00:00:00'))
    expect(
      isLadderChallengeOpenNow(
        { tournamentStartsAt: starts },
        enabled,
        new Date('2026-06-20T00:00:00')
      )
    ).toBe(true)
  })

  it('returns true after tournamentStartsAt', () => {
    const starts = Timestamp.fromDate(new Date('2026-06-20T00:00:00'))
    expect(
      isLadderChallengeOpenNow(
        { tournamentStartsAt: starts },
        enabled,
        new Date('2026-07-01T00:00:00')
      )
    ).toBe(true)
  })

  it('returns false when booking disabled even if tournament started', () => {
    const starts = Timestamp.fromDate(new Date('2026-06-20T00:00:00'))
    expect(
      isLadderChallengeOpenNow(
        { tournamentStartsAt: starts },
        disabled,
        new Date('2026-07-01T00:00:00')
      )
    ).toBe(false)
  })
})
