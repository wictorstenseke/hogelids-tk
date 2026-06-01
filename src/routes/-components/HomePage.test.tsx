import { beforeEach, describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { HomePage } from './HomePage'
import { useAuth, type AuthUser } from '../../lib/useAuth'

vi.mock('../../lib/ToastContext', () => ({
  useToast: vi.fn(() => ({ showToast: vi.fn() })),
  ToastProvider: ({ children }: { children: React.ReactNode }) => children,
}))

vi.mock('@tanstack/react-router', () => ({
  Link: ({
    children,
    ...props
  }: React.HTMLAttributes<HTMLAnchorElement> & { to?: string }) => (
    <a {...props}>{children}</a>
  ),
}))

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

vi.mock('../../services/HistoryArchiveService', () => ({
  HISTORY_ARCHIVE_QUERY_KEY: ['history-archive'],
  loadHistoryArchive: vi.fn(() =>
    Promise.resolve({
      version: 1,
      generatedAt: 0,
      earliestYear: 2025,
      lastArchivedYear: 2025,
      bookings: [],
      completedLadders: [],
    })
  ),
}))

// Mock Firebase Auth so tests don't need a real Firebase connection
vi.mock('../../lib/useAuth', () => ({
  useAuth: vi.fn(() => ({ user: null, loading: false })),
}))

vi.mock('../../services/AuthService', () => ({
  signOut: vi.fn(),
  isAdminRole: vi.fn(() => false),
}))

vi.mock('./ProfileSection', () => ({
  ProfileSection: () => null,
}))

vi.mock('../../lib/useIsDesktop', () => ({
  useIsDesktop: vi.fn(() => true),
}))

vi.mock('../../services/LadderService', () => ({
  LADDER_QUERY_KEY: ['ladder', 'active'],
  getActiveLadder: vi.fn(() => new Promise(() => {})),
  createLadderMatch: vi.fn(() => Promise.resolve('mock-id')),
}))

vi.mock('../../services/UserService', () => ({
  USERS_QUERY_KEY: ['users'],
  listAllUsers: vi.fn(() => new Promise(() => {})),
}))

vi.mock('../../lib/useRole', () => ({
  useRole: vi.fn(() => null),
}))

vi.mock('../../lib/useAppSettings', () => ({
  useAppSettings: vi.fn(() => ({ settings: null, isLoading: true })),
}))

vi.mock('./HistorySection', () => ({
  HistorySection: () => <div>Historik direktinnehåll</div>,
}))

const signedInUser: AuthUser = {
  uid: 'user-1',
  email: 'user@example.com',
  displayName: 'Test User',
}

function renderWithQueryClient(ui: React.ReactElement) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>)
}

describe('HomePage', () => {
  beforeEach(() => {
    vi.mocked(useAuth).mockReturnValue({ user: null, loading: false })
  })

  it('shows a loading indicator while fetching', () => {
    renderWithQueryClient(<HomePage />)
    expect(screen.getByText(/laddar bokningar/i)).toBeInTheDocument()
  })

  it('does not show history or statistics to guests', () => {
    renderWithQueryClient(<HomePage />)
    expect(
      screen.queryByText('Historik direktinnehåll')
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: /historik/i })
    ).not.toBeInTheDocument()
  })

  it('shows history and statistics immediately after sign-in', async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: signedInUser,
      loading: false,
    })

    renderWithQueryClient(<HomePage />)

    expect(
      await screen.findByText('Historik direktinnehåll')
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: /historik/i })
    ).not.toBeInTheDocument()
  })
})
