/* eslint-disable react-refresh/only-export-components -- context + hook co-located */
import { createContext, useContext } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  getAppSettings,
  APP_SETTINGS_QUERY_KEY,
  type AppSettings,
  APP_SETTINGS_DEFAULTS,
} from '../services/AppSettingsService'

interface AppSettingsContextValue {
  settings: AppSettings | null
  isLoading: boolean
}

const AppSettingsContext = createContext<AppSettingsContextValue | null>(null)

const FIVE_MINUTES = 5 * 60 * 1000

export function AppSettingsProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const { data: settings = null, isLoading } = useQuery({
    queryKey: APP_SETTINGS_QUERY_KEY,
    queryFn: getAppSettings,
    staleTime: FIVE_MINUTES,
    // Fall back to defaults on error so the app stays functional
    placeholderData: APP_SETTINGS_DEFAULTS,
  })

  return (
    <AppSettingsContext.Provider value={{ settings, isLoading }}>
      {children}
    </AppSettingsContext.Provider>
  )
}

export function useAppSettingsContext(): AppSettingsContextValue {
  const ctx = useContext(AppSettingsContext)
  if (!ctx)
    throw new Error(
      'useAppSettingsContext must be used within AppSettingsProvider'
    )
  return ctx
}
