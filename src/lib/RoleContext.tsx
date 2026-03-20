import { createContext, useContext, useEffect, useState } from 'react'
import { doc, onSnapshot } from 'firebase/firestore'
import { db } from './firebase'
import { useAuth } from './useAuth'
import type { UserRole } from '../services/AuthService'

const RoleContext = createContext<UserRole | null>(null)

export function RoleProvider({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  const [role, setRole] = useState<UserRole | null>(null)

  useEffect(() => {
    if (loading || !user) return
    const ref = doc(db, 'users', user.uid)
    const unsubscribe = onSnapshot(
      ref,
      (snap) => {
        if (snap.exists()) {
          const data = snap.data()
          setRole((data.role as UserRole | undefined) ?? 'user')
        } else {
          setRole('user')
        }
      },
      (error) => {
        console.error('[RoleContext] onSnapshot error:', error)
      }
    )
    return () => {
      unsubscribe()
      setRole(null)
    }
  }, [user, loading])

  return <RoleContext.Provider value={role}>{children}</RoleContext.Provider>
}

// No guard throw here — null is a valid value meaning "not logged in",
// same as the original useRole behaviour. Outside-provider callers
// also get null, which is safe.
// eslint-disable-next-line react-refresh/only-export-components
export function useRoleContext(): UserRole | null {
  return useContext(RoleContext)
}
