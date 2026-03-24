import {
  doc,
  getDoc,
  setDoc,
  FieldValue,
  type Timestamp,
} from 'firebase/firestore'
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

export const APP_SETTINGS_QUERY_KEY = ['settings', 'app'] as const

// Reads the settings/app document once. Returns defaults if the document doesn't exist.
export async function getAppSettings(): Promise<AppSettings> {
  const snap = await getDoc(getAppSettingsRef())
  if (!snap.exists()) return { ...APP_SETTINGS_DEFAULTS }
  const data = snap.data()
  return {
    bookingEnabled: data.bookingEnabled ?? APP_SETTINGS_DEFAULTS.bookingEnabled,
    ladderEnabled: data.ladderEnabled ?? APP_SETTINGS_DEFAULTS.ladderEnabled,
    ladderJoinOpensAt:
      data['ladderJoinOpensAt'] != null
        ? (data['ladderJoinOpensAt'] as Timestamp)
        : null,
    bannerVisible: data.bannerVisible ?? APP_SETTINGS_DEFAULTS.bannerVisible,
    bannerText: data.bannerText ?? APP_SETTINGS_DEFAULTS.bannerText,
    bannerLinkText: data.bannerLinkText,
    bannerLinkUrl: data.bannerLinkUrl,
  }
}

// Writes a partial update to settings/app. Creates the document if it doesn't exist.
// Pass deleteField() for bannerLinkText/bannerLinkUrl/ladderJoinOpensAt to remove those fields.
export async function updateAppSettings(
  partial: AppSettingsUpdate
): Promise<void> {
  await setDoc(getAppSettingsRef(), partial, { merge: true })
}
