import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
  doc,
  addDoc,
  updateDoc,
  writeBatch,
  Timestamp,
  getDoc,
  deleteField,
} from 'firebase/firestore'
import { db } from '../lib/firebase'
import { isLadderJoinOpenNow } from '../lib/ladderJoinWindow'
import { isLadderChallengeOpenNow } from '../lib/ladderTournamentStart'
import { getAppSettingsRef, APP_SETTINGS_DEFAULTS } from './AppSettingsService'

export interface LadderParticipant {
  uid: string
  displayName: string
  /** From profile at join / rejoin; shown in rankings for contact. */
  phone?: string | null
  /** 1-indexed; lower = higher ranked. 0 when participant is in the pool. */
  position: number
  wins: number
  losses: number
  paused: boolean
  /** True until the participant has played their first match. Pool members are not part of the ranking table. */
  inPool?: boolean
}

export interface Ladder {
  id: string
  name: string
  year: number
  status: 'active' | 'completed'
  joinOpensAt: Timestamp | null
  tournamentStartsAt: Timestamp | null
  createdAt: Timestamp
  participants: LadderParticipant[]
}

export const LADDER_QUERY_KEY = ['ladder', 'active'] as const
export const LADDERS_QUERY_KEY = ['ladders', 'all'] as const

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapDocToLadder(docSnap: { id: string; data: () => any }): Ladder {
  const data = docSnap.data()
  return {
    id: docSnap.id,
    name: data['name'] as string,
    year: data['year'] as number,
    status: data['status'] as 'active' | 'completed',
    joinOpensAt:
      data['joinOpensAt'] != null ? (data['joinOpensAt'] as Timestamp) : null,
    tournamentStartsAt:
      data['tournamentStartsAt'] != null
        ? (data['tournamentStartsAt'] as Timestamp)
        : null,
    createdAt: data['createdAt'] as Timestamp,
    participants: (data['participants'] ?? []) as LadderParticipant[],
  }
}

export async function getActiveLadder(): Promise<Ladder | null> {
  const laddersRef = collection(db, 'ladders')
  const q = query(laddersRef, where('status', '==', 'active'))
  const snapshot = await getDocs(q)
  if (snapshot.empty) return null
  return mapDocToLadder(snapshot.docs[0])
}

export async function getAllLadders(): Promise<Ladder[]> {
  const laddersRef = collection(db, 'ladders')
  const q = query(laddersRef, orderBy('createdAt', 'desc'))
  const snapshot = await getDocs(q)
  return snapshot.docs.map(mapDocToLadder)
}

export async function createLadder(
  name: string,
  year: number
): Promise<string> {
  const laddersRef = collection(db, 'ladders')
  const docRef = await addDoc(laddersRef, {
    name,
    year,
    status: 'active',
    joinOpensAt: null,
    tournamentStartsAt: null,
    participants: [],
    createdAt: Timestamp.fromDate(new Date()),
  })
  return docRef.id
}

export async function completeLadder(ladderId: string): Promise<void> {
  const ladderRef = doc(db, 'ladders', ladderId)
  await updateDoc(ladderRef, { status: 'completed' })
}

export async function setLadderJoinDate(
  ladderId: string,
  date: Date | null
): Promise<void> {
  const ladderRef = doc(db, 'ladders', ladderId)
  if (date === null) {
    await updateDoc(ladderRef, { joinOpensAt: deleteField() })
  } else {
    await updateDoc(ladderRef, { joinOpensAt: Timestamp.fromDate(date) })
  }
}

export async function setLadderTournamentStartDate(
  ladderId: string,
  date: Date | null
): Promise<void> {
  const ladderRef = doc(db, 'ladders', ladderId)
  if (date === null) {
    await updateDoc(ladderRef, { tournamentStartsAt: deleteField() })
  } else {
    await updateDoc(ladderRef, {
      tournamentStartsAt: Timestamp.fromDate(date),
    })
  }
}

