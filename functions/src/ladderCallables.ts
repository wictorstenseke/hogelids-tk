import { getFirestore, Timestamp } from 'firebase-admin/firestore'
import {
  HttpsError,
  onCall,
  type CallableRequest,
} from 'firebase-functions/v2/https'
import {
  buildLadderMatchDraft,
  completeLadderMatch,
  joinParticipant,
  pauseParticipant,
  type LadderMatchDraft,
  type LadderParticipant,
  type UserSnapshot,
} from './ladderDomain'

const REGION = 'europe-west1'
const SLOT_MINUTES = 15
const CONFLICT_LOOKAHEAD_DAYS = 2
const STOCKHOLM_TIME_ZONE = 'Europe/Stockholm'

interface UserSnapshotWithRole extends UserSnapshot {
  role: string
}

interface BookingSlotLock {
  date: string
  slots: string[]
}

interface BookingOverlap {
  id: string
  startTime: Date
  endTime: Date
}

function requireAuth(request: CallableRequest): string {
  const uid = request.auth?.uid
  if (!uid) {
    throw new HttpsError('unauthenticated', 'Du måste vara inloggad.')
  }
  return uid
}

function requireString(data: unknown, field: string): string {
  if (!isRecord(data)) {
    throw new HttpsError('invalid-argument', 'Ogiltig begäran.')
  }
  const value = data[field]
  if (typeof value !== 'string' || value.trim() === '') {
    throw new HttpsError('invalid-argument', 'Ogiltig begäran.')
  }
  return value.trim()
}

function optionalString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : null
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object'
}

function timestampMillis(value: unknown): number | null {
  if (
    value !== null &&
    typeof value === 'object' &&
    'toMillis' in value &&
    typeof value.toMillis === 'function'
  ) {
    return value.toMillis()
  }
  return null
}

function timestampDate(value: unknown): Date | null {
  if (
    value !== null &&
    typeof value === 'object' &&
    'toDate' in value &&
    typeof value.toDate === 'function'
  ) {
    return value.toDate()
  }
  return null
}

function parseDateField(data: unknown, field: string): Date {
  const raw = requireString(data, field)
  const parsed = new Date(raw)
  if (Number.isNaN(parsed.getTime())) {
    throw new HttpsError('invalid-argument', 'Ogiltig tid.')
  }
  return parsed
}

function mapHttpsError(error: unknown): HttpsError {
  if (error instanceof HttpsError) return error
  if (error instanceof Error) {
    return new HttpsError('failed-precondition', error.message)
  }
  return new HttpsError('internal', 'Något gick fel.')
}

async function getUserSnapshot(
  uid: string,
  request: CallableRequest
): Promise<UserSnapshotWithRole> {
  const db = getFirestore()
  const userSnap = await db.doc(`users/${uid}`).get()
  const data = userSnap.exists ? (userSnap.data() ?? {}) : {}
  const token = request.auth?.token as Record<string, unknown> | undefined
  const email =
    optionalString(data['email']) ?? optionalString(token?.['email']) ?? ''
  const displayName =
    optionalString(data['displayName']) ??
    optionalString(token?.['name']) ??
    (email || uid)

  return {
    uid,
    email,
    displayName,
    phone:
      data['phone'] === null ? null : (optionalString(data['phone']) ?? null),
    role: optionalString(data['role']) ?? 'user',
  }
}

function isAdmin(user: UserSnapshotWithRole): boolean {
  return user.role === 'admin' || user.role === 'superuser'
}

function parseParticipants(value: unknown): LadderParticipant[] {
  return Array.isArray(value) ? (value as LadderParticipant[]) : []
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000)
}

function floorToSlot(date: Date): Date {
  const next = new Date(date)
  next.setSeconds(0, 0)
  const minutes = next.getMinutes()
  next.setMinutes(minutes - (minutes % SLOT_MINUTES))
  return next
}

function stockholmParts(date: Date): Record<string, string> {
  const formatter = new Intl.DateTimeFormat('sv-SE', {
    timeZone: STOCKHOLM_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  })
  return Object.fromEntries(
    formatter.formatToParts(date).map((part) => [part.type, part.value])
  )
}

function stockholmDateKey(date: Date): string {
  const parts = stockholmParts(date)
  return `${parts.year}-${parts.month}-${parts.day}`
}

function stockholmSlotKey(date: Date): string {
  const parts = stockholmParts(date)
  return `${parts.hour}:${parts.minute}`
}

function buildSlotLocks(startTime: Date, endTime: Date): BookingSlotLock[] {
  const locksByDate = new Map<string, string[]>()
  let cursor = floorToSlot(startTime)
  while (cursor < endTime) {
    const date = stockholmDateKey(cursor)
    const slots = locksByDate.get(date) ?? []
    slots.push(stockholmSlotKey(cursor))
    locksByDate.set(date, slots)
    cursor = new Date(cursor.getTime() + SLOT_MINUTES * 60 * 1000)
  }

  const locks = Array.from(locksByDate.entries()).map(([date, slots]) => ({
    date,
    slots,
  }))
  if (locks.length === 0 || locks.length > 2) {
    throw new Error('Bokningstiden är ogiltig.')
  }
  return locks
}

