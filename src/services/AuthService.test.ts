import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  mockCreateUserWithEmailAndPassword,
  mockSignInWithEmailAndPassword,
  mockSignOut,
  mockSendPasswordResetEmail,
  mockUpdateAuthProfile,
  mockReload,
  mockSetDoc,
  mockDoc,
  mockTimestampNow,
  mockMigrateGuestBookings,
  mockGetGuestEmail,
} = vi.hoisted(() => ({
  mockCreateUserWithEmailAndPassword: vi.fn(),
  mockSignInWithEmailAndPassword: vi.fn(),
  mockSignOut: vi.fn(),
  mockSendPasswordResetEmail: vi.fn(),
  mockUpdateAuthProfile: vi.fn(),
  mockReload: vi.fn(),
  mockSetDoc: vi.fn(),
  mockDoc: vi.fn((...args: unknown[]) => args),
  mockTimestampNow: vi.fn(() => 'now'),
  mockMigrateGuestBookings: vi.fn(),
  mockGetGuestEmail: vi.fn(),
}))

vi.mock('../lib/firebase', () => ({ auth: {}, db: {} }))
vi.mock('../lib/GuestSession', () => ({ getEmail: mockGetGuestEmail }))
vi.mock('./MigrationService', () => ({
  migrateGuestBookings: mockMigrateGuestBookings,
}))
vi.mock('firebase/auth', () => ({
  createUserWithEmailAndPassword: mockCreateUserWithEmailAndPassword,
  signInWithEmailAndPassword: mockSignInWithEmailAndPassword,
  signOut: mockSignOut,
  sendPasswordResetEmail: mockSendPasswordResetEmail,
  updateProfile: mockUpdateAuthProfile,
  reload: mockReload,
}))
vi.mock('firebase/firestore', () => ({
  setDoc: mockSetDoc,
  doc: mockDoc,
  Timestamp: { now: mockTimestampNow },
}))

import { signIn, signUp } from './AuthService'

beforeEach(() => {
  vi.clearAllMocks()
  mockSignInWithEmailAndPassword.mockResolvedValue({
    user: { uid: 'uid-123' },
  })
  mockCreateUserWithEmailAndPassword.mockResolvedValue({
    user: { uid: 'uid-new' },
  })
  mockUpdateAuthProfile.mockResolvedValue(undefined)
  mockReload.mockResolvedValue(undefined)
  mockSetDoc.mockResolvedValue(undefined)
  mockMigrateGuestBookings.mockResolvedValue(undefined)
})

describe('signUp', () => {
  it('returns the new uid after profile creation and guest-booking migration', async () => {
    await expect(
      signUp('new@example.com', 'password', 'New Member', '0701234567')
    ).resolves.toBe('uid-new')

    expect(mockSetDoc).toHaveBeenCalled()
    expect(mockMigrateGuestBookings).toHaveBeenCalledWith(
      'uid-new',
      'new@example.com'
    )
  })
})

describe('signIn', () => {
  it('returns the signed-in uid', async () => {
    mockGetGuestEmail.mockReturnValue(null)

    await expect(signIn('member@example.com', 'password')).resolves.toBe(
      'uid-123'
    )
  })

  it('does not query guest-booking migration when no guest session email exists', async () => {
    mockGetGuestEmail.mockReturnValue(null)

    await signIn('member@example.com', 'password')

    expect(mockMigrateGuestBookings).not.toHaveBeenCalled()
  })

  it('migrates guest bookings only when guest session email matches signed-in email', async () => {
    mockGetGuestEmail.mockReturnValue('member@example.com')

    await signIn('member@example.com', 'password')

    expect(mockMigrateGuestBookings).toHaveBeenCalledWith(
      'uid-123',
      'member@example.com'
    )
  })

  it('waits for matching guest-booking migration before resolving', async () => {
    mockGetGuestEmail.mockReturnValue('member@example.com')
    const migration: { resolve: (() => void) | null } = { resolve: null }
    mockMigrateGuestBookings.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          migration.resolve = resolve
        })
    )

    let resolved = false
    const promise = signIn('member@example.com', 'password').then((uid) => {
      resolved = true
      return uid
    })

    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(resolved).toBe(false)

    expect(migration.resolve).toBeTypeOf('function')
    migration.resolve?.()
    await expect(promise).resolves.toBe('uid-123')
  })
})
