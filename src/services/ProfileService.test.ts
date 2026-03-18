import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockGetDoc, mockUpdateDoc, mockDoc, mockCollection } = vi.hoisted(
  () => ({
    mockGetDoc: vi.fn(),
    mockUpdateDoc: vi.fn(),
    mockDoc: vi.fn((...args: unknown[]) => args),
    mockCollection: vi.fn((...args: unknown[]) => args),
  })
)

vi.mock('../lib/firebase', () => ({ db: {} }))
vi.mock('firebase/firestore', () => ({
  getDoc: mockGetDoc,
  updateDoc: mockUpdateDoc,
  doc: mockDoc,
  collection: mockCollection,
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
