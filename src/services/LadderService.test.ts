import { describe, expect, it, vi, beforeEach } from 'vitest'

const {
  mockCallable,
  mockHttpsCallable,
  mockFunctions,
  mockCollection,
  mockDoc,
} = vi.hoisted(() => {
  const mockCallable = vi.fn()
  return {
    mockCallable,
    mockHttpsCallable: vi.fn(() => mockCallable),
    mockFunctions: {},
    mockCollection: vi.fn(() => ({})),
    mockDoc: vi.fn((_db: unknown, ...path: string[]) => ({
      __path: path.join('/'),
    })),
  }
})

vi.mock('../lib/firebase', () => ({ db: {}, functions: mockFunctions }))
vi.mock('firebase/functions', () => ({
  httpsCallable: mockHttpsCallable,
}))
vi.mock('firebase/firestore', async () => {
  const actual =
    await vi.importActual<typeof import('firebase/firestore')>(
      'firebase/firestore'
    )
  return {
    ...actual,
    collection: mockCollection,
    doc: mockDoc,
    getDocs: vi.fn(),
    getDoc: vi.fn(),
    addDoc: vi.fn(),
    updateDoc: vi.fn(),
    writeBatch: vi.fn(),
    query: vi.fn(),
    where: vi.fn(),
    orderBy: vi.fn(),
    limit: vi.fn(),
    deleteField: vi.fn(),
  }
})

import {
  createLadderMatch,
  joinLadder,
  pauseLadder,
  reportLadderResult,
} from './LadderService'

beforeEach(() => {
  vi.clearAllMocks()
  mockCallable.mockResolvedValue({ data: { ok: true, bookingId: 'match-1' } })
})

describe('ladder callable mutations', () => {
  it('joins through the callable function using only the ladder id', async () => {
    await joinLadder('ladder-1', 'uid-1', 'Client Name', '0701234567')

    expect(mockHttpsCallable).toHaveBeenCalledWith(mockFunctions, 'joinLadder')
    expect(mockCallable).toHaveBeenCalledWith({ ladderId: 'ladder-1' })
  })

  it('pauses through the callable function using only the ladder id', async () => {
    await pauseLadder('ladder-1', 'uid-1')

    expect(mockHttpsCallable).toHaveBeenCalledWith(mockFunctions, 'pauseLadder')
    expect(mockCallable).toHaveBeenCalledWith({ ladderId: 'ladder-1' })
  })

  it('creates ladder matches through the callable function without trusting client names', async () => {
    const start = new Date('2026-07-01T10:00:00+02:00')
    const end = new Date('2026-07-01T11:00:00+02:00')

    await expect(
      createLadderMatch(
        'ladder-1',
        'player-a',
        'player-b',
        'Spoofed A',
        'Spoofed B',
        'owner',
        'owner@example.com',
        'Owner',
        start,
        end
      )
    ).resolves.toBe('match-1')

    expect(mockHttpsCallable).toHaveBeenCalledWith(
      mockFunctions,
      'createLadderMatch'
    )
    expect(mockCallable).toHaveBeenCalledWith({
      ladderId: 'ladder-1',
      playerBId: 'player-b',
      startTime: start.toISOString(),
      endTime: end.toISOString(),
    })
  })

  it('reports match results through the callable function', async () => {
    await reportLadderResult(
      'ladder-1',
      'match-1',
      'winner',
      'loser',
      'Bra match'
    )

    expect(mockHttpsCallable).toHaveBeenCalledWith(
      mockFunctions,
      'reportLadderResult'
    )
    expect(mockCallable).toHaveBeenCalledWith({
      ladderId: 'ladder-1',
      matchId: 'match-1',
      winnerId: 'winner',
      loserId: 'loser',
      comment: 'Bra match',
    })
  })
})
