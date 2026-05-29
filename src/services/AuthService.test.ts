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

import { signIn } from './AuthService'

beforeEach(() => {
  vi.clearAllMocks()
  mockSignInWithEmailAndPassword.mockResolvedValue({
    user: { uid: 'uid-123' },
  })
})

describe('signIn', () => {
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
})
