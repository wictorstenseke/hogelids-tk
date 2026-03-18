import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  updateProfile,
} from 'firebase/auth'
import { setDoc, doc, Timestamp } from 'firebase/firestore'
import { auth, db } from '../lib/firebase'
import { migrateGuestBookings } from './MigrationService'

export interface UserProfile {
  uid: string
  email: string
  displayName: string
  phone: string | null
  createdAt: Timestamp
}

// Creates Firebase Auth user, writes users/{uid} doc, migrates guest bookings
export async function signUp(
  email: string,
  password: string,
  displayName: string
): Promise<void> {
  const credential = await createUserWithEmailAndPassword(auth, email, password)
  const user = credential.user

  await updateProfile(user, { displayName })
  await setDoc(doc(db, 'users', user.uid), {
    email,
    displayName,
    phone: null,
    createdAt: Timestamp.now(),
  } satisfies Omit<UserProfile, 'uid'>)
  await migrateGuestBookings(user.uid, email)
}

// Signs in with email/password (persistent session — Firebase default)
export async function signIn(email: string, password: string): Promise<void> {
  await signInWithEmailAndPassword(auth, email, password)
}

// Signs out
export async function signOut(): Promise<void> {
  await firebaseSignOut(auth)
}

// Sends password reset email
export async function sendPasswordReset(email: string): Promise<void> {
  await sendPasswordResetEmail(auth, email)
}
