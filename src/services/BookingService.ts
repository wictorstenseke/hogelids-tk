import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
  Timestamp,
} from 'firebase/firestore'
import { db } from '../lib/firebase'

export interface Booking {
  type: 'guest' | 'member'
  ownerEmail: string
  ownerUid: string | null
  ownerDisplayName: string
  startTime: Timestamp
  endTime: Timestamp
  createdAt: Timestamp
}

export interface BookingWithId extends Booking {
  id: string
}

export const BOOKINGS_QUERY_KEY = ['bookings', 'upcoming'] as const

export async function getUpcomingBookings(): Promise<BookingWithId[]> {
  const bookingsRef = collection(db, 'bookings')
  const now = Timestamp.fromDate(new Date())
  const q = query(
    bookingsRef,
    where('startTime', '>=', now),
    orderBy('startTime', 'asc')
  )
  const snapshot = await getDocs(q)
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...(doc.data() as Booking),
  }))
}
