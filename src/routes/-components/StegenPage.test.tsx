import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Timestamp } from 'firebase/firestore'
import { useAuth, type AuthUser } from '../../lib/useAuth'
import { getProfile } from '../../services/ProfileService'
import { getActiveLadder, type Ladder } from '../../services/LadderService'
import { StegenPage } from './StegenPage'

const { mockGetActiveLadder, mockGetLadderMatches, mockGetProfile } =
  vi.hoisted(() => ({
    mockGetActiveLadder: vi.fn(),
    mockGetLadderMatches: vi.fn(() => Promise.resolve([])),
    mockGetProfile: vi.fn(),
  }))

vi.mock('../../lib/useAuth', () => ({
  useAuth: vi.fn(),
}))

vi.mock('../../lib/useAppSettings', () => ({
  useAppSettings: vi.fn(() => ({
    settings: {
      bookingEnabled: true,
      bannerVisible: false,
      bannerText: '',
      stegenJoinWelcomeBannerVisible: true,
      aiAssistantEnabled: false,
    },
    isLoading: false,
  })),
}))

vi.mock('../../lib/ToastContext', () => ({
  useToast: vi.fn(() => ({ addToast: vi.fn() })),
}))

vi.mock('../../lib/ProfileModalContext', () => ({
  useProfileModal: vi.fn(() => ({ openProfileModal: vi.fn() })),
}))

vi.mock('../../lib/useIsDesktop', () => ({
  useIsDesktop: vi.fn(() => true),
}))

vi.mock('../../lib/GuestSession', () => ({
  dismissJoinWelcomeBannerForLadder: vi.fn(),
  getJoinWelcomeBannerDismissedLadderId: vi.fn(() => null),
}))

vi.mock('../../services/ProfileService', () => ({
  PROFILE_QUERY_KEY: 'profile',
  getProfile: mockGetProfile,
}))

vi.mock('../../services/LadderService', () => ({
  LADDER_QUERY_KEY: ['ladder', 'active'],
  LADDER_MATCHES_QUERY_KEY: (id: string) => ['ladder', id, 'matches'],
  getActiveLadder: mockGetActiveLadder,
  getLadderMatches: mockGetLadderMatches,
  joinLadder: vi.fn(),
  reportLadderResult: vi.fn(),
  createLadderMatch: vi.fn(),
}))

vi.mock('../../services/LaddersArchiveService', () => ({
  COMPLETED_LADDERS_QUERY_KEY: ['ladders', 'completed'],
  loadCompletedLadders: vi.fn(() => Promise.resolve([])),
}))

vi.mock('../../services/BookingService', () => ({
  BOOKINGS_QUERY_KEY: ['bookings', 'upcoming'],
  getUpcomingBookings: vi.fn(() => Promise.resolve([])),
  deleteMemberBooking: vi.fn(),
}))

vi.mock('./BookingForm', () => ({
  BookingForm: () => null,
}))

vi.mock('./BookingDrawer', () => ({
  BookingDrawer: () => null,
}))

vi.mock('./LadderStatsCards', () => ({
  LadderStatsCards: () => null,
}))

vi.mock('./ParticipantPhoneSheetDialog', () => ({
  ParticipantPhoneSheetDialog: ({
    displayName,
    phone,
  }: {
    displayName: string
    phone: string
  }) => (
    <button aria-label={`Telefonnummer för ${displayName}`}>{phone}</button>
  ),
}))

const signedInUser: AuthUser = {
  uid: 'user-1',
  email: 'player@example.com',
  displayName: 'Current Player',
}

function fakeTimestamp(): Timestamp {
  return {
    toDate: () => new Date('2026-01-01T00:00:00.000Z'),
    toMillis: () => Date.parse('2026-01-01T00:00:00.000Z'),
  } as Timestamp
}

const activeLadder: Ladder = {
  id: 'ladder-1',
  name: 'Stegen 2026',
  year: 2026,
  status: 'active',
  joinOpensAt: null,
  tournamentStartsAt: null,
  createdAt: fakeTimestamp(),
  completedAt: null,
  participants: [
    {
      uid: 'user-1',
      displayName: 'Current Player',
      phone: '070 - 111 11 11',
      position: 1,
      wins: 0,
      losses: 0,
      paused: false,
    },
    {
      uid: 'user-2',
      displayName: 'Anna',
      phone: null,
      position: 2,
      wins: 0,
      losses: 0,
      paused: false,
    },
  ],
}

function renderWithQueryClient(ui: React.ReactElement) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })

  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>)
}

describe('StegenPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useAuth).mockReturnValue({ user: signedInUser, loading: false })
    vi.mocked(getActiveLadder).mockResolvedValue(activeLadder)
    vi.mocked(getProfile).mockResolvedValue({
      uid: 'user-2',
      email: 'anna@example.com',
      displayName: 'Anna',
      phone: '070 - 222 22 22',
      createdAt: fakeTimestamp(),
      role: 'user',
    })
  })

  it('uses profile phone as fallback when ladder participant phone snapshot is empty', async () => {
    renderWithQueryClient(<StegenPage />)

    expect(
      await screen.findByRole('button', { name: 'Telefonnummer för Anna' })
    ).toHaveTextContent('070 - 222 22 22')
  })
})
