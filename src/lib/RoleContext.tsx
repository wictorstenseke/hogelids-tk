/* eslint-disable react-refresh/only-export-components -- context + hook co-located */
import { createContext, useContext } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from './useAuth'
import { getProfile, PROFILE_QUERY_KEY } from '../services/ProfileService'
import type { UserRole } from '../services/AuthService'
import { PROFILE_STALE_TIME_MS } from '../services/queryStaleTimes'

const RoleContext = createContext<UserRole | null>(null)

export function RoleProvider({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()

  const { data: role = null } = useQuery({
    queryKey: [PROFILE_QUERY_KEY, user?.uid ?? ''],
    queryFn: () => getProfile(user!.uid),
    enabled: !loading && !!user,
    staleTime: PROFILE_STALE_TIME_MS,
    select: (profile) => profile?.role ?? ('user' as UserRole),
  })

  return <RoleContext.Provider value={role}>{children}</RoleContext.Provider>
}

// No guard throw here — null is a valid value meaning "not logged in".
export function useRoleContext(): UserRole | null {
  return useContext(RoleContext)
}
