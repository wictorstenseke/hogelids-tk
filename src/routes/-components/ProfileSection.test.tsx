import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { BOOKINGS_QUERY_KEY } from '../../services/BookingService'
import { LADDER_QUERY_KEY } from '../../services/LadderService'
import { PROFILE_QUERY_KEY } from '../../services/ProfileService'
import { ProfileSection } from './ProfileSection'

const { mockGetProfile, mockUpdateProfile } = vi.hoisted(() => ({
  mockGetProfile: vi.fn(),
  mockUpdateProfile: vi.fn(),
}))

vi.mock('../../services/ProfileService', async () => {
  const actual = await vi.importActual<
    typeof import('../../services/ProfileService')
  >('../../services/ProfileService')
  return {
    ...actual,
    getProfile: mockGetProfile,
    updateProfile: mockUpdateProfile,
  }
})

beforeEach(() => {
  vi.clearAllMocks()
  mockGetProfile.mockResolvedValue({
    uid: 'uid-123',
    email: 'member@example.com',
    displayName: 'Member Name',
    phone: '070 - 123 45 67',
    createdAt: {},
    role: 'user',
  })
  mockUpdateProfile.mockResolvedValue(undefined)
})

describe('ProfileSection', () => {
  it('invalidates profile, ladder, and bookings after saving snapshots', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    render(
      <QueryClientProvider client={queryClient}>
        <ProfileSection
          user={{
            uid: 'uid-123',
            email: 'member@example.com',
            displayName: 'Member Name',
          }}
        />
      </QueryClientProvider>
    )

    const phone = await screen.findByLabelText('Telefon')
    const user = userEvent.setup()
    await user.clear(phone)
    await user.type(phone, '666444')
    await user.click(screen.getByRole('button', { name: 'Spara' }))

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: [PROFILE_QUERY_KEY, 'uid-123'],
      })
    })
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: LADDER_QUERY_KEY })
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: BOOKINGS_QUERY_KEY })
  })
})
