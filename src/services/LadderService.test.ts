import { Timestamp } from 'firebase/firestore'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const getDocMock = vi.fn()
const addDocMock = vi.fn()

vi.mock('firebase/firestore', async () => {
  const actual =
    await vi.importActual<typeof import('firebase/firestore')>(
      'firebase/firestore'
    )
  return {
    ...actual,
    getDoc: (...args: unknown[]) => getDocMock(...args),
    addDoc: (...args: unknown[]) => addDocMock(...args),
    collection: vi.fn(() => ({})),
    doc: vi.fn(() => ({})),
    Timestamp: actual.Timestamp,
  }
})

vi.mock('../lib/firebase', () => ({ db: {} }))

import { createLadderMatch } from './LadderService'

describe('createLadderMatch', () => {
  beforeEach(() => {
    addDocMock.mockResolvedValue({ id: 'match-1' })
  })
  afterEach(() => {
    vi.clearAllMocks()
  })

  function mockLadderAndSettings(opts: {
    tournamentStartsAt: Timestamp | null
    bookingEnabled: boolean
  }) {
    let call = 0
    getDocMock.mockImplementation(() => {
      call += 1
      // First call → ladder; second → settings.
      if (call === 1) {
        return Promise.resolve({
          exists: () => true,
          data: () => ({ tournamentStartsAt: opts.tournamentStartsAt }),
        })
      }
      return Promise.resolve({
        exists: () => true,
        data: () => ({ bookingEnabled: opts.bookingEnabled }),
      })
    })
  }

  it('writes when tournamentStartsAt is null and booking enabled', async () => {
    mockLadderAndSettings({ tournamentStartsAt: null, bookingEnabled: true })
    await expect(
      createLadderMatch(
        'ladder-1',
        'a',
        'b',
        'A',
        'B',
        'owner',
        'o@x',
        'Owner',
        new Date('2026-07-01T10:00:00'),
        new Date('2026-07-01T11:00:00')
      )
    ).resolves.toBe('match-1')
    expect(addDocMock).toHaveBeenCalledTimes(1)
  })

  it('throws "Challenges are not open yet" when before tournamentStartsAt', async () => {
    const future = Timestamp.fromDate(new Date('2026-12-31T00:00:00'))
    mockLadderAndSettings({ tournamentStartsAt: future, bookingEnabled: true })
    await expect(
      createLadderMatch(
        'ladder-1',
        'a',
        'b',
        'A',
        'B',
        'owner',
        'o@x',
        'Owner',
        new Date('2026-07-01T10:00:00'),
        new Date('2026-07-01T11:00:00')
      )
    ).rejects.toThrow('Challenges are not open yet')
    expect(addDocMock).not.toHaveBeenCalled()
  })

  it('throws when bookingEnabled is false', async () => {
    mockLadderAndSettings({ tournamentStartsAt: null, bookingEnabled: false })
    await expect(
      createLadderMatch(
        'ladder-1',
        'a',
        'b',
        'A',
        'B',
        'owner',
        'o@x',
        'Owner',
        new Date('2026-07-01T10:00:00'),
        new Date('2026-07-01T11:00:00')
      )
    ).rejects.toThrow('Challenges are not open yet')
    expect(addDocMock).not.toHaveBeenCalled()
  })
})
