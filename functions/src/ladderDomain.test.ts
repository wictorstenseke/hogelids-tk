import { describe, expect, it } from 'vitest'
import {
  buildLadderMatchDraft,
  joinParticipant,
  pauseParticipant,
  completeLadderMatch,
  type LadderParticipant,
} from './ladderDomain'

const now = Date.parse('2026-06-01T10:00:00+02:00')

function participant(
  uid: string,
  position: number,
  overrides: Partial<LadderParticipant> = {}
): LadderParticipant {
  return {
    uid,
    displayName: uid,
    phone: null,
    position,
    wins: 0,
    losses: 0,
    paused: false,
    ...overrides,
  }
}

describe('joinParticipant', () => {
  it('adds a new authenticated user to the pool using profile snapshot fields', () => {
    const updated = joinParticipant({
      participants: [participant('ranked-1', 1)],
      user: {
        uid: 'new-user',
        email: 'new@example.com',
        displayName: 'Ny spelare',
        phone: '0701234567',
      },
      joinOpensAtMillis: null,
      nowMillis: now,
    })

    expect(updated).toContainEqual({
      uid: 'new-user',
      displayName: 'Ny spelare',
      phone: '0701234567',
      position: 0,
      wins: 0,
      losses: 0,
      paused: false,
      inPool: true,
    })
  })

  it('blocks new joins before join opens but allows a paused participant to rejoin', () => {
    expect(() =>
      joinParticipant({
        participants: [],
        user: {
          uid: 'new-user',
          email: 'new@example.com',
          displayName: 'Ny spelare',
          phone: null,
        },
        joinOpensAtMillis: now + 60_000,
        nowMillis: now,
      })
    ).toThrow('Stegen är inte öppen för anmälan än.')

    const updated = joinParticipant({
      participants: [
        participant('active-1', 1),
        participant('returning', 2, {
          paused: true,
          displayName: 'Gammalt namn',
        }),
      ],
      user: {
        uid: 'returning',
        email: 'returning@example.com',
        displayName: 'Nytt namn',
        phone: '0707654321',
      },
      joinOpensAtMillis: now + 60_000,
      nowMillis: now,
    })

    expect(updated.find((p) => p.uid === 'returning')).toMatchObject({
      displayName: 'Nytt namn',
      phone: '0707654321',
      paused: false,
      position: 2,
    })
  })
})

describe('pauseParticipant', () => {
  it('removes pool members and compacts ranked positions when ranked players pause', () => {
    expect(
      pauseParticipant({
        participants: [
          participant('ranked-1', 1),
          participant('pool-1', 0, { inPool: true }),
        ],
        uid: 'pool-1',
      })
    ).toHaveLength(1)

    const updated = pauseParticipant({
      participants: [
        participant('ranked-1', 1),
        participant('ranked-2', 2),
        participant('ranked-3', 3),
      ],
      uid: 'ranked-2',
    })

    expect(updated).toEqual([
      participant('ranked-1', 1),
      participant('ranked-3', 2),
      participant('ranked-2', 2, { paused: true }),
    ])
  })
})

describe('buildLadderMatchDraft', () => {
  it('uses trusted profile and ladder snapshots, not client supplied names', () => {
    const draft = buildLadderMatchDraft({
      ladderId: 'ladder-1',
      participants: [
        participant('opponent', 1, { displayName: 'Motståndare' }),
        participant('challenger', 2, { displayName: 'Old Challenger' }),
      ],
      challenger: {
        uid: 'challenger',
        email: 'challenger@example.com',
        displayName: 'Trusted Challenger',
        phone: null,
      },
      opponentUid: 'opponent',
      startTime: new Date('2026-06-02T10:00:00+02:00'),
      endTime: new Date('2026-06-02T11:00:00+02:00'),
      bookingEnabled: true,
      tournamentStartsAtMillis: null,
      nowMillis: now,
    })

    expect(draft).toMatchObject({
      type: 'member',
      ownerUid: 'challenger',
      ownerEmail: 'challenger@example.com',
      ownerDisplayName: 'Trusted Challenger',
      ladderId: 'ladder-1',
      playerAId: 'challenger',
      playerBId: 'opponent',
      playerAName: 'Trusted Challenger',
      playerBName: 'Motståndare',
      ladderStatus: 'planned',
      winnerId: null,
      ladderComment: null,
    })
  })

  it('rejects closed or ineligible challenges', () => {
    const base = {
      ladderId: 'ladder-1',
      participants: [participant('top', 1), participant('lower', 2)],
      challenger: {
        uid: 'top',
        email: 'top@example.com',
        displayName: 'Top',
        phone: null,
      },
      opponentUid: 'lower',
      startTime: new Date('2026-06-02T10:00:00+02:00'),
      endTime: new Date('2026-06-02T11:00:00+02:00'),
      tournamentStartsAtMillis: null,
      nowMillis: now,
    }

    expect(() =>
      buildLadderMatchDraft({ ...base, bookingEnabled: false })
    ).toThrow('Utmaningar är inte öppna än.')

    expect(() =>
      buildLadderMatchDraft({ ...base, bookingEnabled: true })
    ).toThrow('Den valda spelaren kan inte utmanas.')
  })
})

describe('completeLadderMatch', () => {
  it('only accepts match participants and applies the result once', () => {
    const participants = [participant('top', 1), participant('lower', 2)]

    expect(() =>
      completeLadderMatch({
        participants,
        match: {
          playerAId: 'lower',
          playerBId: 'top',
          ladderStatus: 'completed',
        },
        winnerId: 'lower',
        loserId: 'top',
        comment: '',
      })
    ).toThrow('Matchen är redan rapporterad.')

    const completed = completeLadderMatch({
      participants,
      match: {
        playerAId: 'lower',
        playerBId: 'top',
        ladderStatus: 'planned',
      },
      winnerId: 'lower',
      loserId: 'top',
      comment: 'Bra match',
    })

    expect(completed.participants).toEqual([
      participant('top', 2, { losses: 1 }),
      participant('lower', 1, { wins: 1 }),
    ])
    expect(completed.matchUpdate).toEqual({
      ladderStatus: 'completed',
      winnerId: 'lower',
      ladderComment: 'Bra match',
    })
  })
})
