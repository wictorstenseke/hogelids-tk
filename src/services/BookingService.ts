import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
  addDoc,
  deleteDoc,
  doc,
  type QueryDocumentSnapshot,
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
  // Only present on ladder match bookings
  ladderId?: string
  playerAId?: string
  playerBId?: string
  playerAName?: string
  playerBName?: string
}

export const BOOKINGS_QUERY_KEY = ['bookings', 'upcoming'] as const

export function findConflictingBooking(
  bookings: BookingWithId[],
  start: Date,
  end: Date
): BookingWithId | null {
  return (
    bookings.find((booking) => {
      const existingStart = booking.startTime.toDate().getTime()
      const existingEnd = booking.endTime.toDate().getTime()
      const newStart = start.getTime()
      const newEnd = end.getTime()
      return existingStart < newEnd && newStart < existingEnd
    }) ?? null
  )
}

export function hasConflict(
  bookings: BookingWithId[],
  start: Date,
  end: Date
): boolean {
  return findConflictingBooking(bookings, start, end) !== null
}

export function mapBookingSnapshot(
  docSnap: QueryDocumentSnapshot
): BookingWithId {
  const data = docSnap.data()
  return {
    id: docSnap.id,
    type: data['type'] as 'guest' | 'member',
    ownerEmail: data['ownerEmail'] as string,
    ownerUid: data['ownerUid'] as string | null,
    ownerDisplayName: data['ownerDisplayName'] as string,
    startTime: data['startTime'] as Timestamp,
    endTime: data['endTime'] as Timestamp,
    createdAt: data['createdAt'] as Timestamp,
    ...(data['ladderId']
      ? {
          ladderId: data['ladderId'] as string,
          playerAId: data['playerAId'] as string,
          playerBId: data['playerBId'] as string,
          playerAName: data['playerAName'] as string,
          playerBName: data['playerBName'] as string,
        }
      : {}),
  }
}

export async function createGuestBooking(
  ownerEmail: string,
  ownerDisplayName: string,
  startTime: Date,
  endTime: Date
): Promise<string> {
  const bookingsRef = collection(db, 'bookings')
  const docRef = await addDoc(bookingsRef, {
    type: 'guest',
    ownerEmail,
    ownerUid: null,
    ownerDisplayName,
    startTime: Timestamp.fromDate(startTime),
    endTime: Timestamp.fromDate(endTime),
    createdAt: Timestamp.fromDate(new Date()),
  })
  return docRef.id
}

export async function deleteGuestBooking(id: string): Promise<void> {
  await deleteDoc(doc(db, 'bookings', id))
}

export async function createMemberBooking(
  uid: string,
  ownerEmail: string,
  ownerDisplayName: string,
  startTime: Date,
  endTime: Date
): Promise<string> {
  const bookingsRef = collection(db, 'bookings')
  const docRef = await addDoc(bookingsRef, {
    type: 'member',
    ownerEmail,
    ownerUid: uid,
    ownerDisplayName,
    startTime: Timestamp.fromDate(startTime),
    endTime: Timestamp.fromDate(endTime),
    createdAt: Timestamp.fromDate(new Date()),
  })
  return docRef.id
}

export async function deleteMemberBooking(id: string): Promise<void> {
  await deleteDoc(doc(db, 'bookings', id))
}

export async function getBookingsByYear(
  year: number
): Promise<BookingWithId[]> {
  const bookingsRef = collection(db, 'bookings')
  const start = Timestamp.fromDate(new Date(year, 0, 1))
  const yearEnd = new Date(year + 1, 0, 1)
  const end = Timestamp.fromDate(yearEnd < new Date() ? yearEnd : new Date())
  const q = query(
    bookingsRef,
    where('endTime', '>=', start),
    where('endTime', '<', end),
    orderBy('endTime', 'asc')
  )
  const snapshot = await getDocs(q)
  return snapshot.docs.map(mapBookingSnapshot)
}

export async function getEarliestBookingYear(): Promise<number> {
  const bookingsRef = collection(db, 'bookings')
  const q = query(bookingsRef, orderBy('endTime', 'asc'), limit(1))
  const snapshot = await getDocs(q)
  if (snapshot.empty) {
    return new Date().getFullYear()
  }
  const data = snapshot.docs[0].data()
  const endTime = data['endTime'] as Timestamp
  return endTime.toDate().getFullYear()
}

export async function getAllBookings(): Promise<BookingWithId[]> {
  const bookingsRef = collection(db, 'bookings')
  const now = Timestamp.fromDate(new Date())
  const q = query(
    bookingsRef,
    where('endTime', '<', now),
    orderBy('endTime', 'asc')
  )
  const snapshot = await getDocs(q)
  return snapshot.docs.map(mapBookingSnapshot)
}

export async function getUpcomingBookings(): Promise<BookingWithId[]> {
  const bookingsRef = collection(db, 'bookings')
  const now = Timestamp.fromDate(new Date())
  const q = query(
    bookingsRef,
    where('startTime', '>=', now),
    orderBy('startTime', 'asc')
  )
  const snapshot = await getDocs(q)
  return snapshot.docs.map(mapBookingSnapshot)
}

export function isOwnBooking(
  booking: BookingWithId,
  user: { uid: string } | null,
  guestEmail: string | null
): boolean {
  if (guestEmail && booking.ownerEmail === guestEmail) return true
  if (!user) return false
  return (
    booking.type === 'member' &&
    (user.uid === booking.ownerUid ||
      user.uid === booking.playerAId ||
      user.uid === booking.playerBId)
  )
}

export function canDeleteBooking(
  booking: BookingWithId,
  user: { uid: string } | null
): boolean {
  if (booking.type === 'guest') return true
  if (!user) return false
  return (
    user.uid === booking.ownerUid ||
    user.uid === booking.playerAId ||
    user.uid === booking.playerBId
  )
}
