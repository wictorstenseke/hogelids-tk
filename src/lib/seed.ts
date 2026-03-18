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

const MEMBERS = [
  {
    email: 'erik.lindqvist@gmail.com',
    uid: 'uid_erik',
    name: 'Erik Lindqvist',
  },
  {
    email: 'anna.bergstrom@gmail.com',
    uid: 'uid_anna',
    name: 'Anna Bergström',
  },
  {
    email: 'lars.svensson@gmail.com',
    uid: 'uid_lars',
    name: 'Lars Svensson',
  },
  { email: 'sofia.ek@gmail.com', uid: 'uid_sofia', name: 'Sofia Ek' },
  {
    email: 'henrik.johansson@tele2.se',
    uid: 'uid_henrik',
    name: 'Henrik Johansson',
  },
  { email: 'maja.holmberg@gmail.com', uid: 'uid_maja', name: 'Maja Holmberg' },
  {
    email: 'oskar.nordgren@hotmail.com',
    uid: 'uid_oskar',
    name: 'Oskar Nordgren',
  },
]

const HOURS = [8, 9, 10, 11, 13, 14, 15, 16, 17]

function bookingOnDate(
  date: Date,
  hour: number,
  member: (typeof MEMBERS)[0],
  isGuest = false
): Booking {
  const start = new Date(date)
  start.setHours(hour, 0, 0, 0)
  const end = new Date(start.getTime() + 2 * 60 * 60 * 1000)
  return {
    type: isGuest ? 'guest' : 'member',
    ownerEmail: member.email,
    ownerUid: isGuest ? null : member.uid,
    ownerDisplayName: member.name,
    startTime: toTs(start),
    endTime: toTs(end),
    createdAt: toTs(new Date(date)),
  }
}

export async function seedHistoricalBookings(): Promise<void> {
  const bookingsCol = collection(db, 'bookings')
  const bookings: Booking[] = []
  const currentYear = new Date().getFullYear()

  for (let year = 2014; year < currentYear; year++) {
    // 5-8 bookings per year spread across spring/summer/autumn
    const months = [3, 4, 5, 6, 7, 8, 9] // April–October (tennis season)
    const count = 5 + (year % 4) // 5-8 bookings
    const used = new Set<string>()

    for (let i = 0; i < count; i++) {
      const month = months[i % months.length]
      const day = 5 + i * 13 // spread across the month
      const date = new Date(year, month, Math.min(day, 28))
      const hour = HOURS[(i + year) % HOURS.length]
      const member = MEMBERS[(i + year) % MEMBERS.length]
      const dateKey = `${date.toDateString()}-${hour}`
      if (used.has(dateKey)) continue
      used.add(dateKey)
      bookings.push(bookingOnDate(date, hour, member, i % 5 === 0))
    }
  }

  console.log(`[seed] Writing ${bookings.length} historical bookings...`)
  for (const b of bookings) {
    await addDoc(bookingsCol, b)
  }
  console.log('[seed] Historical seed done.')
}

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
