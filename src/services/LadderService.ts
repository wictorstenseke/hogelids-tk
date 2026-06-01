import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  doc,
  addDoc,
  updateDoc,
  Timestamp,
  deleteField,
} from 'firebase/firestore'
import { httpsCallable } from 'firebase/functions'
import { db, functions } from '../lib/firebase'

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
  completedAt: Timestamp | null
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
    completedAt:
      data['completedAt'] != null ? (data['completedAt'] as Timestamp) : null,
    participants: (data['participants'] ?? []) as LadderParticipant[],
  }
}

export async function getActiveLadder(): Promise<Ladder | null> {
  const laddersRef = collection(db, 'ladders')
  const q = query(laddersRef, where('status', '==', 'active'), limit(1))
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
  await updateDoc(ladderRef, {
    status: 'completed',
    completedAt: Timestamp.fromDate(new Date()),
  })
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
  _uid: string,
  _displayName: string,
  _phone: string | null = null
): Promise<void> {
  void _uid
  void _displayName
  void _phone
  const join = httpsCallable(functions, 'joinLadder')
  await join({ ladderId })
}

export async function pauseLadder(
  ladderId: string,
  _uid: string
): Promise<void> {
  void _uid
  const pause = httpsCallable(functions, 'pauseLadder')
  await pause({ ladderId })
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
  _playerAId: string,
  playerBId: string,
  _playerAName: string,
  _playerBName: string,
  _ownerUid: string,
  _ownerEmail: string,
  _ownerDisplayName: string,
  startTime: Date,
  endTime: Date
): Promise<string> {
  const create = httpsCallable<
    {
      ladderId: string
      playerBId: string
      startTime: string
      endTime: string
    },
    { bookingId?: unknown }
  >(functions, 'createLadderMatch')
  const result = await create({
    ladderId,
    playerBId,
    startTime: startTime.toISOString(),
    endTime: endTime.toISOString(),
  })
  if (typeof result.data.bookingId !== 'string') {
    throw new Error('Matchen kunde inte skapas.')
  }
  return result.data.bookingId
}

export async function reportLadderResult(
  ladderId: string,
  matchId: string,
  winnerId: string,
  loserId: string,
  comment: string
): Promise<void> {
  const report = httpsCallable(functions, 'reportLadderResult')
  await report({ ladderId, matchId, winnerId, loserId, comment })
}
