import type { Firestore } from 'firebase-admin/firestore'

const MAX_CHALLENGE_DISTANCE = 4
const TZ = 'Europe/Stockholm'

function formatTime(date: Date): string {
  return date.toLocaleTimeString('sv-SE', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: TZ,
  })
}

function formatDate(date: Date, opts?: Intl.DateTimeFormatOptions): string {
  return date.toLocaleDateString('sv-SE', { timeZone: TZ, ...opts })
}

interface ToolResult {
  success: boolean
  data?: unknown
  error?: string
}

export async function executeReadTool(
  db: Firestore,
  uid: string,
  toolName: string,
  args: Record<string, unknown>
): Promise<ToolResult> {
  switch (toolName) {
    case 'list_available_times':
      return listAvailableTimes(db, args.date as string)
    case 'list_my_bookings':
      return listMyBookings(db, uid)
    case 'list_ladder_opponents':
      return listLadderOpponents(db, uid)
    default:
      return { success: false, error: `Okänt verktyg: ${toolName}` }
  }
}

async function listAvailableTimes(
  db: Firestore,
  dateStr: string
): Promise<ToolResult> {
  // Parse date as Swedish local time by using timezone-aware formatting
  // We construct dates assuming CET/CEST and let the query handle UTC conversion
  const date = new Date(dateStr + 'T12:00:00')
  if (isNaN(date.getTime())) {
    return { success: false, error: 'Ogiltigt datum.' }
  }

  // Get the UTC offset for Stockholm on this date
  const sampleDate = new Date(`${dateStr}T12:00:00Z`)
  const stockholmTime = new Date(
    sampleDate.toLocaleString('en-US', { timeZone: TZ })
  )
  const offsetMs = sampleDate.getTime() - stockholmTime.getTime()

  const dayStart = new Date(`${dateStr}T07:00:00Z`)
  dayStart.setTime(dayStart.getTime() + offsetMs)
  const dayEnd = new Date(`${dateStr}T22:00:00Z`)
  dayEnd.setTime(dayEnd.getTime() + offsetMs)

  const snapshot = await db
    .collection('bookings')
    .where('startTime', '>=', dayStart)
    .where('startTime', '<', dayEnd)
    .orderBy('startTime', 'asc')
    .get()

  const bookedSlots = snapshot.docs.map((doc) => {
    const data = doc.data()
    return {
      start: formatTime(
        (data.startTime as FirebaseFirestore.Timestamp).toDate()
      ),
      end: formatTime((data.endTime as FirebaseFirestore.Timestamp).toDate()),
    }
  })

  // Calculate free slots between 07:00 and 22:00
  const freeSlots: { start: string; end: string }[] = []
  const bookings = snapshot.docs.map((doc) => {
    const data = doc.data()
    return {
      start: (data.startTime as FirebaseFirestore.Timestamp).toDate(),
      end: (data.endTime as FirebaseFirestore.Timestamp).toDate(),
    }
  })

  // Sort by start time
  bookings.sort((a, b) => a.start.getTime() - b.start.getTime())

  let cursor = new Date(dayStart)
  for (const booking of bookings) {
    if (cursor < booking.start) {
      freeSlots.push({
        start: formatTime(cursor),
        end: formatTime(booking.start),
      })
    }
    if (booking.end > cursor) {
      cursor = new Date(booking.end)
    }
  }
  if (cursor < dayEnd) {
    freeSlots.push({
      start: formatTime(cursor),
      end: formatTime(dayEnd),
    })
  }

  const weekday = formatDate(date, { weekday: 'long' })

  return {
    success: true,
    data: {
      date: dateStr,
      weekday,
      bookedSlots,
      freeSlots,
      message:
        freeSlots.length === 0
          ? 'Inga lediga tider denna dag.'
          : `${freeSlots.length} lediga tidsintervall.`,
    },
  }
}

async function listMyBookings(db: Firestore, uid: string): Promise<ToolResult> {
  const now = new Date()

  // Query upcoming bookings first, then filter by owner in code
  // (avoids needing a composite index on ownerUid + startTime)
  const snapshot = await db
    .collection('bookings')
    .where('startTime', '>=', now)
    .orderBy('startTime', 'asc')
    .get()

  const bookings = snapshot.docs
    .filter((doc) => doc.data().ownerUid === uid)
    .map((doc) => {
      const data = doc.data()
      const start = (data.startTime as FirebaseFirestore.Timestamp).toDate()
      const end = (data.endTime as FirebaseFirestore.Timestamp).toDate()

      return {
        id: doc.id,
        date: formatDate(start, {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
        }),
        startTime: formatTime(start),
        endTime: formatTime(end),
        type: data.type,
        isLadderMatch: !!data.ladderId,
        opponent: data.playerBId
          ? data.playerAId === uid
            ? data.playerBName
            : data.playerAName
          : null,
      }
    })

  return {
    success: true,
    data: {
      bookings,
      message:
        bookings.length === 0
          ? 'Du har inga kommande bokningar.'
          : `Du har ${bookings.length} kommande bokning${bookings.length > 1 ? 'ar' : ''}.`,
    },
  }
}

async function listLadderOpponents(
  db: Firestore,
  uid: string
): Promise<ToolResult> {
  // Find active ladder
  const ladderSnapshot = await db
    .collection('ladders')
    .where('status', '==', 'active')
    .limit(1)
    .get()

  if (ladderSnapshot.empty) {
    return {
      success: true,
      data: {
        participants: [],
        message: 'Det finns ingen aktiv stege just nu.',
      },
    }
  }

  const ladderDoc = ladderSnapshot.docs[0]
  const ladder = ladderDoc.data()
  const participants = (ladder.participants ?? []) as Array<{
    uid: string
    displayName: string
    position: number
    wins: number
    losses: number
    paused: boolean
  }>

  const challenger = participants.find((p) => p.uid === uid)

  if (!challenger) {
    return {
      success: true,
      data: {
        participants: [],
        message: 'Du är inte med i stegen. Gå med i stegen först.',
        ladderName: ladder.name,
      },
    }
  }

  if (challenger.paused) {
    return {
      success: true,
      data: {
        participants: [],
        message:
          'Du är pausad i stegen och kan inte utmana någon just nu. Återaktivera dig först.',
        yourPosition: challenger.position,
      },
    }
  }

  const eligible = participants
    .filter((p) => {
      if (p.uid === uid) return false
      if (p.paused) return false
      if (challenger.position <= p.position) return false // can only challenge higher-ranked
      if (challenger.position - p.position > MAX_CHALLENGE_DISTANCE)
        return false
      return true
    })
    .sort((a, b) => a.position - b.position)
    .map((p) => ({
      uid: p.uid,
      displayName: p.displayName,
      position: p.position,
      stats: `${p.wins}V ${p.losses}F`,
    }))

  return {
    success: true,
    data: {
      yourPosition: challenger.position,
      opponents: eligible,
      ladderId: ladderDoc.id,
      message:
        eligible.length === 0
          ? 'Det finns inga spelare du kan utmana just nu.'
          : `Du kan utmana ${eligible.length} spelare.`,
    },
  }
}
