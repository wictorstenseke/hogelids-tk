import type { LadderParticipant } from '../services/LadderService'

export type ChallengeReason =
  | 'self'
  | 'lower-ranked'
  | 'too-far'
  | 'paused-opponent'
  | 'paused-self'
  | 'not-found'
  | 'ladder-cannot-challenge-pool'

export interface ChallengeEligibility {
  eligible: boolean
  reason?: ChallengeReason
}

/** Max positions above you that you may challenge (and max gap for rank swap on win). Applies only to ladder-vs-ladder challenges. */
export const MAX_CHALLENGE_DISTANCE = 4

/**
 * Returns whether challengerId can challenge opponentId given current ladder state.
 *
 * Pool members (inPool === true) follow relaxed rules:
 *   - A pool member may challenge anyone who is not paused (other pool member or any ladder player).
 *   - A ladder member may NOT challenge a pool member (only pool members initiate cross-section matches).
 * Ladder-vs-ladder challenges keep the existing rules (must be above and within MAX_CHALLENGE_DISTANCE).
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

  const challengerInPool = challenger.inPool === true
  const opponentInPool = opponent.inPool === true

  if (challengerInPool) {
    return { eligible: true }
  }

  if (opponentInPool) {
    return { eligible: false, reason: 'ladder-cannot-challenge-pool' }
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
 *
 * - Always increments wins/losses for winner/loser.
 * - Pool players (inPool === true) exit the pool on their first match and are placed
 *   into the ranking depending on the case:
 *
 *     A) Ladder vs ladder: positions swap only if winner is below loser and within
 *        MAX_CHALLENGE_DISTANCE.
 *     B) Pool vs ladder, pool wins: pool player takes the ladder opponent's position;
 *        the opponent (and everyone below) shifts down by 1.
 *     C) Pool vs ladder, pool loses: pool player is appended at the bottom of the ladder.
 *     D) Pool vs pool: winner is inserted directly above all participants with 0 wins
 *        (pushing them down by 1); the loser is then placed at the bottom.
 *
 * - Paused participants and pool participants other than winner/loser are not reordered.
 * - Returns a new array; does not mutate input.
 */
export function applyMatchResult(
  participants: LadderParticipant[],
  winnerId: string,
  loserId: string
): LadderParticipant[] {
  const winnerBefore = participants.find((p) => p.uid === winnerId)
  const loserBefore = participants.find((p) => p.uid === loserId)

  const withStats = participants.map((p) => {
    if (p.uid === winnerId) return { ...p, wins: p.wins + 1 }
    if (p.uid === loserId) return { ...p, losses: p.losses + 1 }
    return { ...p }
  })

  if (!winnerBefore || !loserBefore) return withStats

  const winnerInPool = winnerBefore.inPool === true
  const loserInPool = loserBefore.inPool === true

  if (!winnerInPool && !loserInPool) {
    return applyLadderVsLadder(withStats, winnerId, loserId)
  }

  if (winnerInPool && loserInPool) {
    return applyPoolVsPool(withStats, winnerId, loserId)
  }

  if (winnerInPool && !loserInPool) {
    return applyPoolBeatsLadder(withStats, winnerId, loserId)
  }

  // !winnerInPool && loserInPool — pool player loses to ladder player
  return applyLadderBeatsPool(withStats, winnerId, loserId)
}

function applyLadderVsLadder(
  participants: LadderParticipant[],
  winnerId: string,
  loserId: string
): LadderParticipant[] {
  const winner = participants.find((p) => p.uid === winnerId)
  const loser = participants.find((p) => p.uid === loserId)

  if (!winner || !loser) return participants

  const shouldSwap =
    !winner.paused &&
    !loser.paused &&
    winner.position > loser.position &&
    winner.position - loser.position <= MAX_CHALLENGE_DISTANCE

  if (!shouldSwap) return participants

  const winnerPos = winner.position
  const loserPos = loser.position

  return participants.map((p) => {
    if (p.uid === winnerId) return { ...p, position: loserPos }
    if (p.uid === loserId) return { ...p, position: winnerPos }
    return { ...p }
  })
}

/** Pool player wins against a ladder player — take the opponent's spot, push everyone below down. */
function applyPoolBeatsLadder(
  participants: LadderParticipant[],
  winnerId: string,
  loserId: string
): LadderParticipant[] {
  const loser = participants.find((p) => p.uid === loserId)
  if (!loser) return participants
  const targetPos = loser.position

  return participants.map((p) => {
    if (p.uid === winnerId) {
      return { ...p, position: targetPos, inPool: false }
    }
    if (p.paused || p.inPool) return p
    if (p.position >= targetPos) {
      return { ...p, position: p.position + 1 }
    }
    return p
  })
}

/** Pool player loses to a ladder player — pool player joins the ladder at the bottom. */
function applyLadderBeatsPool(
  participants: LadderParticipant[],
  _winnerId: string,
  loserId: string
): LadderParticipant[] {
  const lastPos = activeLadderMaxPosition(participants)
  return participants.map((p) => {
    if (p.uid === loserId) {
      return { ...p, position: lastPos + 1, inPool: false }
    }
    return p
  })
}

/**
 * Pool vs pool — both players exit the pool.
 * Winner is inserted directly above all participants with 0 wins (after the
 * stats update, so a 1-win loser doesn't get sandwiched in incorrectly).
 * Loser is appended at the bottom.
 */
function applyPoolVsPool(
  participants: LadderParticipant[],
  winnerId: string,
  loserId: string
): LadderParticipant[] {
  const lastWinnerPos = lastWinnerPosition(participants, [winnerId, loserId])
  const winnerInsertPos = lastWinnerPos + 1

  // Step 1: place the winner. Push everyone at or below winnerInsertPos down by 1.
  const afterWinner = participants.map((p) => {
    if (p.uid === winnerId) {
      return { ...p, position: winnerInsertPos, inPool: false }
    }
    if (p.uid === loserId) return p // loser placed in step 2
    if (p.paused || p.inPool) return p
    if (p.position >= winnerInsertPos) {
      return { ...p, position: p.position + 1 }
    }
    return p
  })

  // Step 2: place the loser at the bottom of the (now shifted) ladder.
  const lastPos = activeLadderMaxPosition(afterWinner, [loserId])
  return afterWinner.map((p) => {
    if (p.uid === loserId) {
      return { ...p, position: lastPos + 1, inPool: false }
    }
    return p
  })
}

/** Highest active ladder position, ignoring pool/paused. Optional excludeUids ignored entirely. */
function activeLadderMaxPosition(
  participants: LadderParticipant[],
  excludeUids: string[] = []
): number {
  const exclude = new Set(excludeUids)
  let max = 0
  for (const p of participants) {
    if (p.paused || p.inPool) continue
    if (exclude.has(p.uid)) continue
    if (p.position > max) max = p.position
  }
  return max
}

/** Highest position among active ladder players that have at least one win. Pool/paused excluded. */
function lastWinnerPosition(
  participants: LadderParticipant[],
  excludeUids: string[] = []
): number {
  const exclude = new Set(excludeUids)
  let max = 0
  for (const p of participants) {
    if (p.paused || p.inPool) continue
    if (exclude.has(p.uid)) continue
    if (p.wins > 0 && p.position > max) max = p.position
  }
  return max
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
