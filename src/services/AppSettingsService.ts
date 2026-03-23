import { doc, setDoc, FieldValue, type Timestamp } from 'firebase/firestore'
import { db } from '../lib/firebase'

export interface AppSettings {
  bookingEnabled: boolean
  ladderEnabled: boolean
  /** Start of the chosen calendar day (local) when new sign-ups are allowed; null = no restriction. */
  ladderJoinOpensAt: Timestamp | null
  bannerVisible: boolean
  bannerText: string
  bannerLinkText?: string
  bannerLinkUrl?: string
}

// Writable partial that allows FieldValue sentinels (e.g. deleteField()) for
// optional fields so callers can clear them from Firestore.
export type AppSettingsUpdate = Partial<
  Omit<AppSettings, 'bannerLinkText' | 'bannerLinkUrl' | 'ladderJoinOpensAt'>
> & {
  bannerLinkText?: string | FieldValue
  bannerLinkUrl?: string | FieldValue
  ladderJoinOpensAt?: Timestamp | FieldValue
}

export const APP_SETTINGS_DEFAULTS: AppSettings = {
  bookingEnabled: true,
  ladderEnabled: true,
  ladderJoinOpensAt: null,
  bannerVisible: false,
  bannerText: '',
}

// Returns the Firestore DocumentReference for the app settings document.
export function getAppSettingsRef() {
  return doc(db, 'settings', 'app')
}

// Writes a partial update to settings/app. Creates the document if it doesn't exist.
// Pass deleteField() for bannerLinkText/bannerLinkUrl/ladderJoinOpensAt to remove those fields.
export async function updateAppSettings(
  partial: AppSettingsUpdate
): Promise<void> {
  await setDoc(getAppSettingsRef(), partial, { merge: true })
}
