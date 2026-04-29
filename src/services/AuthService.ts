import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  updateProfile,
  reload,
} from 'firebase/auth'
import { setDoc, doc, Timestamp } from 'firebase/firestore'
import { auth, db } from '../lib/firebase'
import { migrateGuestBookings } from './MigrationService'

export type UserRole = 'user' | 'admin' | 'superuser'

// Returns true for roles that grant access to admin features.
export function isAdminRole(role: UserRole | null): boolean {
  return role === 'admin' || role === 'superuser'
}

export interface UserProfile {
  uid: string
  email: string
  displayName: string
  phone: string | null
  createdAt: Timestamp
  role: UserRole
}

// Creates Firebase Auth user, writes users/{uid} doc, migrates guest bookings
export async function signUp(
  email: string,
  password: string,
  displayName: string,
  phone: string | null = null
): Promise<void> {
  const credential = await createUserWithEmailAndPassword(auth, email, password)
  const user = credential.user

  await updateProfile(user, { displayName })
  await reload(user) // force onAuthStateChanged to re-fire with updated displayName
  await setDoc(doc(db, 'users', user.uid), {
    email,
    displayName,
    phone,
    createdAt: Timestamp.now(),
    role: 'user' as UserRole,
  } satisfies Omit<UserProfile, 'uid'>)
  await migrateGuestBookings(user.uid, email)
}

// Signs in with email/password (persistent session — Firebase default).
// Migrates any guest bookings matching this email to the member account.
export async function signIn(email: string, password: string): Promise<void> {
  const credential = await signInWithEmailAndPassword(auth, email, password)
  void migrateGuestBookings(credential.user.uid, email)
}

// Signs out
export async function signOut(): Promise<void> {
  await firebaseSignOut(auth)
}

// Sends password reset email
export async function sendPasswordReset(email: string): Promise<void> {
  await sendPasswordResetEmail(auth, email)
}
