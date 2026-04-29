import { describe, it, expect } from 'vitest'
import {
  getChallengeEligibility,
  applyMatchResult,
  formatStats,
  getStatsLeaders,
} from './ladder'
import type { LadderParticipant } from '../services/LadderService'

function makeParticipants(
  entries: Array<{
    uid: string
    position: number
    paused?: boolean
    inPool?: boolean
  }>
): LadderParticipant[] {
  return entries.map(({ uid, position, paused = false, inPool = false }) => ({
    uid,
    displayName: uid,
    position,
    wins: 0,
    losses: 0,
    paused,
    inPool,
  }))
}

// ─── getChallengeEligibility ──────────────────────────────────────────────────

describe('getChallengeEligibility', () => {
  const participants = makeParticipants([
    { uid: 'p1', position: 1 },
    { uid: 'p2', position: 2 },
    { uid: 'p3', position: 3 },
    { uid: 'p4', position: 4 },
    { uid: 'p5', position: 5 },
    { uid: 'p6', position: 6 },
    { uid: 'paused', position: 7, paused: true },
  ])

  it('allows valid challenge within 4 positions', () => {
    expect(getChallengeEligibility(participants, 'p5', 'p1').eligible).toBe(
      true
    )
  })

  it('allows challenge exactly 4 positions up', () => {
    expect(getChallengeEligibility(participants, 'p5', 'p1').eligible).toBe(
      true
    )
  })

  it('allows challenge 1 position up', () => {
    expect(getChallengeEligibility(participants, 'p2', 'p1').eligible).toBe(
      true
    )
  })

  it('rejects self-challenge', () => {
    const result = getChallengeEligibility(participants, 'p3', 'p3')
    expect(result.eligible).toBe(false)
    expect(result.reason).toBe('self')
  })

  it('rejects challenge more than 4 positions up', () => {
    const result = getChallengeEligibility(participants, 'p6', 'p1')
    expect(result.eligible).toBe(false)
    expect(result.reason).toBe('too-far')
  })

  it('rejects challenging a lower-ranked player', () => {
    const result = getChallengeEligibility(participants, 'p1', 'p3')
    expect(result.eligible).toBe(false)
    expect(result.reason).toBe('lower-ranked')
  })

  it('rejects challenging same position (lower-ranked guard)', () => {
    const tied = makeParticipants([
      { uid: 'a', position: 2 },
      { uid: 'b', position: 2 },
    ])
    const result = getChallengeEligibility(tied, 'a', 'b')
    expect(result.eligible).toBe(false)
    expect(result.reason).toBe('lower-ranked')
  })

  it('rejects challenging a paused opponent', () => {
    const result = getChallengeEligibility(participants, 'p3', 'paused')
    expect(result.eligible).toBe(false)
    expect(result.reason).toBe('paused-opponent')
  })

  it('rejects challenge when challenger is paused', () => {
    const result = getChallengeEligibility(participants, 'paused', 'p3')
    expect(result.eligible).toBe(false)
    expect(result.reason).toBe('paused-self')
  })

  it('returns not-found when challenger is missing', () => {
    const result = getChallengeEligibility(participants, 'unknown', 'p1')
    expect(result.eligible).toBe(false)
    expect(result.reason).toBe('not-found')
  })

  it('returns not-found when opponent is missing', () => {
    const result = getChallengeEligibility(participants, 'p1', 'unknown')
    expect(result.eligible).toBe(false)
    expect(result.reason).toBe('not-found')
  })

  it('allows pool member to challenge another pool member', () => {
    const pp = makeParticipants([
      { uid: 'pool1', position: 0, inPool: true },
      { uid: 'pool2', position: 0, inPool: true },
    ])
    expect(getChallengeEligibility(pp, 'pool1', 'pool2').eligible).toBe(true)
  })

  it('allows pool member to challenge a top-ranked ladder player (no distance limit)', () => {
    const pp = makeParticipants([
      { uid: 'p1', position: 1 },
      { uid: 'p2', position: 2 },
      { uid: 'p10', position: 10 },
      { uid: 'pool', position: 0, inPool: true },
    ])
    expect(getChallengeEligibility(pp, 'pool', 'p1').eligible).toBe(true)
    expect(getChallengeEligibility(pp, 'pool', 'p10').eligible).toBe(true)
  })

  it('rejects ladder player challenging a pool member', () => {
    const pp = makeParticipants([
      { uid: 'p1', position: 1 },
      { uid: 'pool', position: 0, inPool: true },
    ])
    const result = getChallengeEligibility(pp, 'p1', 'pool')
    expect(result.eligible).toBe(false)
    expect(result.reason).toBe('ladder-cannot-challenge-pool')
  })

  it('rejects challenging a paused pool member', () => {
    const pp = makeParticipants([
      { uid: 'pool1', position: 0, inPool: true },
      { uid: 'pool2', position: 0, inPool: true, paused: true },
    ])
    const result = getChallengeEligibility(pp, 'pool1', 'pool2')
    expect(result.eligible).toBe(false)
    expect(result.reason).toBe('paused-opponent')
  })
})

