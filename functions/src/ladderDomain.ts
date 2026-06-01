export interface LadderParticipant {
  uid: string
  displayName: string
  phone?: string | null
  position: number
  wins: number
  losses: number
  paused: boolean
  inPool?: boolean
}

export interface UserSnapshot {
  uid: string
  email: string
  displayName: string
  phone: string | null
}

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

export interface LadderMatchDraft {
  type: 'member'
  ownerUid: string
  ownerEmail: string
  ownerDisplayName: string
  startTime: Date
  endTime: Date
  ladderId: string
  playerAId: string
  playerBId: string
  playerAName: string
  playerBName: string
  ladderStatus: 'planned'
  winnerId: null
  ladderComment: null
}

export interface LadderMatchState {
  playerAId: string
  playerBId: string
  ladderStatus: 'planned' | 'completed'
}

export interface LadderMatchUpdate {
  ladderStatus: 'completed'
  winnerId: string
  ladderComment: string | null
}

export const MAX_CHALLENGE_DISTANCE = 4

export function joinParticipant(input: {
  participants: LadderParticipant[]
  user: UserSnapshot
  joinOpensAtMillis: number | null
  nowMillis: number
}): LadderParticipant[] {
  const { participants, user, joinOpensAtMillis, nowMillis } = input

  if (participants.some((p) => p.uid === user.uid && !p.paused)) {
    return participants
  }

  const existing = participants.find((p) => p.uid === user.uid)
  const activeLadderCount = participants.filter(
    (p) => !p.paused && !p.inPool
  ).length

  if (
    !existing &&
    joinOpensAtMillis !== null &&
    nowMillis < joinOpensAtMillis
  ) {
    throw new Error('Stegen är inte öppen för anmälan än.')
  }

  if (existing) {
    const wasInPool = existing.inPool === true
    return participants.map((participant) =>
      participant.uid === user.uid
        ? {
            ...participant,
            displayName: user.displayName,
            phone: user.phone ?? participant.phone ?? null,
            paused: false,
            position: wasInPool ? 0 : activeLadderCount + 1,
            inPool: wasInPool,
          }
        : participant
    )
  }

  return [
    ...participants,
    {
      uid: user.uid,
      displayName: user.displayName,
      phone: user.phone,
      position: 0,
      wins: 0,
      losses: 0,
      paused: false,
      inPool: true,
    },
  ]
}

export function pauseParticipant(input: {
  participants: LadderParticipant[]
  uid: string
}): LadderParticipant[] {
  const { participants, uid } = input
  const target = participants.find((participant) => participant.uid === uid)

  if (target?.inPool === true) {
    return participants.filter((participant) => participant.uid !== uid)
  }

  const pausedParticipants = participants.map((participant) =>
    participant.uid === uid ? { ...participant, paused: true } : participant
  )

  const activeLadder = pausedParticipants
    .filter((participant) => !participant.paused && !participant.inPool)
    .sort((a, b) => a.position - b.position)
    .map((participant, index) => ({ ...participant, position: index + 1 }))

  const pool = pausedParticipants.filter(
    (participant) => !participant.paused && participant.inPool
  )
  const paused = pausedParticipants.filter((participant) => participant.paused)

  return [...activeLadder, ...pool, ...paused]
}

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

export function buildLadderMatchDraft(input: {
  ladderId: string
  participants: LadderParticipant[]
  challenger: UserSnapshot
  opponentUid: string
  startTime: Date
  endTime: Date
  bookingEnabled: boolean
  tournamentStartsAtMillis: number | null
  nowMillis: number
}): LadderMatchDraft {
  const {
    ladderId,
    participants,
    challenger,
    opponentUid,
    startTime,
    endTime,
    bookingEnabled,
    tournamentStartsAtMillis,
    nowMillis,
  } = input

  if (
    !bookingEnabled ||
    (tournamentStartsAtMillis !== null && nowMillis < tournamentStartsAtMillis)
  ) {
    throw new Error('Utmaningar är inte öppna än.')
  }

  if (endTime <= startTime) {
    throw new Error('Sluttiden måste vara efter starttiden.')
  }

  const eligibility = getChallengeEligibility(
    participants,
    challenger.uid,
    opponentUid
  )
  if (!eligibility.eligible) {
    throw new Error('Den valda spelaren kan inte utmanas.')
  }

  const opponent = participants.find(
    (participant) => participant.uid === opponentUid
  )
  if (!opponent) {
    throw new Error('Den valda spelaren kan inte utmanas.')
  }

  return {
    type: 'member',
    ownerUid: challenger.uid,
    ownerEmail: challenger.email,
    ownerDisplayName: challenger.displayName,
    startTime,
    endTime,
    ladderId,
    playerAId: challenger.uid,
    playerBId: opponent.uid,
    playerAName: challenger.displayName,
    playerBName: opponent.displayName,
    ladderStatus: 'planned',
    winnerId: null,
    ladderComment: null,
  }
}

export function completeLadderMatch(input: {
  participants: LadderParticipant[]
  match: LadderMatchState
  winnerId: string
  loserId: string
  comment: string
}): { participants: LadderParticipant[]; matchUpdate: LadderMatchUpdate } {
  const { participants, match, winnerId, loserId, comment } = input

  if (match.ladderStatus === 'completed') {
    throw new Error('Matchen är redan rapporterad.')
  }

  const matchPlayers = new Set([match.playerAId, match.playerBId])
  if (
    winnerId === loserId ||
    !matchPlayers.has(winnerId) ||
    !matchPlayers.has(loserId)
  ) {
    throw new Error('Resultatet måste gälla matchens två spelare.')
  }

  return {
    participants: applyMatchResult(participants, winnerId, loserId),
    matchUpdate: {
      ladderStatus: 'completed',
      winnerId,
      ladderComment: comment.trim() || null,
    },
  }
}

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

  return applyLadderBeatsPool(withStats, loserId)
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

function applyLadderBeatsPool(
  participants: LadderParticipant[],
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

function applyPoolVsPool(
  participants: LadderParticipant[],
  winnerId: string,
  loserId: string
): LadderParticipant[] {
  const lastWinnerPos = lastWinnerPosition(participants, [winnerId, loserId])
  const winnerInsertPos = lastWinnerPos + 1

  const afterWinner = participants.map((p) => {
    if (p.uid === winnerId) {
      return { ...p, position: winnerInsertPos, inPool: false }
    }
    if (p.uid === loserId) return p
    if (p.paused || p.inPool) return p
    if (p.position >= winnerInsertPos) {
      return { ...p, position: p.position + 1 }
    }
    return p
  })

  const lastPos = activeLadderMaxPosition(afterWinner, [loserId])
  return afterWinner.map((p) => {
    if (p.uid === loserId) {
      return { ...p, position: lastPos + 1, inPool: false }
    }
    return p
  })
}

function activeLadderMaxPosition(
  participants: LadderParticipant[],
  excludeUids: string[] = []
): number {
  const exclude = new Set(excludeUids)
  let max = 0
  for (const participant of participants) {
    if (participant.paused || participant.inPool) continue
    if (exclude.has(participant.uid)) continue
    if (participant.position > max) max = participant.position
  }
  return max
}

function lastWinnerPosition(
  participants: LadderParticipant[],
  excludeUids: string[] = []
): number {
  const exclude = new Set(excludeUids)
  let max = 0
  for (const participant of participants) {
    if (participant.paused || participant.inPool) continue
    if (exclude.has(participant.uid)) continue
    if (participant.wins > 0 && participant.position > max) {
      max = participant.position
    }
  }
  return max
}
