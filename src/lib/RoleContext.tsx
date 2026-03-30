/* eslint-disable react-refresh/only-export-components -- context + hook co-located */
import { createContext, useContext } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from './useAuth'
import { getProfile } from '../services/ProfileService'
import type { UserRole } from '../services/AuthService'

const RoleContext = createContext<UserRole | null>(null)

const TEN_MINUTES = 10 * 60 * 1000

export function RoleProvider({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()

  const { data: role = null } = useQuery({
    queryKey: ['role', user?.uid ?? ''],
    queryFn: async () => {
      if (!user) return null
      const profile = await getProfile(user.uid)
      return profile?.role ?? ('user' as UserRole)
    },
    enabled: !loading && !!user,
    staleTime: TEN_MINUTES,
  })

  return <RoleContext.Provider value={role}>{children}</RoleContext.Provider>
}

// No guard throw here — null is a valid value meaning "not logged in".
export function useRoleContext(): UserRole | null {
  return useContext(RoleContext)
}
