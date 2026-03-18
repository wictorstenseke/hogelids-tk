import {
  collection,
  getDocs,
  query,
  where,
  writeBatch,
} from 'firebase/firestore'
import { db } from '../lib/firebase'

// Finds all guest bookings with ownerEmail === email and reassigns them to the member:
// - sets type: 'member'
// - sets ownerUid: uid
// Called silently on sign-up. Errors do not crash the sign-up flow.
export async function migrateGuestBookings(
  uid: string,
  email: string
): Promise<void> {
  try {
    const bookingsRef = collection(db, 'bookings')
    const q = query(
      bookingsRef,
      where('type', '==', 'guest'),
      where('ownerEmail', '==', email)
    )
    const snapshot = await getDocs(q)

    if (snapshot.empty) return

    const batch = writeBatch(db)
    for (const document of snapshot.docs) {
      batch.update(document.ref, { type: 'member', ownerUid: uid })
    }
    await batch.commit()
  } catch (err) {
    console.error('migrateGuestBookings failed:', err)
  }
}
