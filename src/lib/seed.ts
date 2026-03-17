import { collection, getDocs, addDoc, Timestamp } from 'firebase/firestore'
import { db } from './firebase'

interface Booking {
  type: 'guest' | 'member'
  ownerEmail: string
  ownerUid: string | null
  ownerDisplayName: string
  startTime: Timestamp
  endTime: Timestamp
  createdAt: Timestamp
}

// Base date: today at midnight (local time)
function dateAt(daysFromNow: number, hour: number): Date {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() + daysFromNow)
  d.setHours(hour, 0, 0, 0)
  return d
}

function toTs(d: Date): Timestamp {
  return Timestamp.fromDate(d)
}

function booking(
  type: 'guest' | 'member',
  ownerEmail: string,
  ownerUid: string | null,
  ownerDisplayName: string,
  daysFromNow: number,
  hour: number
): Booking {
  const start = dateAt(daysFromNow, hour)
  const end = new Date(start.getTime() + 2 * 60 * 60 * 1000) // +2h
  return {
    type,
    ownerEmail,
    ownerUid,
    ownerDisplayName,
    startTime: toTs(start),
    endTime: toTs(end),
    createdAt: toTs(new Date()),
  }
}

const seedData: Booking[] = [
  // test@example.com — used to test "Your booking" label
  booking('member', 'test@example.com', 'uid_testuser', 'Test User', 1, 10),

  // Swedish members
  booking(
    'member',
    'erik.lindqvist@gmail.com',
    'uid_erik',
    'Erik Lindqvist',
    2,
    9
  ),
  booking(
    'member',
    'anna.bergstrom@gmail.com',
    'uid_anna',
    'Anna Bergström',
    3,
    14
  ),
  booking(
    'member',
    'lars.svensson@gmail.com',
    'uid_lars',
    'Lars Svensson',
    7,
    11
  ),

  // Swedish guests
  booking('guest', 'maja.holmberg@gmail.com', null, 'Maja Holmberg', 4, 16),
  booking('guest', 'oskar.nordgren@hotmail.com', null, 'Oskar Nordgren', 5, 10),

  // More variety across the 2-week window
  booking('member', 'sofia.ek@gmail.com', 'uid_sofia', 'Sofia Ek', 8, 15),
  booking(
    'guest',
    'henrik.johansson@tele2.se',
    null,
    'Henrik Johansson',
    10,
    9
  ),
  booking('member', 'test@example.com', 'uid_testuser', 'Test User', 13, 17),
]

export async function seedBookings(): Promise<void> {
  const bookingsCol = collection(db, 'bookings')
  const snapshot = await getDocs(bookingsCol)

  if (!snapshot.empty) {
    console.log(
      `[seed] Bookings collection already has ${snapshot.size} document(s). Skipping seed.`
    )
    return
  }

  console.log('[seed] Seeding bookings...')
  for (const b of seedData) {
    await addDoc(bookingsCol, b)
  }
  console.log(`[seed] Done. ${seedData.length} bookings written.`)
}
