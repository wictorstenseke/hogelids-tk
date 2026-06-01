import { describe, it, expect, vi, beforeEach } from 'vitest'

const {
  mockGetDoc,
  mockUpdateDoc,
  mockDoc,
  mockUpdateAuthProfile,
  mockReload,
  mockHttpsCallable,
  mockCallable,
  mockFunctions,
  authMock,
} = vi.hoisted(() => {
  const mockCallable = vi.fn()
  return {
    mockGetDoc: vi.fn(),
    mockUpdateDoc: vi.fn(),
    mockDoc: vi.fn((...args: unknown[]) => args),
    mockUpdateAuthProfile: vi.fn(),
    mockReload: vi.fn(),
    mockHttpsCallable: vi.fn(() => mockCallable),
    mockCallable,
    mockFunctions: {},
    authMock: { currentUser: null as unknown },
  }
})

vi.mock('../lib/firebase', () => ({
  db: {},
  auth: authMock,
  functions: mockFunctions,
}))
vi.mock('firebase/functions', () => ({
  httpsCallable: mockHttpsCallable,
}))
vi.mock('firebase/firestore', async () => {
  const actual =
    await vi.importActual<typeof import('firebase/firestore')>(
      'firebase/firestore'
    )
  return {
    getDoc: mockGetDoc,
    updateDoc: mockUpdateDoc,
    doc: mockDoc,
    Timestamp: actual.Timestamp,
  }
})
vi.mock('firebase/auth', () => ({
  updateProfile: mockUpdateAuthProfile,
  reload: mockReload,
}))

import { updateProfile, getProfile } from './ProfileService'
import type { UserProfile } from './AuthService'
import type { Timestamp } from 'firebase/firestore'

// Cast to Timestamp — we only need toDate() at runtime, full interface not required in tests
const fakeTimestamp = {
  toDate: () => new Date('2024-01-01'),
  seconds: 1704067200,
  nanoseconds: 0,
} as unknown as Timestamp

beforeEach(() => {
  vi.clearAllMocks()
  mockUpdateDoc.mockResolvedValue(undefined)
  mockUpdateAuthProfile.mockResolvedValue(undefined)
  mockReload.mockResolvedValue(undefined)
  mockCallable.mockResolvedValue({ data: { ok: true } })
  authMock.currentUser = null
})

describe('updateProfile', () => {
  it('calls updateDoc with the correct ref and fields (displayName + phone)', async () => {
    await updateProfile('uid-123', { displayName: 'Anna', phone: '0701234567' })

    expect(mockDoc).toHaveBeenCalledWith({}, 'users', 'uid-123')
    expect(mockUpdateDoc).toHaveBeenCalledWith(expect.anything(), {
      displayName: 'Anna',
      phone: '0701234567',
    })
  })

  it('calls updateDoc with only displayName when phone is not provided', async () => {
    await updateProfile('uid-456', { displayName: 'Björn' })

    expect(mockUpdateDoc).toHaveBeenCalledWith(expect.anything(), {
      displayName: 'Björn',
    })
  })

  it('calls updateDoc with only phone when displayName is not provided', async () => {
    await updateProfile('uid-789', { phone: '0709876543' })

    expect(mockUpdateDoc).toHaveBeenCalledWith(expect.anything(), {
      phone: '0709876543',
    })
  })

  it('calls updateDoc with phone: null to clear the phone', async () => {
    await updateProfile('uid-000', { phone: null })

    expect(mockUpdateDoc).toHaveBeenCalledWith(expect.anything(), {
      phone: null,
    })
  })

  it("syncs Firebase Auth displayName when updating the current user's name", async () => {
    authMock.currentUser = { uid: 'uid-123', displayName: 'Old Name' }

    await updateProfile('uid-123', { displayName: 'New Name' })

    expect(mockUpdateAuthProfile).toHaveBeenCalledWith(authMock.currentUser, {
      displayName: 'New Name',
    })
    expect(mockReload).toHaveBeenCalledWith(authMock.currentUser)
  })

  it("does not touch Firebase Auth when updating a different user's profile", async () => {
    authMock.currentUser = { uid: 'uid-admin', displayName: 'Admin' }

    await updateProfile('uid-other', { displayName: 'New Name' })

    expect(mockUpdateAuthProfile).not.toHaveBeenCalled()
    expect(mockReload).not.toHaveBeenCalled()
  })

  it('does not touch Firebase Auth when displayName is unchanged', async () => {
    authMock.currentUser = { uid: 'uid-123', displayName: 'Same Name' }

    await updateProfile('uid-123', { displayName: 'Same Name' })

    expect(mockUpdateAuthProfile).not.toHaveBeenCalled()
    expect(mockReload).not.toHaveBeenCalled()
  })

  it('does not touch Firebase Auth when only updating phone', async () => {
    authMock.currentUser = { uid: 'uid-123', displayName: 'Anna' }

    await updateProfile('uid-123', { phone: '0701234567' })

    expect(mockUpdateAuthProfile).not.toHaveBeenCalled()
    expect(mockReload).not.toHaveBeenCalled()
  })

  it('asks the callable function to sync profile snapshots for the current user', async () => {
    authMock.currentUser = { uid: 'uid-123', displayName: 'Old Name' }

    await updateProfile('uid-123', {
      displayName: 'New Name',
      phone: '0701234567',
    })

    expect(mockHttpsCallable).toHaveBeenCalledWith(
      mockFunctions,
      'syncProfileSnapshots'
    )
    expect(mockCallable).toHaveBeenCalledWith({})
  })

  it('does not ask for snapshot sync when updating another profile', async () => {
    authMock.currentUser = { uid: 'uid-admin', displayName: 'Admin' }

    await updateProfile('uid-other', { displayName: 'New Name' })

    expect(mockHttpsCallable).not.toHaveBeenCalled()
    expect(mockCallable).not.toHaveBeenCalled()
  })
})

describe('getProfile', () => {
  it('returns UserProfile when doc exists', async () => {
    mockGetDoc.mockResolvedValue({
      exists: () => true,
      id: 'uid-abc',
      data: () => ({
        email: 'test@example.com',
        displayName: 'Test User',
        phone: '070123',
        createdAt: fakeTimestamp,
      }),
    })

    const result = await getProfile('uid-abc')

    expect(result).toEqual<UserProfile>({
      uid: 'uid-abc',
      email: 'test@example.com',
      displayName: 'Test User',
      phone: '070123',
      createdAt: fakeTimestamp,
      role: 'user',
    })
  })

  it('returns null when doc does not exist', async () => {
    mockGetDoc.mockResolvedValue({ exists: () => false })

    const result = await getProfile('uid-nonexistent')

    expect(result).toBeNull()
  })

  it('returns phone: null when phone field is absent in the doc', async () => {
    mockGetDoc.mockResolvedValue({
      exists: () => true,
      id: 'uid-nophone',
      data: () => ({
        email: 'nophone@example.com',
        displayName: 'No Phone User',
        createdAt: fakeTimestamp,
        // phone field intentionally omitted
      }),
    })

    const result = await getProfile('uid-nophone')

    expect(result).not.toBeNull()
    expect(result!.phone).toBeNull()
  })
})
