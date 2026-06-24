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
// - sets ownerDisplayName: displayName (guest bookings stored the email here, so
//   without this the booking list would keep showing the email after migration)
// Called silently on sign-up/sign-in. Errors do not crash the auth flow.
export async function migrateGuestBookings(
  uid: string,
  email: string,
  displayName: string
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
      batch.update(document.ref, {
        type: 'member',
        ownerUid: uid,
        ownerDisplayName: displayName,
      })
    }
    await batch.commit()
  } catch (err) {
    console.error('migrateGuestBookings failed:', err)
  }
}
