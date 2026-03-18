import { useEffect, useState } from 'react'
import { doc, onSnapshot } from 'firebase/firestore'
import { db } from './firebase'
import { useAuth } from './useAuth'
import type { UserRole } from '../services/AuthService'

// Returns the current user's role in real time.
// Returns null while loading or when not logged in.
export function useRole(): UserRole | null {
  const { user, loading } = useAuth()
  const [role, setRole] = useState<UserRole | null>(null)

  useEffect(() => {
    if (loading || !user) {
      return
    }

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
        console.error('[useRole] onSnapshot error:', error)
      }
    )

    return () => {
      unsubscribe()
      setRole(null)
    }
  }, [user, loading])

  return role
}
