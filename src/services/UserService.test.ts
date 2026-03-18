import { describe, it, expect, vi, beforeEach } from 'vitest'

const {
  mockUpdateDoc,
  mockDoc,
  mockCollection,
  mockGetDocs,
  mockQuery,
  mockOrderBy,
} = vi.hoisted(() => ({
  mockUpdateDoc: vi.fn(),
  mockDoc: vi.fn((...args: unknown[]) => args),
  mockCollection: vi.fn((...args: unknown[]) => args),
  mockGetDocs: vi.fn(),
  mockQuery: vi.fn((...args: unknown[]) => args),
  mockOrderBy: vi.fn((...args: unknown[]) => args),
}))

vi.mock('../lib/firebase', () => ({ db: {} }))
vi.mock('firebase/firestore', () => ({
  updateDoc: mockUpdateDoc,
  doc: mockDoc,
  collection: mockCollection,
  getDocs: mockGetDocs,
  query: mockQuery,
  orderBy: mockOrderBy,
}))

import { updateUserRole, listAllUsers } from './UserService'

beforeEach(() => {
  vi.clearAllMocks()
  mockUpdateDoc.mockResolvedValue(undefined)
})

describe('listAllUsers', () => {
  function makeDoc(id: string, data: Record<string, unknown>) {
    return { id, data: () => data }
  }

  it('maps a document with all fields to a correct UserProfile', async () => {
    const fakeTimestamp = { seconds: 1700000000, nanoseconds: 0 }
    mockGetDocs.mockResolvedValue({
      docs: [
        makeDoc('uid-1', {
          email: 'alice@example.com',
          displayName: 'Alice',
          phone: '+46701234567',
          createdAt: fakeTimestamp,
          role: 'admin',
        }),
      ],
    })

    const result = await listAllUsers()

    expect(result).toHaveLength(1)
    expect(result[0]).toEqual({
      uid: 'uid-1',
      email: 'alice@example.com',
      displayName: 'Alice',
      phone: '+46701234567',
      createdAt: fakeTimestamp,
      role: 'admin',
    })
  })

  it('defaults role to "user" when the role field is absent', async () => {
    mockGetDocs.mockResolvedValue({
      docs: [
        makeDoc('uid-2', {
          email: 'bob@example.com',
          displayName: 'Bob',
          phone: null,
          createdAt: null,
        }),
      ],
    })

    const result = await listAllUsers()

    expect(result).toHaveLength(1)
    expect(result[0].role).toBe('user')
  })

  it('returns an array of UserProfile objects', async () => {
    mockGetDocs.mockResolvedValue({
      docs: [
        makeDoc('uid-3', {
          email: 'carol@example.com',
          displayName: 'Carol',
          phone: null,
          createdAt: null,
          role: 'superuser',
        }),
        makeDoc('uid-4', {
          email: 'dave@example.com',
          displayName: 'Dave',
          phone: null,
          createdAt: null,
          role: 'user',
        }),
      ],
    })

    const result = await listAllUsers()

    expect(Array.isArray(result)).toBe(true)
    expect(result).toHaveLength(2)
    expect(result[0].uid).toBe('uid-3')
    expect(result[1].uid).toBe('uid-4')
  })
})

describe('updateUserRole', () => {
  it('calls updateDoc with the correct ref and role for a valid cross-user update', async () => {
    await updateUserRole('caller-uid', 'target-uid', 'admin')

    expect(mockDoc).toHaveBeenCalledWith({}, 'users', 'target-uid')
    expect(mockUpdateDoc).toHaveBeenCalledWith(expect.anything(), {
      role: 'admin',
    })
  })

  it('throws when callerUid === targetUid (self-update blocked)', async () => {
    await expect(
      updateUserRole('same-uid', 'same-uid', 'admin')
    ).rejects.toThrow()
    expect(mockUpdateDoc).not.toHaveBeenCalled()
  })
})
