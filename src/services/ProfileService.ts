import { doc, getDoc, updateDoc } from 'firebase/firestore'
import { db } from '../lib/firebase'
import type { UserProfile } from './AuthService'

// Fetches the users/{uid} document. Returns null if the doc doesn't exist.
export async function getProfile(uid: string): Promise<UserProfile | null> {
  const ref = doc(db, 'users', uid)
  const snap = await getDoc(ref)
  if (!snap.exists()) return null
  const data = snap.data()
  return {
    uid: snap.id,
    email: data.email as string,
    displayName: data.displayName as string,
    phone: (data.phone as string | null) ?? null,
    createdAt: data.createdAt,
  }
}

// Updates editable fields on the users/{uid} document.
export async function updateProfile(
  uid: string,
  updates: { displayName?: string; phone?: string | null }
): Promise<void> {
  const ref = doc(db, 'users', uid)
  await updateDoc(ref, updates as Record<string, unknown>)
}
