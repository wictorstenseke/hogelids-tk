import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { GuestSignupNudge } from './GuestSignupNudge'

const { mockSignUp } = vi.hoisted(() => ({
  mockSignUp: vi.fn(() => Promise.resolve()),
}))

vi.mock('../../services/AuthService', () => ({
  signUp: mockSignUp,
}))

vi.mock('../../lib/GuestSession', () => ({
  getEmail: vi.fn(() => 'guest@example.com'),
  getName: vi.fn(() => null),
  setName: vi.fn(),
}))

function renderNudge() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  const onDismiss = vi.fn()
  const onAccountCreated = vi.fn()
  render(
    <QueryClientProvider client={client}>
      <GuestSignupNudge
        onDismiss={onDismiss}
        onAccountCreated={onAccountCreated}
      />
    </QueryClientProvider>
  )
  return { onDismiss, onAccountCreated }
}

beforeEach(() => {
  mockSignUp.mockClear()
})

describe('GuestSignupNudge', () => {
  it('calls signUp with email from session and closes on success', async () => {
    const user = userEvent.setup()
    const { onAccountCreated } = renderNudge()

    await user.type(screen.getByLabelText(/namn/i), 'Test User')
    await user.type(
      screen.getByLabelText('Lösenord', { exact: true }),
      'secret12'
    )
    await user.type(
      screen.getByLabelText('Bekräfta lösenord', { exact: true }),
      'secret12'
    )
    await user.click(screen.getByRole('button', { name: /skapa konto/i }))

    expect(mockSignUp).toHaveBeenCalledWith(
      'guest@example.com',
      'secret12',
      'Test User'
    )
    expect(onAccountCreated).toHaveBeenCalled()
  })

  it('shows error when passwords do not match', async () => {
    const user = userEvent.setup()
    renderNudge()

    await user.type(screen.getByLabelText(/namn/i), 'Test User')
    await user.type(
      screen.getByLabelText('Lösenord', { exact: true }),
      'secret12'
    )
    await user.type(
      screen.getByLabelText('Bekräfta lösenord', { exact: true }),
      'other'
    )
    await user.click(screen.getByRole('button', { name: /skapa konto/i }))

    expect(mockSignUp).not.toHaveBeenCalled()
    expect(screen.getByRole('alert')).toHaveTextContent(/matchar inte/i)
  })
})
