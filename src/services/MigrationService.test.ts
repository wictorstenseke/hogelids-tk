import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../lib/firebase', () => ({ db: {} }))

const mockCommit = vi.fn()
const mockUpdate = vi.fn()
const mockBatch = { update: mockUpdate, commit: mockCommit }
const mockGetDocs = vi.fn()
const mockWriteBatch = vi.fn(() => mockBatch)
const mockQuery = vi.fn((...args) => args)
const mockCollection = vi.fn((...args) => args)
const mockWhere = vi.fn((...args) => args)
const mockDoc = vi.fn((...args) => args)

vi.mock('firebase/firestore', () => ({
  getDocs: (...args: unknown[]) => mockGetDocs(...args),
  writeBatch: (...args: unknown[]) => mockWriteBatch(...args),
  query: (...args: unknown[]) => mockQuery(...args),
  collection: (...args: unknown[]) => mockCollection(...args),
  where: (...args: unknown[]) => mockWhere(...args),
  doc: (...args: unknown[]) => mockDoc(...args),
}))

import { migrateGuestBookings } from './MigrationService'

function makeSnapshot(docs: { id: string; ref: unknown }[]) {
  return { docs, empty: docs.length === 0 }
}

beforeEach(() => {
  vi.clearAllMocks()
  mockCommit.mockResolvedValue(undefined)
})

describe('migrateGuestBookings', () => {
  it('no matching bookings — commit not called', async () => {
    mockGetDocs.mockResolvedValue(makeSnapshot([]))

    await migrateGuestBookings('uid-123', 'user@example.com')

    expect(mockCommit).not.toHaveBeenCalled()
  })

  it('matching guest bookings — both updated with type member and ownerUid', async () => {
    const ref1 = { id: 'doc1' }
    const ref2 = { id: 'doc2' }
    mockGetDocs.mockResolvedValue(
      makeSnapshot([
        { id: 'doc1', ref: ref1 },
        { id: 'doc2', ref: ref2 },
      ])
    )

    await migrateGuestBookings('uid-abc', 'member@example.com')

    expect(mockUpdate).toHaveBeenCalledTimes(2)
    expect(mockUpdate).toHaveBeenCalledWith(ref1, {
      type: 'member',
      ownerUid: 'uid-abc',
    })
    expect(mockUpdate).toHaveBeenCalledWith(ref2, {
      type: 'member',
      ownerUid: 'uid-abc',
    })
    expect(mockCommit).toHaveBeenCalledTimes(1)
  })

  it('query uses correct where clauses for type and email', async () => {
    mockGetDocs.mockResolvedValue(makeSnapshot([]))

    await migrateGuestBookings('uid-xyz', 'specific@example.com')

    expect(mockWhere).toHaveBeenCalledWith('type', '==', 'guest')
    expect(mockWhere).toHaveBeenCalledWith(
      'ownerEmail',
      '==',
      'specific@example.com'
    )
  })

  it('errors are caught and do not throw', async () => {
    mockGetDocs.mockRejectedValue(new Error('Firestore unavailable'))

    await expect(
      migrateGuestBookings('uid-err', 'err@example.com')
    ).resolves.toBeUndefined()
  })
})
