import {
  collection,
  getDocs,
  doc,
  updateDoc,
  query,
  orderBy,
} from 'firebase/firestore'
import { db } from '../lib/firebase'
import type { UserProfile, UserRole } from './AuthService'

export const USERS_QUERY_KEY = ['users'] as const

// Fetches all documents from the users collection, ordered by displayName.
export async function listAllUsers(): Promise<UserProfile[]> {
  const ref = collection(db, 'users')
  const q = query(ref, orderBy('displayName'))
  const snap = await getDocs(q)
  return snap.docs.map((d) => {
    const data = d.data()
    return {
      uid: d.id,
      email: data.email as string,
      displayName: data.displayName as string,
      phone: (data.phone as string | null) ?? null,
      createdAt: data.createdAt,
      role: ((data.role as UserRole | undefined) ?? 'user') as UserRole,
    }
  })
}

// Updates the role field on users/{targetUid}.
// Throws if callerUid === targetUid (self-role-change is not allowed).
export async function updateUserRole(
  callerUid: string,
  targetUid: string,
  newRole: UserRole
): Promise<void> {
  if (callerUid === targetUid) {
    throw new Error('Du kan inte ändra din egen roll.')
  }
  const ref = doc(db, 'users', targetUid)
  await updateDoc(ref, { role: newRole })
}