export async function joinLadder(
  ladderId: string,
  uid: string,
  displayName: string,
  phone: string | null = null
): Promise<void> {
  const ladderRef = doc(db, 'ladders', ladderId)
  const snapshot = await getDoc(ladderRef)
  if (!snapshot.exists()) throw new Error('Ladder not found')
  const data = snapshot.data()
  const participants: LadderParticipant[] = (data['participants'] ??
    []) as LadderParticipant[]
  const joinOpensAt =
    data['joinOpensAt'] != null ? (data['joinOpensAt'] as Timestamp) : null

  // Already active — no-op
  if (participants.some((p) => p.uid === uid && !p.paused)) return

  const existing = participants.find((p) => p.uid === uid)
  const activeLadderCount = participants.filter(
    (p) => !p.paused && !p.inPool
  ).length

  // New sign-ups only (not paused rejoin) respect the optional open date.
  if (!existing && !isLadderJoinOpenNow({ joinOpensAt }, new Date())) {
    throw new Error('Ladder join is not open yet')
  }

  if (existing) {
    // Rejoin: move to bottom of ladder (or back to pool if they were pool members), keep stats, mark active
    const wasInPool = existing.inPool === true
    const updated = participants.map((p) =>
      p.uid === uid
        ? {
            ...p,
            displayName,
            paused: false,
            position: wasInPool ? 0 : activeLadderCount + 1,
            inPool: wasInPool,
            phone: phone ?? p.phone ?? null,
          }
        : p
    )
    await updateDoc(ladderRef, { participants: updated })
  } else {
    // New join: enter the pool (no ranking position yet)
    const newParticipant: LadderParticipant = {
      uid,
      displayName,
      phone: phone || null,
      position: 0,
      wins: 0,
      losses: 0,
      paused: false,
      inPool: true,
    }
    await updateDoc(ladderRef, {
      participants: [...participants, newParticipant],
    })
  }
}

export async function pauseLadder(
  ladderId: string,
  uid: string
): Promise<void> {
  const ladderRef = doc(db, 'ladders', ladderId)
  const snapshot = await getDoc(ladderRef)
  if (!snapshot.exists()) throw new Error('Ladder not found')
  const data = snapshot.data()
  const participants: LadderParticipant[] = (data['participants'] ??
    []) as LadderParticipant[]

  const target = participants.find((p) => p.uid === uid)

  // Pool members never entered the ranking — drop them entirely on leave.
  if (target?.inPool === true) {
    const remaining = participants.filter((p) => p.uid !== uid)
    await updateDoc(ladderRef, { participants: remaining })
    return
  }

  const pausedParticipants = participants.map((p) =>
    p.uid === uid ? { ...p, paused: true } : p
  )

  // Compact positions for remaining active ladder participants (skip pool members).
  const activeLadder = pausedParticipants
    .filter((p) => !p.paused && !p.inPool)
    .sort((a, b) => a.position - b.position)
    .map((p, i) => ({ ...p, position: i + 1 }))

  const pool = pausedParticipants.filter((p) => !p.paused && p.inPool)
  const paused = pausedParticipants.filter((p) => p.paused)

  await updateDoc(ladderRef, {
    participants: [...activeLadder, ...pool, ...paused],
  })
}

export interface LadderMatch {
  id: string
  ladderId: string
  playerAId: string // challenger
  playerBId: string // challenged
  playerAName: string
  playerBName: string
  ladderStatus: 'planned' | 'completed'
  winnerId: string | null
  ladderComment: string | null
  ownerUid: string
  ownerEmail: string
  ownerDisplayName: string
  startTime: Timestamp
  endTime: Timestamp
  createdAt: Timestamp
}

export const LADDER_MATCHES_QUERY_KEY = (ladderId: string) =>
  ['ladder', 'matches', ladderId] as const

