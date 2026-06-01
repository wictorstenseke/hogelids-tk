import { createContext, useContext, useEffect, useState } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from './firebase'
import * as GuestSession from './GuestSession'
import { setSentryUser } from './sentryClient'

export interface AuthUser {
  uid: string
  email: string
  displayName: string
}

interface AuthContextValue {
  user: AuthUser | null
  loading: boolean
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      (firebaseUser) => {
        if (firebaseUser) {
          const authUser = {
            uid: firebaseUser.uid,
            email: firebaseUser.email ?? '',
            displayName: firebaseUser.displayName ?? '',
          }
          setUser(authUser)
          setSentryUser({
            id: authUser.uid,
            email: authUser.email,
            username: authUser.displayName,
          })
        } else {
          setUser(null)
          // Fall back to guest identity if present
          const guestEmail = GuestSession.getEmail()
          const guestName = GuestSession.getName()
          if (guestEmail) {
            setSentryUser({
              email: guestEmail,
              username: guestName ?? undefined,
            })
          } else {
            setSentryUser(null)
          }
        }
        setLoading(false)
      },
      (error) => {
        console.error('[AuthContext] onAuthStateChanged error:', error)
        setLoading(false)
      }
    )
    return unsubscribe
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuthContext(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuthContext must be used within AuthProvider')
  return ctx
}
