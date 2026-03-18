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

import { updateUserRole } from './UserService'

beforeEach(() => {
  vi.clearAllMocks()
  mockUpdateDoc.mockResolvedValue(undefined)
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
