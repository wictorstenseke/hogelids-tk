import { doc, setDoc } from 'firebase/firestore'
import { db } from '../lib/firebase'

export interface AppSettings {
  bookingEnabled: boolean
  bannerVisible: boolean
  bannerText: string
  bannerLinkText?: string
  bannerLinkUrl?: string
}

export const APP_SETTINGS_DEFAULTS: AppSettings = {
  bookingEnabled: true,
  bannerVisible: false,
  bannerText: '',
}

// Returns the Firestore DocumentReference for the app settings document.
export function getAppSettingsRef() {
  return doc(db, 'settings', 'app')
}

// Writes a partial update to settings/app. Creates the document if it doesn't exist.
export async function updateAppSettings(
  partial: Partial<AppSettings>
): Promise<void> {
  await setDoc(getAppSettingsRef(), partial, { merge: true })
}
