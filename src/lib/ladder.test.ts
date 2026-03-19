import { describe, it, expect } from 'vitest'
import {
  getChallengeEligibility,
  applyMatchResult,
  formatStats,
} from './ladder'
import type { LadderParticipant } from '../services/LadderService'

function makeParticipants(
  entries: Array<{ uid: string; position: number; paused?: boolean }>
): LadderParticipant[] {
  return entries.map(({ uid, position, paused = false }) => ({
    uid,
    position,
    wins: 0,
    losses: 0,
    paused,
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
    }>
  ): LadderParticipant[] {
    return entries.map(
      ({ uid, position, wins = 0, losses = 0, paused = false }) => ({
        uid,
        position,
        wins,
        losses,
        paused,
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
})

// ─── formatStats ─────────────────────────────────────────────────────────────

describe('formatStats', () => {
  it('formats wins and losses with en-dash', () => {
    expect(formatStats(3, 1)).toBe('3–1')
  })

  it('formats zeros', () => {
    expect(formatStats(0, 0)).toBe('0–0')
  })
})
