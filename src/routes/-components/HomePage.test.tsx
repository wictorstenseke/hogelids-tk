import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { HomePage } from './HomePage'

// Mock Firestore so tests don't need a real Firebase connection
vi.mock('../../services/BookingService', () => ({
  BOOKINGS_QUERY_KEY: ['bookings', 'upcoming'],
  getUpcomingBookings: vi.fn(() => new Promise(() => {})), // stays loading
  getEarliestBookingYear: vi.fn(() => new Promise(() => {})), // stays loading
  getBookingsByYear: vi.fn(() => new Promise(() => {})),
}))

vi.mock('../../services/ProfileService', () => ({
  PROFILE_QUERY_KEY: 'profile',
  getProfile: vi.fn(() => new Promise(() => {})),
}))

// Mock Firebase Auth so tests don't need a real Firebase connection
vi.mock('../../lib/useAuth', () => ({
  useAuth: vi.fn(() => ({ user: null, loading: false })),
}))

vi.mock('../../services/AuthService', () => ({
  signOut: vi.fn(),
  resendVerificationEmail: vi.fn(),
}))

vi.mock('./ProfileSection', () => ({
  ProfileSection: () => null,
}))

function renderWithQueryClient(ui: React.ReactElement) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>)
}

describe('HomePage', () => {
  it('renders the club name heading', () => {
    renderWithQueryClient(<HomePage />)
    expect(
      screen.getByRole('heading', { name: /högelids tennisklubb/i })
    ).toBeInTheDocument()
  })

  it('shows a loading indicator while fetching', () => {
    renderWithQueryClient(<HomePage />)
    expect(screen.getByText(/laddar bokningar/i)).toBeInTheDocument()
  })
})
