# Header Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restructure the app header into a two-row layout with responsive nav — logo centered on its own row, MenyButton (mobile) and DesktopNav (desktop) for nav items, AvatarMenu scoped to account actions only.

**Architecture:** Extract a new `Header` component that owns the two-row layout and computes `isAdmin`/`ladderEnabled`, passing them as props to `MenyButton` and `DesktopNav`. AvatarMenu is stripped of nav items. HomePage replaces its inline `<header>` block with `<Header />`.

**Tech Stack:** React 19, Tailwind CSS v4, TanStack Router (`<Link>`), Vitest + React Testing Library, `useRole` / `isAdminRole` from `src/lib/useRole.ts` + `src/services/AuthService.ts`, `useAppSettings` from `src/lib/useAppSettings.ts`.

**Spec:** `docs/2026-03-22-header-redesign-design.md`

---

## File Map

| Action | File                                         | Responsibility                          |
| ------ | -------------------------------------------- | --------------------------------------- |
| Modify | `src/routes/-components/AvatarMenu.tsx`      | Remove Stegen, Admin, dead hooks        |
| Create | `src/routes/-components/MenyButton.tsx`      | Mobile nav dropdown                     |
| Create | `src/routes/-components/MenyButton.test.tsx` | Tests for MenyButton                    |
| Create | `src/routes/-components/DesktopNav.tsx`      | Desktop pill nav                        |
| Create | `src/routes/-components/DesktopNav.test.tsx` | Tests for DesktopNav                    |
| Create | `src/routes/-components/Header.tsx`          | Two-row header shell                    |
| Create | `src/routes/-components/Header.test.tsx`     | Tests for Header                        |
| Modify | `src/routes/-components/HomePage.tsx`        | Replace inline header with `<Header />` |

---

## Task 1: Strip AvatarMenu

Remove Stegen and Admin items and their dead hook calls from `AvatarMenu.tsx`.

**Files:**

- Modify: `src/routes/-components/AvatarMenu.tsx`

- [ ] **Step 1: Read the current file**

Open `src/routes/-components/AvatarMenu.tsx`. Confirm lines to remove:

- Imports: `IconShieldCheckFilled`, `IconTrophyFilled`, `useRole`, `isAdminRole`, `useAppSettings`
- Hook calls: `const role = useRole()`, `const isAdmin = isAdminRole(role)`, `const { settings } = useAppSettings()`, `const ladderEnabled = ...`
- JSX blocks: `{ladderEnabled && (...Stegen button...)}` and `{isAdmin && (...Admin button...)}`

- [ ] **Step 2: Remove nav items and dead code**

After removal, `AvatarMenu.tsx` should look like this (only relevant parts shown):

```tsx
import { useState, useRef, useEffect } from 'react'
import { IconUserFilled, IconLogout } from '@tabler/icons-react'
import type { AuthUser } from '../../lib/useAuth'

interface AvatarMenuProps {
  user: AuthUser
  onOpenProfile: () => void
  onSignOut: () => void
}

// ... getInitials unchanged ...

export function AvatarMenu({
  user,
  onOpenProfile,
  onSignOut,
}: AvatarMenuProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClick)
    }
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  const initials = getInitials(user.displayName ?? user.email ?? '?')

  return (
    <div ref={ref} className="relative">
      {/* trigger button — unchanged */}
      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 min-w-[180px] overflow-hidden rounded-xl border border-gray-100 bg-white shadow-lg">
          <div className="border-b border-gray-100 px-4 py-3 text-center">
            <p className="text-sm font-semibold text-gray-900">
              {user.displayName}
            </p>
            <p className="text-xs text-gray-500">{user.email}</p>
          </div>
          {/* Min profil button — unchanged */}
          {/* Logga ut button — unchanged */}
          {/* Stegen and Admin buttons REMOVED */}
        </div>
      )}
    </div>
  )
}
```

Also remove the `useNavigate` import — it was only used by the removed nav buttons.

- [ ] **Step 3: Run lint to catch dead imports**

```bash
npm run lint
```

Expected: no unused import warnings. Fix any that appear.

- [ ] **Step 4: Run tests**

```bash
npm run test:run
```

Expected: all existing tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/routes/-components/AvatarMenu.tsx
git commit -m "refactor: strip nav items from AvatarMenu, keep only profile and sign out"
```

---

## Task 2: Create MenyButton

Mobile-only dropdown with Stegen and Admin links, conditional on auth + rights.

**Files:**

- Create: `src/routes/-components/MenyButton.tsx`
- Create: `src/routes/-components/MenyButton.test.tsx`

- [ ] **Step 1: Write the failing tests**

Create `src/routes/-components/MenyButton.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MenyButton } from './MenyButton'

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => vi.fn(),
}))

