import type { LadderParticipant } from '../services/LadderService'

export type ChallengeReason =
  | 'self'
  | 'lower-ranked'
  | 'too-far'
  | 'paused-opponent'
  | 'paused-self'
  | 'not-found'

export interface ChallengeEligibility {
  eligible: boolean
  reason?: ChallengeReason
}

/** Max positions above you that you may challenge (and max gap for rank swap on win). */
export const MAX_CHALLENGE_DISTANCE = 4

/**
 * Returns whether challengerId can challenge opponentId given current ladder state.
 * Uses active (non-paused) participants only for position calculations.
 */
export function getChallengeEligibility(
  participants: LadderParticipant[],
  challengerId: string,
  opponentId: string
): ChallengeEligibility {
  if (challengerId === opponentId) {
    return { eligible: false, reason: 'self' }
  }

  const challenger = participants.find((p) => p.uid === challengerId)
  const opponent = participants.find((p) => p.uid === opponentId)

  if (!challenger || !opponent) {
    return { eligible: false, reason: 'not-found' }
  }

  if (challenger.paused) {
    return { eligible: false, reason: 'paused-self' }
  }

  if (opponent.paused) {
    return { eligible: false, reason: 'paused-opponent' }
  }

  if (challenger.position <= opponent.position) {
    return { eligible: false, reason: 'lower-ranked' }
  }

  if (challenger.position - opponent.position > MAX_CHALLENGE_DISTANCE) {
    return { eligible: false, reason: 'too-far' }
  }

  return { eligible: true }
}

/**
 * Applies a match result to the ladder participants array.
 * - Always increments wins/losses for winner/loser.
 * - Swaps positions only if, at report time, winner is ranked below loser
 *   and within MAX_CHALLENGE_DISTANCE positions.
 * - Returns a new array; does not mutate input.
 */
export function applyMatchResult(
  participants: LadderParticipant[],
  winnerId: string,
  loserId: string
): LadderParticipant[] {
  const updated = participants.map((p) => {
    if (p.uid === winnerId) return { ...p, wins: p.wins + 1 }
    if (p.uid === loserId) return { ...p, losses: p.losses + 1 }
    return { ...p }
  })

  const winner = updated.find((p) => p.uid === winnerId)
  const loser = updated.find((p) => p.uid === loserId)

  if (!winner || !loser) return updated

  // Position swap only if winner is currently below loser and within range
  const shouldSwap =
    !winner.paused &&
    !loser.paused &&
    winner.position > loser.position &&
    winner.position - loser.position <= MAX_CHALLENGE_DISTANCE

  if (!shouldSwap) return updated

  const winnerPos = winner.position
  const loserPos = loser.position

  return updated.map((p) => {
    if (p.uid === winnerId) return { ...p, position: loserPos }
    if (p.uid === loserId) return { ...p, position: winnerPos }
    return { ...p }
  })
}

export interface StatLeader {
  label: string
  playerName: string
  value: number
  valueSuffix: string
}

/**
 * Returns the three stat leaders (most matches, most wins, most fearless)
 * from the given participants, or null if no matches have been completed.
 */
export function getStatsLeaders(
  participants: LadderParticipant[]
): StatLeader[] | null {
  const hasMatches = participants.some((p) => p.wins > 0 || p.losses > 0)
  if (!hasMatches) return null

  const byPosition = (a: LadderParticipant, b: LadderParticipant) =>
    a.position - b.position

  const sorted = [...participants].sort(byPosition)

  const mostMatches = sorted.reduce((best, p) =>
    p.wins + p.losses > best.wins + best.losses ? p : best
  )

  const mostWins = sorted.reduce((best, p) => (p.wins > best.wins ? p : best))

  const mostLosses = sorted.reduce((best, p) =>
    p.losses > best.losses ? p : best
  )

  return [
    {
      label: 'Flest matcher',
      playerName: mostMatches.displayName,
      value: mostMatches.wins + mostMatches.losses,
      valueSuffix: 'matcher',
    },
    {
      label: 'Flest vinster',
      playerName: mostWins.displayName,
      value: mostWins.wins,
      valueSuffix: 'segrar',
    },
    {
      label: 'Mest orädd',
      playerName: mostLosses.displayName,
      value: mostLosses.losses,
      valueSuffix: 'förluster',
    },
  ]
}

/**
 * Returns a formatted wins/losses string for display (e.g. "3V 1F").
 */
export function formatStats(wins: number, losses: number): string {
  return `${wins}V ${losses}F`
}
