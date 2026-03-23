import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Header } from './Header'
import type { AuthUser } from '../../lib/useAuth'

vi.mock('@tanstack/react-router', () => ({
  Link: ({
    children,
    ...props
  }: React.HTMLAttributes<HTMLAnchorElement> & { to?: string }) => (
    <a {...props}>{children}</a>
  ),
  useNavigate: () => vi.fn(),
}))

vi.mock('../../lib/useRole', () => ({
  useRole: vi.fn(() => null),
}))

vi.mock('../../services/AuthService', () => ({
  isAdminRole: vi.fn(() => false),
  signOut: vi.fn(),
}))

vi.mock('../../lib/useAppSettings', () => ({
  useAppSettings: vi.fn(() => ({
    settings: { ladderEnabled: false, ladderJoinOpensAt: null },
  })),
}))

// Stub out child nav components — they have their own tests
vi.mock('./DesktopNav', () => ({
  DesktopNav: () => null,
}))

const mockUser: AuthUser = {
  uid: 'u1',
  email: 'test@test.se',
  displayName: 'Test User',
  emailVerified: true,
}

function wrap(ui: React.ReactElement) {
  const qc = new QueryClient()
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>)
}

const defaultProps = {
  user: null as AuthUser | null,
  authLoading: false,
  onOpenProfile: vi.fn(),
  onSignOut: vi.fn(),
  onSignIn: vi.fn(),
  onSignUp: vi.fn(),
}

describe('Header', () => {
  it('renders the logo image', () => {
    wrap(<Header {...defaultProps} />)
    expect(screen.getByAltText('HTK Logo')).toBeInTheDocument()
  })

  it('does not render the app title text', () => {
    wrap(<Header {...defaultProps} />)
    expect(screen.queryByText(/Högelids Tennisklubb/i)).not.toBeInTheDocument()
  })

  it('shows sign-in buttons when unauthenticated', () => {
    wrap(<Header {...defaultProps} />)
    expect(screen.getByText('Logga in')).toBeInTheDocument()
    expect(screen.getByText('Skapa konto')).toBeInTheDocument()
  })

  it('shows AvatarMenu when authenticated', () => {
    wrap(<Header {...defaultProps} user={mockUser} />)
    // AvatarMenu renders initials button
    expect(
      screen.getByRole('button', { name: /kontomeny/i })
    ).toBeInTheDocument()
  })

  it('shows nothing in auth area while loading', () => {
    wrap(<Header {...defaultProps} authLoading={true} />)
    expect(screen.queryByText('Logga in')).not.toBeInTheDocument()
    expect(screen.queryByText('Skapa konto')).not.toBeInTheDocument()
  })
})
