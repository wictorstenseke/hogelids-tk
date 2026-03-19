import { doc, setDoc, FieldValue } from 'firebase/firestore'
import { db } from '../lib/firebase'

export interface AppSettings {
  bookingEnabled: boolean
  ladderEnabled: boolean
  bannerVisible: boolean
  bannerText: string
  bannerLinkText?: string
  bannerLinkUrl?: string
}

// Writable partial that allows FieldValue sentinels (e.g. deleteField()) for
// optional string fields so callers can clear them from Firestore.
export type AppSettingsUpdate = Partial<
  Omit<AppSettings, 'bannerLinkText' | 'bannerLinkUrl'>
> & {
  bannerLinkText?: string | FieldValue
  bannerLinkUrl?: string | FieldValue
}

export const APP_SETTINGS_DEFAULTS: AppSettings = {
  bookingEnabled: true,
  ladderEnabled: true,
  bannerVisible: false,
  bannerText: '',
}

// Returns the Firestore DocumentReference for the app settings document.
export function getAppSettingsRef() {
  return doc(db, 'settings', 'app')
}

// Writes a partial update to settings/app. Creates the document if it doesn't exist.
// Pass deleteField() for bannerLinkText/bannerLinkUrl to remove those fields.
export async function updateAppSettings(
  partial: AppSettingsUpdate
): Promise<void> {
  await setDoc(getAppSettingsRef(), partial, { merge: true })
}
