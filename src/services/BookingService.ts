import {
  collection,
  getDocs,
  getDoc,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
  doc,
  runTransaction,
  writeBatch,
  deleteField,
  type QueryDocumentSnapshot,
} from 'firebase/firestore'
import { db } from '../lib/firebase'

export interface BookingSlotLock {
  date: string
  slots: string[]
}

export interface Booking {
  type: 'guest' | 'member'
  ownerEmail: string
  ownerUid: string | null
  ownerDisplayName: string
  startTime: Timestamp
  endTime: Timestamp
  createdAt: Timestamp
  slotLocks?: BookingSlotLock[]
  // Only present on member bookings where the owner picked a known opponent
  opponentUid?: string
  opponentDisplayName?: string
}

export interface BookingWithId extends Booking {
  id: string
  // Only present on ladder match bookings
  ladderId?: string
  playerAId?: string
  playerBId?: string
  playerAName?: string
  playerBName?: string
  ladderStatus?: 'planned' | 'completed'
  winnerId?: string | null
  ladderComment?: string | null
}

export const BOOKINGS_QUERY_KEY = ['bookings', 'upcoming'] as const

const SLOT_MINUTES = 15
const DISPLAY_WINDOW_DAYS = 370
const CONFLICT_LOOKAHEAD_DAYS = 2

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000)
}

function padTwo(n: number): string {
  return String(n).padStart(2, '0')
}

function localDateKey(date: Date): string {
  return `${date.getFullYear()}-${padTwo(date.getMonth() + 1)}-${padTwo(date.getDate())}`
}

function localSlotKey(date: Date): string {
  return `${padTwo(date.getHours())}:${padTwo(date.getMinutes())}`
}

function floorToSlot(date: Date): Date {
  const next = new Date(date)
  next.setSeconds(0, 0)
  const minutes = next.getMinutes()
  next.setMinutes(minutes - (minutes % SLOT_MINUTES))
  return next
}

