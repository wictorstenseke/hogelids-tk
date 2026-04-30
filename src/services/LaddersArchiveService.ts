import {
  collection,
  getDocs,
  query,
  where,
  Timestamp,
  type QueryDocumentSnapshot,
  type DocumentData,
} from 'firebase/firestore'
import { db } from '../lib/firebase'
import { loadHistoryArchive } from './HistoryArchiveService'
import type { Ladder, LadderParticipant } from './LadderService'

export const COMPLETED_LADDERS_QUERY_KEY = ['ladders', 'completed'] as const

const PROD_PROJECT_ID = 'hogelids-tk-prod'

function isProd(): boolean {
  return import.meta.env.VITE_FIREBASE_PROJECT_ID === PROD_PROJECT_ID
}

function mapDocToCompletedLadder(
  docSnap: QueryDocumentSnapshot<DocumentData>
): Ladder {
  const data = docSnap.data()
  return {
    id: docSnap.id,
    name: data['name'] as string,
    year: data['year'] as number,
    status: 'completed',
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

async function fetchCompletedFromFirestore(
  sinceMillis?: number
): Promise<Ladder[]> {
  const laddersRef = collection(db, 'ladders')
  const constraints = [where('status', '==', 'completed')]
  if (sinceMillis !== undefined) {
    constraints.push(
      where('completedAt', '>', Timestamp.fromMillis(sinceMillis))
    )
  }
  const snapshot = await getDocs(query(laddersRef, ...constraints))
  return snapshot.docs.map(mapDocToCompletedLadder)
}

/**
 * Returns completed ladders.
 * - Prod: bundled JSON archive + Firestore fallback for ladders completed since archive build.
 * - Other envs: full Firestore query (test data differs from prod, no archive).
 */
export async function loadCompletedLadders(): Promise<Ladder[]> {
  if (!isProd()) {
    return fetchCompletedFromFirestore()
  }
  const archive = await loadHistoryArchive()
  const fresh = await fetchCompletedFromFirestore(archive.generatedAt)
  const byId = new Map<string, Ladder>(
    archive.completedLadders.map((l) => [l.id, l])
  )
  for (const l of fresh) byId.set(l.id, l)
  return [...byId.values()]
}