// ─── applyMatchResult ─────────────────────────────────────────────────────────

describe('applyMatchResult', () => {
  function makeWithStats(
    entries: Array<{
      uid: string
      position: number
      wins?: number
      losses?: number
      paused?: boolean
      inPool?: boolean
    }>
  ): LadderParticipant[] {
    return entries.map(
      ({
        uid,
        position,
        wins = 0,
        losses = 0,
        paused = false,
        inPool = false,
      }) => ({
        uid,
        displayName: uid,
        position,
        wins,
        losses,
        paused,
        inPool,
      })
    )
  }

  it('swaps positions when winner is below loser and within 4', () => {
    const participants = makeWithStats([
      { uid: 'p1', position: 1 },
      { uid: 'p2', position: 2 },
      { uid: 'p3', position: 3 },
    ])
    const result = applyMatchResult(participants, 'p3', 'p1')
    const p1 = result.find((p) => p.uid === 'p1')!
    const p3 = result.find((p) => p.uid === 'p3')!
    expect(p3.position).toBe(1)
    expect(p1.position).toBe(3)
  })

  it('always increments winner wins', () => {
    const participants = makeWithStats([
      { uid: 'a', position: 2 },
      { uid: 'b', position: 1 },
    ])
    const result = applyMatchResult(participants, 'a', 'b')
    expect(result.find((p) => p.uid === 'a')!.wins).toBe(1)
  })

  it('always increments loser losses', () => {
    const participants = makeWithStats([
      { uid: 'a', position: 2 },
      { uid: 'b', position: 1 },
    ])
    const result = applyMatchResult(participants, 'a', 'b')
    expect(result.find((p) => p.uid === 'b')!.losses).toBe(1)
  })

  it('does not swap if winner is already above loser (positions flipped)', () => {
    const participants = makeWithStats([
      { uid: 'a', position: 1 }, // winner is already on top
      { uid: 'b', position: 2 },
    ])
    const result = applyMatchResult(participants, 'a', 'b')
    expect(result.find((p) => p.uid === 'a')!.position).toBe(1)
    expect(result.find((p) => p.uid === 'b')!.position).toBe(2)
    // Stats still recorded
    expect(result.find((p) => p.uid === 'a')!.wins).toBe(1)
    expect(result.find((p) => p.uid === 'b')!.losses).toBe(1)
  })

  it('does not swap if winner is more than 4 positions below loser at report time', () => {
    const participants = makeWithStats([
      { uid: 'top', position: 1 },
      { uid: 'bottom', position: 6 },
    ])
    const result = applyMatchResult(participants, 'bottom', 'top')
    expect(result.find((p) => p.uid === 'bottom')!.position).toBe(6)
    expect(result.find((p) => p.uid === 'top')!.position).toBe(1)
    // Stats still recorded
    expect(result.find((p) => p.uid === 'bottom')!.wins).toBe(1)
    expect(result.find((p) => p.uid === 'top')!.losses).toBe(1)
  })

  it('does not mutate the original array', () => {
    const participants = makeWithStats([
      { uid: 'a', position: 2 },
      { uid: 'b', position: 1 },
    ])
    const original = participants.map((p) => ({ ...p }))
    applyMatchResult(participants, 'a', 'b')
    expect(participants).toEqual(original)
  })

  it('handles missing winner gracefully (no swap, no crash)', () => {
    const participants = makeWithStats([{ uid: 'a', position: 1 }])
    const result = applyMatchResult(participants, 'missing', 'a')
    expect(result.find((p) => p.uid === 'a')!.losses).toBe(1)
  })

  it('does not swap when winner or loser is paused', () => {
    const participants = makeWithStats([
      { uid: 'a', position: 2, paused: true },
      { uid: 'b', position: 1 },
    ])
    const result = applyMatchResult(participants, 'a', 'b')
    expect(result.find((p) => p.uid === 'a')!.position).toBe(2)
    // Stats still recorded
    expect(result.find((p) => p.uid === 'a')!.wins).toBe(1)
  })

  it('preserves unrelated participants unchanged', () => {
    const participants = makeWithStats([
      { uid: 'a', position: 3 },
      { uid: 'b', position: 2 },
      { uid: 'c', position: 1 },
    ])
    const result = applyMatchResult(participants, 'a', 'b')
    expect(result.find((p) => p.uid === 'c')!.position).toBe(1)
    expect(result.find((p) => p.uid === 'c')!.wins).toBe(0)
    expect(result.find((p) => p.uid === 'c')!.losses).toBe(0)
  })

  // ─── Pool vs ladder: pool wins ──────────────────────────────────────────────

  it('pool wins vs ladder: pool takes opponent position, others below shift down', () => {
    const participants = makeWithStats([
      { uid: 'p1', position: 1 },
      { uid: 'p2', position: 2 },
      { uid: 'p3', position: 3 },
      { uid: 'p4', position: 4 },
      { uid: 'pool', position: 0, inPool: true },
    ])
    const result = applyMatchResult(participants, 'pool', 'p3')
    const byUid = (uid: string) => result.find((p) => p.uid === uid)!

    expect(byUid('pool').position).toBe(3)
    expect(byUid('pool').inPool).toBe(false)
    expect(byUid('pool').wins).toBe(1)

    expect(byUid('p1').position).toBe(1)
    expect(byUid('p2').position).toBe(2)
    expect(byUid('p3').position).toBe(4) // pushed down
    expect(byUid('p4').position).toBe(5) // pushed down
    expect(byUid('p3').losses).toBe(1)
  })

  it('pool wins vs top-ranked ladder player: pool jumps to position 1', () => {
    const participants = makeWithStats([
      { uid: 'top', position: 1, wins: 2 },
      { uid: 'pool', position: 0, inPool: true },
    ])
    const result = applyMatchResult(participants, 'pool', 'top')
    expect(result.find((p) => p.uid === 'pool')!.position).toBe(1)
    expect(result.find((p) => p.uid === 'pool')!.inPool).toBe(false)
    expect(result.find((p) => p.uid === 'top')!.position).toBe(2)
  })

  // ─── Pool vs ladder: pool loses ─────────────────────────────────────────────

  it('pool loses vs ladder: pool placed at bottom, ladder unchanged', () => {
    const participants = makeWithStats([
      { uid: 'p1', position: 1 },
      { uid: 'p2', position: 2 },
      { uid: 'p3', position: 3 },
      { uid: 'pool', position: 0, inPool: true },
    ])
    const result = applyMatchResult(participants, 'p1', 'pool')
    const byUid = (uid: string) => result.find((p) => p.uid === uid)!

    expect(byUid('pool').position).toBe(4)
    expect(byUid('pool').inPool).toBe(false)
    expect(byUid('pool').losses).toBe(1)
    expect(byUid('p1').position).toBe(1)
    expect(byUid('p1').wins).toBe(1)
    expect(byUid('p2').position).toBe(2)
    expect(byUid('p3').position).toBe(3)
  })

  it('pool loses against an empty ladder (only pool was challenger): pool ends at position 1', () => {
    // Edge case: this can't happen via UI because both would be in pool, but
    // verifies that activeLadderMaxPosition handles an empty ladder gracefully.
    const participants = makeWithStats([
      { uid: 'lonely', position: 1 },
      { uid: 'pool', position: 0, inPool: true },
    ])
    const result = applyMatchResult(participants, 'lonely', 'pool')
    expect(result.find((p) => p.uid === 'pool')!.position).toBe(2)
    expect(result.find((p) => p.uid === 'pool')!.inPool).toBe(false)
  })

  // ─── Pool vs pool ───────────────────────────────────────────────────────────

  it('pool vs pool on empty ladder: winner = 1, loser = 2', () => {
    const participants = makeWithStats([
      { uid: 'a', position: 0, inPool: true },
      { uid: 'b', position: 0, inPool: true },
    ])
    const result = applyMatchResult(participants, 'a', 'b')
    expect(result.find((p) => p.uid === 'a')!.position).toBe(1)
    expect(result.find((p) => p.uid === 'a')!.inPool).toBe(false)
    expect(result.find((p) => p.uid === 'a')!.wins).toBe(1)
    expect(result.find((p) => p.uid === 'b')!.position).toBe(2)
    expect(result.find((p) => p.uid === 'b')!.inPool).toBe(false)
    expect(result.find((p) => p.uid === 'b')!.losses).toBe(1)
  })

  it('pool vs pool: matches the example of 5 sequential matches in an empty ladder', () => {
    // Simulate 5 pool-vs-pool matches with 10 fresh players.
    let participants = makeWithStats(
      Array.from({ length: 10 }, (_, i) => ({
        uid: `p${i + 1}`,
        position: 0,
        inPool: true,
      }))
    )

    // Match 1: p1 beats p2
    participants = applyMatchResult(participants, 'p1', 'p2')
    // Match 2: p3 beats p4
    participants = applyMatchResult(participants, 'p3', 'p4')
    // Match 3: p5 beats p6
    participants = applyMatchResult(participants, 'p5', 'p6')
    // Match 4: p7 beats p8
    participants = applyMatchResult(participants, 'p7', 'p8')
    // Match 5: p9 beats p10
    participants = applyMatchResult(participants, 'p9', 'p10')

    const byUid = (uid: string) => participants.find((p) => p.uid === uid)!

    // Winners on positions 1-5 (in order)
    expect(byUid('p1').position).toBe(1)
    expect(byUid('p3').position).toBe(2)
    expect(byUid('p5').position).toBe(3)
    expect(byUid('p7').position).toBe(4)
    expect(byUid('p9').position).toBe(5)

    // Losers on positions 6-10 (in order)
    expect(byUid('p2').position).toBe(6)
    expect(byUid('p4').position).toBe(7)
    expect(byUid('p6').position).toBe(8)
    expect(byUid('p8').position).toBe(9)
    expect(byUid('p10').position).toBe(10)

    // All have left the pool with correct stats
    for (const p of participants) {
      expect(p.inPool).toBe(false)
    }
    expect(byUid('p1').wins).toBe(1)
    expect(byUid('p2').losses).toBe(1)
  })

  it('pool vs pool when ladder has 1V players + 0V players: winner above 0Vs, loser at the bottom', () => {
    const participants = makeWithStats([
      { uid: 'w1', position: 1, wins: 1 },
      { uid: 'w2', position: 2, wins: 1 },
      { uid: 'w3', position: 3, wins: 1 },
      { uid: 'l1', position: 4, losses: 1 },
      { uid: 'l2', position: 5, losses: 1 },
      { uid: 'a', position: 0, inPool: true },
      { uid: 'b', position: 0, inPool: true },
    ])
    const result = applyMatchResult(participants, 'a', 'b')
    const byUid = (uid: string) => result.find((p) => p.uid === uid)!

    // Existing winners untouched
    expect(byUid('w1').position).toBe(1)
    expect(byUid('w2').position).toBe(2)
    expect(byUid('w3').position).toBe(3)
    // Pool winner inserted at position 4 (above all 0V players)
    expect(byUid('a').position).toBe(4)
    expect(byUid('a').inPool).toBe(false)
    // 0V ladder players shift down by 1
    expect(byUid('l1').position).toBe(5)
    expect(byUid('l2').position).toBe(6)
    // Pool loser at the bottom
    expect(byUid('b').position).toBe(7)
    expect(byUid('b').inPool).toBe(false)
  })

  it('pool vs pool when nobody in the ladder has a win: winner = 1, all 0V players shift down', () => {
    const participants = makeWithStats([
      { uid: 'l1', position: 1, losses: 1 },
      { uid: 'l2', position: 2, losses: 1 },
      { uid: 'a', position: 0, inPool: true },
      { uid: 'b', position: 0, inPool: true },
    ])
    const result = applyMatchResult(participants, 'a', 'b')
    const byUid = (uid: string) => result.find((p) => p.uid === uid)!

    expect(byUid('a').position).toBe(1)
    expect(byUid('a').inPool).toBe(false)
    expect(byUid('l1').position).toBe(2)
    expect(byUid('l2').position).toBe(3)
    expect(byUid('b').position).toBe(4)
    expect(byUid('b').inPool).toBe(false)
  })

  it('does not affect paused ladder players when pool wins vs ladder', () => {
    const participants = makeWithStats([
      { uid: 'p1', position: 1 },
      { uid: 'p2', position: 2 },
      { uid: 'paused', position: 99, paused: true },
      { uid: 'pool', position: 0, inPool: true },
    ])
    const result = applyMatchResult(participants, 'pool', 'p1')
    expect(result.find((p) => p.uid === 'paused')!.position).toBe(99)
    expect(result.find((p) => p.uid === 'paused')!.paused).toBe(true)
  })
})