function findConflictingBooking(
  bookings: BookingOverlap[],
  startTime: Date,
  endTime: Date
): BookingOverlap | null {
  return (
    bookings.find(
      (booking) => booking.startTime < endTime && startTime < booking.endTime
    ) ?? null
  )
}

async function createBookingWithLocks(
  draft: LadderMatchDraft
): Promise<string> {
  const db = getFirestore()
  const bookingRef = db.collection('bookings').doc()
  const slotLocks = buildSlotLocks(draft.startTime, draft.endTime)
  const slotDayRefs = slotLocks.map((lock) => ({
    lock,
    ref: db.doc(`bookingSlotDays/${lock.date}`),
  }))

  await db.runTransaction(async (transaction) => {
    const conflictSnapshot = await transaction.get(
      db
        .collection('bookings')
        .where('endTime', '>', Timestamp.fromDate(draft.startTime))
        .where(
          'endTime',
          '<',
          Timestamp.fromDate(addDays(draft.endTime, CONFLICT_LOOKAHEAD_DAYS))
        )
    )
    const overlaps = conflictSnapshot.docs
      .map((doc) => {
        const data = doc.data()
        const startTime = timestampDate(data['startTime'])
        const endTime = timestampDate(data['endTime'])
        if (!startTime || !endTime) return null
        return { id: doc.id, startTime, endTime }
      })
      .filter((booking): booking is BookingOverlap => booking !== null)
    if (findConflictingBooking(overlaps, draft.startTime, draft.endTime)) {
      throw new Error('Det finns redan en bokning som överlappar med vald tid.')
    }

    const slotSnapshots = await Promise.all(
      slotDayRefs.map(({ ref }) => transaction.get(ref))
    )
    slotSnapshots.forEach((snapshot, index) => {
      const existingSlots = snapshot.exists
        ? ((snapshot.data()?.['slots'] ?? {}) as Record<string, string>)
        : {}
      for (const slot of slotDayRefs[index].lock.slots) {
        if (existingSlots[slot]) {
          throw new Error(
            'Det finns redan en bokning som överlappar med vald tid.'
          )
        }
      }
    })

    transaction.set(bookingRef, {
      ...draft,
      startTime: Timestamp.fromDate(draft.startTime),
      endTime: Timestamp.fromDate(draft.endTime),
      createdAt: Timestamp.now(),
      slotLocks,
    })

    for (const { lock, ref } of slotDayRefs) {
      const slots = Object.fromEntries(
        lock.slots.map((slot) => [slot, bookingRef.id])
      )
      transaction.set(ref, { slots }, { merge: true })
    }
  })

  return bookingRef.id
}

export const joinLadder = onCall({ region: REGION }, async (request) => {
  try {
    const uid = requireAuth(request)
    const ladderId = requireString(request.data, 'ladderId')
    const user = await getUserSnapshot(uid, request)
    const db = getFirestore()

    await db.runTransaction(async (transaction) => {
      const ladderRef = db.doc(`ladders/${ladderId}`)
      const ladderSnap = await transaction.get(ladderRef)
      if (!ladderSnap.exists) {
        throw new HttpsError('not-found', 'Stegen hittades inte.')
      }
      const ladder = ladderSnap.data() ?? {}
      const participants = parseParticipants(ladder['participants'])
      const updated = joinParticipant({
        participants,
        user,
        joinOpensAtMillis: timestampMillis(ladder['joinOpensAt']),
        nowMillis: Date.now(),
      })

      if (updated !== participants) {
        transaction.update(ladderRef, { participants: updated })
      }
    })

    return { ok: true }
  } catch (error) {
    throw mapHttpsError(error)
  }
})

export const pauseLadder = onCall({ region: REGION }, async (request) => {
  try {
    const uid = requireAuth(request)
    const ladderId = requireString(request.data, 'ladderId')
    const db = getFirestore()

    await db.runTransaction(async (transaction) => {
      const ladderRef = db.doc(`ladders/${ladderId}`)
      const ladderSnap = await transaction.get(ladderRef)
      if (!ladderSnap.exists) {
        throw new HttpsError('not-found', 'Stegen hittades inte.')
      }
      const ladder = ladderSnap.data() ?? {}
      transaction.update(ladderRef, {
        participants: pauseParticipant({
          participants: parseParticipants(ladder['participants']),
          uid,
        }),
      })
    })

    return { ok: true }
  } catch (error) {
    throw mapHttpsError(error)
  }
})

