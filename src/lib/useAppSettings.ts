import { useEffect, useState } from 'react'
import { onSnapshot } from 'firebase/firestore'
import {
  getAppSettingsRef,
  type AppSettings,
  APP_SETTINGS_DEFAULTS,
} from '../services/AppSettingsService'

interface UseAppSettingsResult {
  settings: AppSettings | null
  isLoading: boolean
}

// Returns live app settings from Firestore settings/app.
// Falls back to APP_SETTINGS_DEFAULTS when the document doesn't exist.
export function useAppSettings(): UseAppSettingsResult {
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
        console.error('[useAppSettings] onSnapshot error:', error)
        setSettings(APP_SETTINGS_DEFAULTS)
        setIsLoading(false)
      }
    )

    return () => {
      unsubscribe()
    }
  }, [])

  return { settings, isLoading }
}
