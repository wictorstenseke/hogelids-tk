/* eslint-disable react-refresh/only-export-components -- context + hook are intentionally co-located */
import { createContext, useContext, useState } from 'react'

export type AuthModalView = 'sign-in' | 'sign-up'

interface AuthModalState {
  view: AuthModalView
  initialEmail?: string
}

interface AuthModalContextValue {
  openAuthModal: (view: AuthModalView, initialEmail?: string) => void
  closeAuthModal: () => void
  authModalState: AuthModalState | null
}

const AuthModalContext = createContext<AuthModalContextValue | null>(null)

export function AuthModalProvider({ children }: { children: React.ReactNode }) {
  const [authModalState, setAuthModalState] = useState<AuthModalState | null>(
    null
  )

  function openAuthModal(view: AuthModalView, initialEmail?: string) {
    setAuthModalState({ view, initialEmail })
  }

  function closeAuthModal() {
    setAuthModalState(null)
  }

  return (
    <AuthModalContext.Provider
      value={{ openAuthModal, closeAuthModal, authModalState }}
    >
      {children}
    </AuthModalContext.Provider>
  )
}

export function useAuthModal(): AuthModalContextValue {
  const ctx = useContext(AuthModalContext)
  if (!ctx)
    throw new Error('useAuthModal must be used within AuthModalProvider')
  return ctx
}
