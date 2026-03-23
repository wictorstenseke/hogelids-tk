// src/lib/AuthContext.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import type { User } from 'firebase/auth'

vi.mock('./firebase', () => ({ auth: {} }))
vi.mock('firebase/auth', () => ({ onAuthStateChanged: vi.fn() }))

// Import AFTER mocks are declared
import { onAuthStateChanged } from 'firebase/auth'
import { AuthProvider, useAuthContext } from './AuthContext'

function TestConsumer() {
  const { user, loading } = useAuthContext()
  return (
    <div>
      <span data-testid="loading">{String(loading)}</span>
      <span data-testid="user">{user ? user.email : 'null'}</span>
    </div>
  )
}

describe('AuthProvider', () => {
  beforeEach(() => {
    vi.mocked(onAuthStateChanged).mockReset()
  })

  it('starts with loading=true and user=null before callback fires', () => {
    vi.mocked(onAuthStateChanged).mockImplementation(() => vi.fn())
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    )
    expect(screen.getByTestId('loading').textContent).toBe('true')
    expect(screen.getByTestId('user').textContent).toBe('null')
  })

  it('exposes the signed-in user after the auth callback fires', async () => {
    let captured: ((u: User | null) => void) | undefined
    vi.mocked(onAuthStateChanged).mockImplementation((_auth, cb) => {
      captured = cb as (u: User | null) => void
      return vi.fn()
    })
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    )
    await act(async () => {
      captured?.({
        uid: 'uid-1',
        email: 'player@htk.se',
        displayName: 'Player One',
        emailVerified: true,
      } as User)
    })
    expect(screen.getByTestId('loading').textContent).toBe('false')
    expect(screen.getByTestId('user').textContent).toBe('player@htk.se')
  })

  it('exposes null user when not signed in', async () => {
    let captured: ((u: User | null) => void) | undefined
    vi.mocked(onAuthStateChanged).mockImplementation((_auth, cb) => {
      captured = cb as (u: User | null) => void
      return vi.fn()
    })
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    )
    await act(async () => {
      captured?.(null)
    })
    expect(screen.getByTestId('loading').textContent).toBe('false')
    expect(screen.getByTestId('user').textContent).toBe('null')
  })

  it('throws when useAuthContext is used outside AuthProvider', () => {
    // Suppress React's error boundary noise in test output
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(() => render(<TestConsumer />)).toThrow(
      'useAuthContext must be used within AuthProvider'
    )
    spy.mockRestore()
  })

  it('calls unsubscribe on unmount', () => {
    const unsubscribe = vi.fn()
    vi.mocked(onAuthStateChanged).mockImplementation(() => unsubscribe)
    const { unmount } = render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    )
    unmount()
    expect(unsubscribe).toHaveBeenCalledOnce()
  })
})