function createBookingId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `booking-${crypto.randomUUID()}`
  }
  return `booking-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

export function buildSlotLocks(
  startTime: Date,
  endTime: Date
): BookingSlotLock[] {
  const locksByDate = new Map<string, string[]>()
  let cursor = floorToSlot(startTime)
  while (cursor < endTime) {
    const date = localDateKey(cursor)
    const slots = locksByDate.get(date) ?? []
    slots.push(localSlotKey(cursor))
    locksByDate.set(date, slots)
    cursor = new Date(cursor.getTime() + SLOT_MINUTES * 60 * 1000)
  }
  return Array.from(locksByDate.entries()).map(([date, slots]) => ({
    date,
    slots,
  }))
}

export function findConflictingBooking(
  bookings: BookingWithId[],
  start: Date,
  end: Date
): BookingWithId | null {
  return (
    bookings.find((booking) => {
      if (isCompletedLadderBooking(booking)) return false
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

function isCompletedLadderBooking(booking: BookingWithId): boolean {
  return isCompletedLadderBookingData(booking)
}

function isCompletedLadderBookingData(data: {
  ladderId?: unknown
  ladderStatus?: unknown
}): boolean {
  return data.ladderId != null && data.ladderStatus === 'completed'
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
    slotLocks: (data['slotLocks'] ?? undefined) as
      | BookingSlotLock[]
      | undefined,
    ...(data['ladderId']
      ? {
          ladderId: data['ladderId'] as string,
          playerAId: data['playerAId'] as string,
          playerBId: data['playerBId'] as string,
          playerAName: data['playerAName'] as string,
          playerBName: data['playerBName'] as string,
          ladderStatus: (data['ladderStatus'] ?? 'planned') as
            | 'planned'
            | 'completed',
          winnerId: (data['winnerId'] ?? null) as string | null,
          ladderComment: (data['ladderComment'] ?? null) as string | null,
        }
      : {}),
    ...(data['opponentUid']
      ? {
          opponentUid: data['opponentUid'] as string,
          opponentDisplayName: data['opponentDisplayName'] as string,
        }
      : {}),
  }
}

export async function getBookingsOverlapping(
  startTime: Date,
  endTime: Date
): Promise<BookingWithId[]> {
  const bookingsRef = collection(db, 'bookings')
  const q = query(
    bookingsRef,
    where('endTime', '>', Timestamp.fromDate(startTime)),
    where(
      'endTime',
      '<',
      Timestamp.fromDate(addDays(endTime, CONFLICT_LOOKAHEAD_DAYS))
    ),
    orderBy('endTime', 'asc')
  )
  const snapshot = await getDocs(q)
  return snapshot.docs
    .map(mapBookingSnapshot)
    .filter((booking) => booking.startTime.toDate() < endTime)
}

export async function assertNoBookingConflict(
  startTime: Date,
  endTime: Date
): Promise<void> {
  const conflicts = await getBookingsOverlapping(startTime, endTime)
  const conflict = findConflictingBooking(conflicts, startTime, endTime)
  if (conflict) {
    throw new Error('Det finns redan en bokning som överlappar med vald tid.')
  }
}

type CreateBookingInput = Omit<Booking, 'createdAt' | 'slotLocks'> &
  Record<string, unknown>

export async function createBookingWithLocks(
  booking: CreateBookingInput
): Promise<string> {
  await assertNoBookingConflict(
    booking.startTime.toDate(),
    booking.endTime.toDate()
  )

  const bookingId = createBookingId()
  const bookingRef = doc(db, 'bookings', bookingId)
  const slotLocks = buildSlotLocks(
    booking.startTime.toDate(),
    booking.endTime.toDate()
  )
  const slotDayRefs = slotLocks.map((lock) => ({
    lock,
    ref: doc(db, 'bookingSlotDays', lock.date),
  }))

  await runTransaction(db, async (transaction) => {
    const snapshots = await Promise.all(
      slotDayRefs.map(({ ref }) => transaction.get(ref))
    )

    const lockedBookingIds = new Set<string>()
    snapshots.forEach((snapshot, i) => {
      const existingSlots = snapshot.exists()
        ? ((snapshot.data().slots ?? {}) as Record<string, string>)
        : {}
      for (const slot of slotDayRefs[i].lock.slots) {
        const existingBookingId = existingSlots[slot]
        if (existingBookingId) {
          lockedBookingIds.add(existingBookingId)
        }
      }
    })

    const lockedBookingSnapshots = await Promise.all(
      [...lockedBookingIds].map((bookingId) =>
        transaction.get(doc(db, 'bookings', bookingId))
      )
    )
    const blockingLock = lockedBookingSnapshots.some(
      (snapshot) =>
        snapshot.exists() && !isCompletedLadderBookingData(snapshot.data())
    )
    if (blockingLock) {
      throw new Error('Det finns redan en bokning som överlappar med vald tid.')
    }

    transaction.set(bookingRef, {
      ...booking,
      createdAt: Timestamp.fromDate(new Date()),
      slotLocks,
    })

    for (const { lock, ref } of slotDayRefs) {
      const slots = Object.fromEntries(
        lock.slots.map((slot) => [slot, bookingId])
      )
      transaction.set(ref, { slots }, { merge: true })
    }
  })

  return bookingId
}

export async function createGuestBooking(
  ownerEmail: string,
  ownerDisplayName: string,
  startTime: Date,
  endTime: Date
): Promise<string> {
  return createBookingWithLocks({
    type: 'guest',
    ownerEmail,
    ownerUid: null,
    ownerDisplayName,
    startTime: Timestamp.fromDate(startTime),
    endTime: Timestamp.fromDate(endTime),
  })
}

export async function deleteGuestBooking(id: string): Promise<void> {
  await deleteBookingAndSlotLocks(id)
}

export async function createMemberBooking(
  uid: string,
  ownerEmail: string,
  ownerDisplayName: string,
  startTime: Date,
  endTime: Date,
  opponent?: { uid: string; displayName: string }
): Promise<string> {
  return createBookingWithLocks({
    type: 'member',
    ownerEmail,
    ownerUid: uid,
    ownerDisplayName,
    startTime: Timestamp.fromDate(startTime),
    endTime: Timestamp.fromDate(endTime),
    ...(opponent
      ? {
          opponentUid: opponent.uid,
          opponentDisplayName: opponent.displayName,
        }
      : {}),
  })
}

export async function deleteMemberBooking(id: string): Promise<void> {
  await deleteBookingAndSlotLocks(id)
}

async function deleteBookingAndSlotLocks(id: string): Promise<void> {
  const bookingRef = doc(db, 'bookings', id)
  const snapshot = await getDoc(bookingRef)
  const batch = writeBatch(db)
  batch.delete(bookingRef)

  if (snapshot.exists()) {
    const data = snapshot.data()
    const slotLocks = (data['slotLocks'] ?? []) as BookingSlotLock[]
    for (const lock of slotLocks) {
      const dayRef = doc(db, 'bookingSlotDays', lock.date)
      const updates = Object.fromEntries(
        lock.slots.map((slot) => [`slots.${slot}`, deleteField()])
      )
      batch.update(dayRef, updates)
    }
  }

  await batch.commit()
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

export async function getUpcomingBookings(): Promise<BookingWithId[]> {
  const bookingsRef = collection(db, 'bookings')
  const now = Timestamp.fromDate(new Date())
  const windowEnd = Timestamp.fromDate(addDays(new Date(), DISPLAY_WINDOW_DAYS))
  const q = query(
    bookingsRef,
    where('endTime', '>=', now),
    where('endTime', '<', windowEnd),
    orderBy('endTime', 'asc')
  )
  const snapshot = await getDocs(q)
  return snapshot.docs
    .map(mapBookingSnapshot)
    .filter((booking) => !isCompletedLadderBooking(booking))
    .sort((a, b) => a.startTime.toMillis() - b.startTime.toMillis())
}

export function isOwnBooking(
  booking: BookingWithId,
  user: { uid: string } | null,
  guestEmail: string | null
): boolean {
  if (guestEmail && !user && booking.ownerEmail === guestEmail) return true
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
  if (booking.type === 'guest') return true // anyone can delete guest bookings
  if (!user) return false // only members reach here
  return (
    user.uid === booking.ownerUid ||
    user.uid === booking.playerAId ||
    user.uid === booking.playerBId
  )
}
