import { createContext, useContext, useEffect, useState } from 'react'
import { onSnapshot } from 'firebase/firestore'
import {
  getAppSettingsRef,
  type AppSettings,
  APP_SETTINGS_DEFAULTS,
} from '../services/AppSettingsService'

interface AppSettingsContextValue {
  settings: AppSettings | null
  isLoading: boolean
}

const AppSettingsContext = createContext<AppSettingsContextValue | null>(null)

export function AppSettingsProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const [settings, setSettings] = useState<AppSettings | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const ref = getAppSettingsRef()
    const unsubscribe = onSnapshot(
      ref,
      (snap) => {
        if (snap.exists()) {
          const data = snap.data()
          setSettings({
            bookingEnabled:
              data.bookingEnabled ?? APP_SETTINGS_DEFAULTS.bookingEnabled,
            ladderEnabled:
              data.ladderEnabled ?? APP_SETTINGS_DEFAULTS.ladderEnabled,
            bannerVisible:
              data.bannerVisible ?? APP_SETTINGS_DEFAULTS.bannerVisible,
            bannerText: data.bannerText ?? APP_SETTINGS_DEFAULTS.bannerText,
            bannerLinkText: data.bannerLinkText,
            bannerLinkUrl: data.bannerLinkUrl,
          })
        } else {
          setSettings(APP_SETTINGS_DEFAULTS)
        }
        setIsLoading(false)
      },
      (error) => {
        console.error('[AppSettingsContext] onSnapshot error:', error)
        setSettings(APP_SETTINGS_DEFAULTS)
        setIsLoading(false)
      }
    )
    return () => unsubscribe()
  }, [])

  return (
    <AppSettingsContext.Provider value={{ settings, isLoading }}>
      {children}
    </AppSettingsContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAppSettingsContext(): AppSettingsContextValue {
  const ctx = useContext(AppSettingsContext)
  if (!ctx)
    throw new Error(
      'useAppSettingsContext must be used within AppSettingsProvider'
    )
  return ctx
}