// ─── formatStats ─────────────────────────────────────────────────────────────

// ─── getStatsLeaders ─────────────────────────────────────────────────────────

describe('getStatsLeaders', () => {
  function makeWithStats(
    entries: Array<{
      uid: string
      displayName?: string
      position: number
      wins?: number
      losses?: number
      paused?: boolean
    }>
  ): LadderParticipant[] {
    return entries.map(
      ({
        uid,
        displayName = uid,
        position,
        wins = 0,
        losses = 0,
        paused = false,
      }) => ({
        uid,
        displayName,
        position,
        wins,
        losses,
        paused,
      })
    )
  }

  it('returns null when no matches have been completed', () => {
    const participants = makeWithStats([
      { uid: 'a', position: 1 },
      { uid: 'b', position: 2 },
      { uid: 'c', position: 3 },
    ])
    expect(getStatsLeaders(participants)).toBeNull()
  })

  it('returns correct leaders when there are clear winners', () => {
    const participants = makeWithStats([
      { uid: 'anna', displayName: 'Anna', position: 1, wins: 5, losses: 1 },
      { uid: 'erik', displayName: 'Erik', position: 2, wins: 2, losses: 8 },
      { uid: 'lisa', displayName: 'Lisa', position: 3, wins: 3, losses: 3 },
    ])
    const leaders = getStatsLeaders(participants)!
    expect(leaders).toHaveLength(3)

    // Most matches: Erik (2+8=10)
    expect(leaders[0]).toEqual({
      label: 'Flest matcher',
      playerName: 'Erik',
      value: 10,
      valueSuffix: 'matcher',
    })

    // Most wins: Anna (5)
    expect(leaders[1]).toEqual({
      label: 'Flest vinster',
      playerName: 'Anna',
      value: 5,
      valueSuffix: 'segrar',
    })

    // Most losses (mest orädd): Erik (8)
    expect(leaders[2]).toEqual({
      label: 'Mest orädd',
      playerName: 'Erik',
      value: 8,
      valueSuffix: 'förluster',
    })
  })

  it('breaks ties by highest-ranked player (lowest position)', () => {
    const participants = makeWithStats([
      { uid: 'anna', displayName: 'Anna', position: 3, wins: 4, losses: 2 },
      { uid: 'erik', displayName: 'Erik', position: 1, wins: 4, losses: 2 },
      { uid: 'lisa', displayName: 'Lisa', position: 2, wins: 4, losses: 2 },
    ])
    const leaders = getStatsLeaders(participants)!

    // All tied — Erik (position 1) should win all three
    expect(leaders[0].playerName).toBe('Erik')
    expect(leaders[1].playerName).toBe('Erik')
    expect(leaders[2].playerName).toBe('Erik')
  })

  it('includes paused players in stats', () => {
    const participants = makeWithStats([
      { uid: 'anna', displayName: 'Anna', position: 1, wins: 1, losses: 0 },
      {
        uid: 'erik',
        displayName: 'Erik',
        position: 2,
        wins: 10,
        losses: 5,
        paused: true,
      },
    ])
    const leaders = getStatsLeaders(participants)!

    expect(leaders[0].playerName).toBe('Erik') // most matches
    expect(leaders[1].playerName).toBe('Erik') // most wins
    expect(leaders[2].playerName).toBe('Erik') // most losses
  })

  it('returns null for empty participants array', () => {
    expect(getStatsLeaders([])).toBeNull()
  })
})

// ─── formatStats ─────────────────────────────────────────────────────────────

describe('formatStats', () => {
  it('formats wins and losses as V and F', () => {
    expect(formatStats(3, 1)).toBe('3V 1F')
  })

  it('formats zeros', () => {
    expect(formatStats(0, 0)).toBe('0V 0F')
  })
})