export const createLadderMatch = onCall({ region: REGION }, async (request) => {
  try {
    const uid = requireAuth(request)
    const ladderId = requireString(request.data, 'ladderId')
    const opponentUid = requireString(request.data, 'playerBId')
    const startTime = parseDateField(request.data, 'startTime')
    const endTime = parseDateField(request.data, 'endTime')
    const challenger = await getUserSnapshot(uid, request)
    const db = getFirestore()

    const [ladderSnap, settingsSnap] = await Promise.all([
      db.doc(`ladders/${ladderId}`).get(),
      db.doc('settings/app').get(),
    ])

    if (!ladderSnap.exists) {
      throw new HttpsError('not-found', 'Stegen hittades inte.')
    }

    const ladder = ladderSnap.data() ?? {}
    const settings = settingsSnap.data() ?? {}
    const draft = buildLadderMatchDraft({
      ladderId,
      participants: parseParticipants(ladder['participants']),
      challenger,
      opponentUid,
      startTime,
      endTime,
      bookingEnabled: settings['bookingEnabled'] !== false,
      tournamentStartsAtMillis: timestampMillis(ladder['tournamentStartsAt']),
      nowMillis: Date.now(),
    })

    const bookingId = await createBookingWithLocks(draft)
    return { bookingId }
  } catch (error) {
    throw mapHttpsError(error)
  }
})

export const reportLadderResult = onCall(
  { region: REGION },
  async (request) => {
    try {
      const uid = requireAuth(request)
      const ladderId = requireString(request.data, 'ladderId')
      const matchId = requireString(request.data, 'matchId')
      const winnerId = requireString(request.data, 'winnerId')
      const loserId = requireString(request.data, 'loserId')
      const comment = isRecord(request.data)
        ? (optionalString(request.data['comment']) ?? '')
        : ''
      const caller = await getUserSnapshot(uid, request)
      const db = getFirestore()

      await db.runTransaction(async (transaction) => {
        const ladderRef = db.doc(`ladders/${ladderId}`)
        const matchRef = db.doc(`bookings/${matchId}`)
        const [ladderSnap, matchSnap] = await Promise.all([
          transaction.get(ladderRef),
          transaction.get(matchRef),
        ])

        if (!ladderSnap.exists) {
          throw new HttpsError('not-found', 'Stegen hittades inte.')
        }
        if (!matchSnap.exists) {
          throw new HttpsError('not-found', 'Matchen hittades inte.')
        }

        const ladder = ladderSnap.data() ?? {}
        const match = matchSnap.data() ?? {}
        if (match['ladderId'] !== ladderId) {
          throw new HttpsError('permission-denied', 'Fel stege för matchen.')
        }
        if (
          !isAdmin(caller) &&
          uid !== match['playerAId'] &&
          uid !== match['playerBId']
        ) {
          throw new HttpsError(
            'permission-denied',
            'Du kan bara rapportera dina egna matcher.'
          )
        }

        const completed = completeLadderMatch({
          participants: parseParticipants(ladder['participants']),
          match: {
            playerAId: optionalString(match['playerAId']) ?? '',
            playerBId: optionalString(match['playerBId']) ?? '',
            ladderStatus:
              match['ladderStatus'] === 'completed' ? 'completed' : 'planned',
          },
          winnerId,
          loserId,
          comment,
        })

        transaction.update(ladderRef, { participants: completed.participants })
        transaction.update(matchRef, {
          ladderStatus: completed.matchUpdate.ladderStatus,
          winnerId: completed.matchUpdate.winnerId,
          ladderComment: completed.matchUpdate.ladderComment,
        })
      })

      return { ok: true }
    } catch (error) {
      throw mapHttpsError(error)
    }
  }
)

export const syncProfileSnapshots = onCall(
  { region: REGION },
  async (request) => {
    try {
      const uid = requireAuth(request)
      const user = await getUserSnapshot(uid, request)
      const db = getFirestore()
      const batch = db.batch()
      let writes = 0

      const activeLadders = await db
        .collection('ladders')
        .where('status', '==', 'active')
        .get()
      for (const ladderDoc of activeLadders.docs) {
        const participants = parseParticipants(ladderDoc.data()['participants'])
        let changed = false
        const nextParticipants = participants.map((participant) => {
          if (participant.uid !== uid) return participant
          changed = true
          return {
            ...participant,
            displayName: user.displayName,
            phone: user.phone,
          }
        })

        if (changed) {
          batch.update(ladderDoc.ref, { participants: nextParticipants })
          writes += 1
        }
      }

      const now = Timestamp.now()
      const syncQueries = [
        { field: 'ownerUid', update: { ownerDisplayName: user.displayName } },
        {
          field: 'opponentUid',
          update: { opponentDisplayName: user.displayName },
        },
        { field: 'playerAId', update: { playerAName: user.displayName } },
        { field: 'playerBId', update: { playerBName: user.displayName } },
      ]

      for (const syncQuery of syncQueries) {
        const bookings = await db
          .collection('bookings')
          .where(syncQuery.field, '==', uid)
          .where('endTime', '>=', now)
          .get()
        for (const bookingDoc of bookings.docs) {
          batch.update(bookingDoc.ref, syncQuery.update)
          writes += 1
        }
      }

      if (writes > 0) {
        await batch.commit()
      }

      return { ok: true, writes }
    } catch (error) {
      throw mapHttpsError(error)
    }
  }
)