export async function getLadderMatches(
  ladderId: string
): Promise<LadderMatch[]> {
  const bookingsRef = collection(db, 'bookings')
  const q = query(bookingsRef, where('ladderId', '==', ladderId))
  const snapshot = await getDocs(q)
  return snapshot.docs.map((docSnap) => {
    const d = docSnap.data()
    return {
      id: docSnap.id,
      ladderId: d['ladderId'] as string,
      playerAId: d['playerAId'] as string,
      playerBId: d['playerBId'] as string,
      playerAName: (d['playerAName'] ?? d['playerAId']) as string,
      playerBName: (d['playerBName'] ?? d['playerBId']) as string,
      ladderStatus: (d['ladderStatus'] ?? 'planned') as 'planned' | 'completed',
      winnerId: (d['winnerId'] ?? null) as string | null,
      ladderComment: (d['ladderComment'] ?? null) as string | null,
      ownerUid: d['ownerUid'] as string,
      ownerEmail: d['ownerEmail'] as string,
      ownerDisplayName: d['ownerDisplayName'] as string,
      startTime: d['startTime'] as Timestamp,
      endTime: d['endTime'] as Timestamp,
      createdAt: d['createdAt'] as Timestamp,
    }
  })
}

export async function createLadderMatch(
  ladderId: string,
  playerAId: string,
  playerBId: string,
  playerAName: string,
  playerBName: string,
  ownerUid: string,
  ownerEmail: string,
  ownerDisplayName: string,
  startTime: Date,
  endTime: Date
): Promise<string> {
  const { addDoc } = await import('firebase/firestore')

  const ladderRef = doc(db, 'ladders', ladderId)
  const ladderSnap = await getDoc(ladderRef)
  if (!ladderSnap.exists()) throw new Error('Ladder not found')
  const ladderData = ladderSnap.data()
  const tournamentStartsAt =
    ladderData['tournamentStartsAt'] != null
      ? (ladderData['tournamentStartsAt'] as Timestamp)
      : null

  const settingsSnap = await getDoc(getAppSettingsRef())
  const bookingEnabled = settingsSnap.exists()
    ? (settingsSnap.data().bookingEnabled ??
      APP_SETTINGS_DEFAULTS.bookingEnabled)
    : APP_SETTINGS_DEFAULTS.bookingEnabled

  if (
    !isLadderChallengeOpenNow(
      { tournamentStartsAt },
      { bookingEnabled },
      new Date()
    )
  ) {
    throw new Error('Challenges are not open yet')
  }

  const bookingsRef = collection(db, 'bookings')
  const docRef = await addDoc(bookingsRef, {
    type: 'member',
    ownerUid,
    ownerEmail,
    ownerDisplayName,
    startTime: Timestamp.fromDate(startTime),
    endTime: Timestamp.fromDate(endTime),
    createdAt: Timestamp.fromDate(new Date()),
    ladderId,
    playerAId,
    playerBId,
    playerAName,
    playerBName,
    ladderStatus: 'planned',
    winnerId: null,
    ladderComment: null,
  })
  return docRef.id
}

export async function reportLadderResult(
  ladderId: string,
  matchId: string,
  winnerId: string,
  loserId: string,
  comment: string
): Promise<void> {
  const ladderRef = doc(db, 'ladders', ladderId)
  const matchRef = doc(db, 'bookings', matchId)

  const ladderSnap = await getDoc(ladderRef)
  if (!ladderSnap.exists()) throw new Error('Ladder not found')

  const data = ladderSnap.data()
  const participants: LadderParticipant[] = (data['participants'] ??
    []) as LadderParticipant[]

  const { applyMatchResult } = await import('../lib/ladder')
  const updated = applyMatchResult(participants, winnerId, loserId)

  const batch = writeBatch(db)
  batch.update(ladderRef, { participants: updated })
  batch.update(matchRef, {
    ladderStatus: 'completed',
    winnerId,
    ladderComment: comment || null,
  })
  await batch.commit()
}
