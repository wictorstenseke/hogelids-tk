import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { GuestSignupNudge } from './GuestSignupNudge'
import { AuthModalProvider } from '../../lib/AuthModalContext'

const { mockGetEmail, mockGetBookingCount } = vi.hoisted(() => ({
  mockGetEmail: vi.fn(() => 'guest@example.com'),
  mockGetBookingCount: vi.fn(() => 1),
}))

vi.mock('../../lib/GuestSession', () => ({
  getEmail: mockGetEmail,
  getBookingCount: mockGetBookingCount,
}))

function renderNudge(onDismiss = vi.fn()) {
  render(
    <AuthModalProvider>
      <GuestSignupNudge onDismiss={onDismiss} />
    </AuthModalProvider>
  )
  return { onDismiss }
}

describe('GuestSignupNudge — full variant (1st booking)', () => {
  it('shows advantages list and all CTAs', () => {
    mockGetBookingCount.mockReturnValue(1)
    renderNudge()

    expect(screen.getByText(/bara ett steg/i)).toBeInTheDocument()
    expect(screen.getByText(/Se vem som har bokat/i)).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /skapa konto/i })
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /logga in/i })
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /nej tack/i })
    ).toBeInTheDocument()
  })

  it('"Skapa konto" calls onDismiss', async () => {
    mockGetBookingCount.mockReturnValue(1)
    const user = userEvent.setup()
    const { onDismiss } = renderNudge()

    await user.click(screen.getByRole('button', { name: /skapa konto/i }))

    expect(onDismiss).toHaveBeenCalled()
  })

  it('"Logga in" calls onDismiss', async () => {
    mockGetBookingCount.mockReturnValue(1)
    const user = userEvent.setup()
    const { onDismiss } = renderNudge()

    await user.click(screen.getByRole('button', { name: /logga in/i }))

    expect(onDismiss).toHaveBeenCalled()
  })

  it('"Nej tack" calls onDismiss', async () => {
    mockGetBookingCount.mockReturnValue(1)
    const user = userEvent.setup()
    const { onDismiss } = renderNudge()

    await user.click(screen.getByRole('button', { name: /nej tack/i }))

    expect(onDismiss).toHaveBeenCalled()
  })
})

describe('GuestSignupNudge — compact variant (2nd+ booking)', () => {
  it('shows only Skapa konto and Nej tack — no advantages list', () => {
    mockGetBookingCount.mockReturnValue(2)
    renderNudge()

    expect(screen.queryByText(/bara ett steg/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/Se vem som har bokat/i)).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: /logga in/i })
    ).not.toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /skapa konto/i })
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /nej tack/i })
    ).toBeInTheDocument()
  })

  it('"Skapa konto" calls onDismiss', async () => {
    mockGetBookingCount.mockReturnValue(3)
    const user = userEvent.setup()
    const { onDismiss } = renderNudge()

    await user.click(screen.getByRole('button', { name: /skapa konto/i }))

    expect(onDismiss).toHaveBeenCalled()
  })
})
