import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { BOOKINGS_QUERY_KEY } from '../../services/BookingService'
import { PROFILE_QUERY_KEY } from '../../services/ProfileService'
import { AuthModal } from './AuthModal'

const { mockSignIn, mockSignUp, mockSendPasswordReset } = vi.hoisted(() => ({
  mockSignIn: vi.fn(),
  mockSignUp: vi.fn(),
  mockSendPasswordReset: vi.fn(),
}))

vi.mock('../../services/AuthService', () => ({
  signIn: mockSignIn,
  signUp: mockSignUp,
  sendPasswordReset: mockSendPasswordReset,
}))

vi.mock('../../lib/firebaseAuthErrors', () => ({
  getErrorCode: vi.fn(() => 'unknown'),
  getFirebaseErrorMessage: vi.fn(() => 'Fel'),
}))

beforeEach(() => {
  vi.clearAllMocks()
})

describe('AuthModal auth cache refresh', () => {
  it('invalidates bookings and profile after sign-up finishes', async () => {
    mockSignUp.mockResolvedValue('uid-new')
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    render(
      <QueryClientProvider client={queryClient}>
        <AuthModal onClose={vi.fn()} initialView="sign-up" />
      </QueryClientProvider>
    )

    const user = userEvent.setup()
    await user.type(screen.getByLabelText('Namn'), 'New Member')
    await user.type(screen.getByLabelText('E-post'), 'new@example.com')
    await user.type(screen.getByLabelText('Telefon'), '0701234567')
    await user.type(screen.getByLabelText('Lösenord'), 'password')
    await user.click(screen.getByRole('button', { name: 'Skapa konto' }))

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: BOOKINGS_QUERY_KEY,
      })
    })
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: [PROFILE_QUERY_KEY, 'uid-new'],
    })
  })

  it('invalidates bookings and profile after sign-in finishes', async () => {
    mockSignIn.mockResolvedValue('uid-existing')
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    render(
      <QueryClientProvider client={queryClient}>
        <AuthModal onClose={vi.fn()} initialView="sign-in" />
      </QueryClientProvider>
    )

    const user = userEvent.setup()
    await user.type(screen.getByLabelText('E-post'), 'member@example.com')
    await user.type(screen.getByLabelText('Lösenord'), 'password')
    await user.click(screen.getByRole('button', { name: 'Logga in' }))

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: BOOKINGS_QUERY_KEY,
      })
    })
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: [PROFILE_QUERY_KEY, 'uid-existing'],
    })
  })
})