describe('MenyButton', () => {
  it('returns null when no items are visible', () => {
    const { container } = render(
      <MenyButton isAdmin={false} ladderEnabled={false} />
    )
    expect(container.firstChild).toBeNull()
  })

  it('renders both Stegen and Admin when both are enabled', async () => {
    const user = userEvent.setup()
    render(<MenyButton isAdmin={true} ladderEnabled={true} />)
    await user.click(screen.getByRole('button', { name: /meny/i }))
    expect(screen.getByText('Stegen')).toBeInTheDocument()
    expect(screen.getByText('Admin')).toBeInTheDocument()
  })

  it('renders "Meny" button when ladderEnabled is true', () => {
    render(<MenyButton isAdmin={false} ladderEnabled={true} />)
    expect(screen.getByRole('button', { name: /meny/i })).toBeInTheDocument()
  })

  it('renders "Meny" button when isAdmin is true', () => {
    render(<MenyButton isAdmin={true} ladderEnabled={false} />)
    expect(screen.getByRole('button', { name: /meny/i })).toBeInTheDocument()
  })

  it('shows Stegen in dropdown when ladderEnabled is true', async () => {
    const user = userEvent.setup()
    render(<MenyButton isAdmin={false} ladderEnabled={true} />)
    await user.click(screen.getByRole('button', { name: /meny/i }))
    expect(screen.getByText('Stegen')).toBeInTheDocument()
  })

  it('shows Admin in dropdown when isAdmin is true', async () => {
    const user = userEvent.setup()
    render(<MenyButton isAdmin={true} ladderEnabled={false} />)
    await user.click(screen.getByRole('button', { name: /meny/i }))
    expect(screen.getByText('Admin')).toBeInTheDocument()
  })

  it('does not show Admin when isAdmin is false', async () => {
    const user = userEvent.setup()
    render(<MenyButton isAdmin={false} ladderEnabled={true} />)
    await user.click(screen.getByRole('button', { name: /meny/i }))
    expect(screen.queryByText('Admin')).not.toBeInTheDocument()
  })

  it('has aria-haspopup and aria-expanded attributes on trigger', () => {
    render(<MenyButton isAdmin={true} ladderEnabled={false} />)
    const btn = screen.getByRole('button', { name: /meny/i })
    expect(btn).toHaveAttribute('aria-haspopup', 'menu')
    expect(btn).toHaveAttribute('aria-expanded', 'false')
  })

  it('sets aria-expanded true when open', async () => {
    const user = userEvent.setup()
    render(<MenyButton isAdmin={true} ladderEnabled={false} />)
    const btn = screen.getByRole('button', { name: /meny/i })
    await user.click(btn)
    expect(btn).toHaveAttribute('aria-expanded', 'true')
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npm run test:run -- MenyButton
```

Expected: FAIL — `MenyButton` not found.

- [ ] **Step 3: Create MenyButton.tsx**

```tsx
import { useState, useRef, useEffect } from 'react'
import { IconTrophyFilled, IconShieldCheckFilled } from '@tabler/icons-react'
import { useNavigate } from '@tanstack/react-router'

interface MenyButtonProps {
  isAdmin: boolean
  ladderEnabled: boolean
}

export function MenyButton({ isAdmin, ladderEnabled }: MenyButtonProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClick)
    }
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  if (!isAdmin && !ladderEnabled) return null

  return (
    <div ref={ref} className="relative flex sm:hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex min-h-[44px] cursor-pointer items-center px-1 text-sm font-medium text-white/80 hover:text-white transition-colors"
      >
        Meny
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-2 min-w-[160px] overflow-hidden rounded-xl border border-gray-100 bg-white shadow-lg">
          {ladderEnabled && (
            <button
              type="button"
              onClick={() => {
                setOpen(false)
                void navigate({ to: '/stegen' })
              }}
              className="flex w-full cursor-pointer items-center gap-2.5 px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <IconTrophyFilled size={16} className="shrink-0 text-gray-400" />
              Stegen
            </button>
          )}
          {isAdmin && (
            <button
              type="button"
              onClick={() => {
                setOpen(false)
                void navigate({ to: '/admin' })
              }}
              className="flex w-full cursor-pointer items-center gap-2.5 px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <IconShieldCheckFilled
                size={16}
                className="shrink-0 text-gray-400"
              />
              Admin
            </button>
          )}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npm run test:run -- MenyButton
```

Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/routes/-components/MenyButton.tsx src/routes/-components/MenyButton.test.tsx
git commit -m "feat: add MenyButton mobile nav dropdown"
```

---

## Task 3: Create DesktopNav

Desktop pill-hover nav buttons for Stegen and Admin, hidden on mobile.

**Files:**

- Create: `src/routes/-components/DesktopNav.tsx`
- Create: `src/routes/-components/DesktopNav.test.tsx`

- [ ] **Step 1: Write the failing tests**

Create `src/routes/-components/DesktopNav.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { DesktopNav } from './DesktopNav'

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => vi.fn(),
}))

describe('DesktopNav', () => {
  it('returns null when no items are visible', () => {
    const { container } = render(
      <DesktopNav isAdmin={false} ladderEnabled={false} />
    )
    expect(container.firstChild).toBeNull()
  })

  it('renders Stegen button when ladderEnabled is true', () => {
    render(<DesktopNav isAdmin={false} ladderEnabled={true} />)
    expect(screen.getByRole('button', { name: /stegen/i })).toBeInTheDocument()
  })

  it('renders Admin button when isAdmin is true', () => {
    render(<DesktopNav isAdmin={true} ladderEnabled={false} />)
    expect(screen.getByRole('button', { name: /admin/i })).toBeInTheDocument()
  })

  it('does not render Admin when isAdmin is false', () => {
    render(<DesktopNav isAdmin={false} ladderEnabled={true} />)
    expect(
      screen.queryByRole('button', { name: /admin/i })
    ).not.toBeInTheDocument()
  })

  it('does not render Stegen when ladderEnabled is false', () => {
    render(<DesktopNav isAdmin={true} ladderEnabled={false} />)
    expect(
      screen.queryByRole('button', { name: /stegen/i })
    ).not.toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npm run test:run -- DesktopNav
```

Expected: FAIL — `DesktopNav` not found.

- [ ] **Step 3: Create DesktopNav.tsx**

```tsx
import { IconTrophyFilled, IconShieldCheckFilled } from '@tabler/icons-react'
import { useNavigate } from '@tanstack/react-router'

interface DesktopNavProps {
  isAdmin: boolean
  ladderEnabled: boolean
}

export function DesktopNav({ isAdmin, ladderEnabled }: DesktopNavProps) {
  const navigate = useNavigate()

  if (!isAdmin && !ladderEnabled) return null

  return (
    <div className="hidden sm:flex items-center gap-1">
      {ladderEnabled && (
        <button
          type="button"
          onClick={() => void navigate({ to: '/stegen' })}
          className="flex cursor-pointer items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium text-white/80 hover:bg-white/15 hover:text-white transition-colors duration-150"
        >
          <IconTrophyFilled size={14} className="shrink-0" />
          Stegen
        </button>
      )}
      {isAdmin && (
        <button
          type="button"
          onClick={() => void navigate({ to: '/admin' })}
          className="flex cursor-pointer items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium text-white/80 hover:bg-white/15 hover:text-white transition-colors duration-150"
        >
          <IconShieldCheckFilled size={14} className="shrink-0" />
          Admin
        </button>
      )}
    </div>
  )
}
```

Note on pill hover: The header sits on a dark/gradient background (body gradient flows through), so `hover:bg-gray-100` from the spec would look wrong. Use `hover:bg-white/15` for a translucent white pill that works on the dark background. Adjust if the visual result is off after manual inspection.

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npm run test:run -- DesktopNav
```

Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/routes/-components/DesktopNav.tsx src/routes/-components/DesktopNav.test.tsx
git commit -m "feat: add DesktopNav pill-hover navigation buttons"
```

---

## Task 4: Create Header

Two-row header shell that owns layout, computes `isAdmin` + `ladderEnabled`, passes to children.

**Files:**

- Create: `src/routes/-components/Header.tsx`
- Create: `src/routes/-components/Header.test.tsx`

- [ ] **Step 1: Write the failing tests**

Create `src/routes/-components/Header.test.tsx`:

```tsx
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
  useAppSettings: vi.fn(() => ({ settings: { ladderEnabled: false } })),
}))

// Stub out child nav components — they have their own tests
vi.mock('./MenyButton', () => ({
  MenyButton: () => null,
}))

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
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npm run test:run -- Header.test
```

Expected: FAIL — `Header` not found.

- [ ] **Step 3: Create Header.tsx**

```tsx
import { Link } from '@tanstack/react-router'
import type { AuthUser } from '../../lib/useAuth'
import { useRole } from '../../lib/useRole'
import { isAdminRole } from '../../services/AuthService'
import { useAppSettings } from '../../lib/useAppSettings'
import { AvatarMenu } from './AvatarMenu'
import { MenyButton } from './MenyButton'
import { DesktopNav } from './DesktopNav'

interface HeaderProps {
  user: AuthUser | null
  authLoading: boolean
  onOpenProfile: () => void
  onSignOut: () => void
  onSignIn?: () => void // triggers sign-in modal (unauthenticated only)
  onSignUp?: () => void // triggers sign-up modal (unauthenticated only)
}

export function Header({
  user,
  authLoading,
  onOpenProfile,
  onSignOut,
  onSignIn,
  onSignUp,
}: HeaderProps) {
  const role = useRole()
  const isAdmin = user ? isAdminRole(role) : false
  const { settings } = useAppSettings()
  const ladderEnabled = user ? (settings?.ladderEnabled ?? true) : false

  return (
    <header className="bg-transparent">
      <div className="mx-auto max-w-lg px-4 py-4">
        {/* Row 1: nav controls */}
        <div className="flex items-center">
          <MenyButton isAdmin={isAdmin} ladderEnabled={ladderEnabled} />
          <DesktopNav isAdmin={isAdmin} ladderEnabled={ladderEnabled} />

          {/* Auth controls — ml-auto keeps them right-aligned regardless of left side */}
          {!authLoading && (
            <div className="ml-auto flex shrink-0 items-center gap-1">
              {user ? (
                <AvatarMenu
                  user={user}
                  onOpenProfile={onOpenProfile}
                  onSignOut={onSignOut}
                />
              ) : (
                <>
                  <button
                    type="button"
                    onClick={onSignIn}
                    className="flex min-h-[44px] cursor-pointer items-center rounded-lg px-3 py-2 text-sm font-medium text-white/80 hover:text-white transition-colors"
                  >
                    Logga in
                  </button>
                  <button
                    type="button"
                    onClick={onSignUp}
                    className="flex min-h-[44px] cursor-pointer items-center rounded-lg px-4 py-2 text-sm font-semibold text-gray-900 transition-opacity hover:opacity-80"
                    style={{ backgroundColor: '#F1E334' }}
                  >
                    Skapa konto
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        {/* Row 2: centered logo */}
        <div className="flex justify-center pt-2">
          <Link
            to="/"
            className="block shrink-0 rounded-lg transition-[filter,transform] duration-200 filter-[drop-shadow(0px_4px_4px_rgba(0,0,0,0.15))] hover:filter-[drop-shadow(0px_5px_8px_rgba(0,0,0,0.25))] hover:scale-[1.01] focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
          >
            <img
              src="/htk-logo.svg"
              alt="HTK Logo"
              className="h-auto w-[72px] sm:w-[80px]"
            />
          </Link>
        </div>
      </div>
    </header>
  )
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npm run test:run -- Header.test
```

Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/routes/-components/Header.tsx src/routes/-components/Header.test.tsx
git commit -m "feat: add Header component with two-row layout"
```

---

## Task 5: Wire Header into HomePage

Replace the inline `<header>` block in `HomePage.tsx` with `<Header />` and pass the correct callbacks.

**Files:**

- Modify: `src/routes/-components/HomePage.tsx`

- [ ] **Step 1: Add the Header import**

In `src/routes/-components/HomePage.tsx`, add to the import block:

```tsx
import { Header } from './Header'
```

- [ ] **Step 2: Replace the header block**

Find the `<header className="bg-transparent">...</header>` block (lines 120–172 approximately). Replace the entire block with:

```tsx
<Header
  user={user}
  authLoading={authLoading}
  onOpenProfile={() => setShowProfile(true)}
  onSignOut={() => void signOut()}
  onSignIn={() => setAuthModal('sign-in')}
  onSignUp={() => setAuthModal('sign-up')}
/>
```

- [ ] **Step 3: Remove dead imports from HomePage**

After the swap, remove these now-unused imports from `HomePage.tsx`:

- `Link` from `@tanstack/react-router` — only used in the old header block
- `AvatarMenu` — now owned by `Header`

Run:

```bash
npm run lint
```

Fix any remaining unused import warnings.

- [ ] **Step 4: Run all tests**

```bash
npm run test:run
```

Expected: all tests PASS. The existing `HomePage.test.tsx` mocks `useAuth` and shouldn't break. If it does, read the error and adjust mocks.

- [ ] **Step 5: Manual smoke test**

```bash
npm run dev
```

Open `http://localhost:5173/hogelids-tk/` and verify:

- Logo is centered, larger, no title text beside it
- Signed out: "Logga in" and "Skapa konto" visible top-right, no Meny button
- Signed in as regular member (no ladder, no admin): no Meny button on mobile, no nav buttons on desktop
- Signed in as member with ladder enabled: "Meny" on mobile opens dropdown with "Stegen"; desktop shows "Stegen" pill button
- Signed in as admin: Meny shows "Admin" (and "Stegen" if ladder on); desktop shows same
- AvatarMenu: only "Min profil" and "Logga ut" present

- [ ] **Step 6: Commit**

```bash
git add src/routes/-components/HomePage.tsx src/routes/-components/Header.tsx
git commit -m "feat: wire Header into HomePage, replace inline header block"
```

---

## Done

All five tasks complete. The header is now a two-row layout with responsive navigation, the logo is centered and enlarged, the title is gone, and AvatarMenu is scoped to account actions only.
