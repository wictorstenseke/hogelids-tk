import { useQuery, useQueryClient } from '@tanstack/react-query'

import {
  IconSquareRoundedChevronRight,
  IconTrash,
  IconTrophy,
} from '@tabler/icons-react'
import { useAuth } from '../../lib/useAuth'
import { useToast } from '../../lib/ToastContext'
import {
  getAllLadders,
  joinLadder,
  getLadderMatches,
  reportLadderResult,
  createLadderMatch,
  LADDERS_QUERY_KEY,
  LADDER_MATCHES_QUERY_KEY,
  type LadderParticipant,
  type Ladder,
  type LadderMatch,
} from '../../services/LadderService'
import { getChallengeEligibility, formatStats } from '../../lib/ladder'
import { isLadderJoinOpenNow } from '../../lib/ladderJoinWindow'
import { useState, useMemo } from 'react'
import { BookingForm } from './BookingForm'
import { BookingDrawer } from './BookingDrawer'
import { LadderChallengeCancelSheet } from './LadderChallengeCancelSheet'
import { LadderRulesSheetDialog } from './LadderRulesSheetDialog'
import { SheetDialogShell } from './SheetDialogShell'
import {
  deleteMemberBooking,
  findConflictingBooking,
  getUpcomingBookings,
  BOOKINGS_QUERY_KEY,
} from '../../services/BookingService'
import { useIsDesktop } from '../../lib/useIsDesktop'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getActiveParticipants(participants: LadderParticipant[]) {
  return participants
    .filter((p) => !p.paused)
    .sort((a, b) => a.position - b.position)
}

function getPausedParticipants(participants: LadderParticipant[]) {
  return participants.filter((p) => p.paused)
}

function formatMatchDateHeading(match: LadderMatch): string {
  const date = match.startTime.toDate()
  return date.toLocaleDateString('sv-SE', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function MatchPlayersLine({
  playerA,
  playerB,
}: {
  playerA: string
  playerB: string
}) {
  return (
    <p className="text-sm text-gray-900">
      <span className="font-semibold">{playerA}</span>{' '}
      <span className="font-normal text-gray-400">mot</span>{' '}
      <span className="font-semibold">{playerB}</span>
    </p>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

interface RankingsTableProps {
  ladder: Ladder
  currentUid: string
  onChallenge: (opponentUid: string) => void
  ladderJoinOpenNow: boolean
  isCompleted: boolean
}

function RankingsTable({
  ladder,
  currentUid,
  onChallenge,
  ladderJoinOpenNow,
  isCompleted,
}: RankingsTableProps) {
  const active = getActiveParticipants(ladder.participants)
  const paused = getPausedParticipants(ladder.participants)
  const me = ladder.participants.find((p) => p.uid === currentUid)
  const isMember = !!me

  if (active.length === 0 && paused.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-white/20 px-4 py-10 text-center text-sm">
        {!ladderJoinOpenNow ? (
          <p className="font-medium text-white/85">
            Här visas rankinglistan när medlemmar har gått med i stegen.
          </p>
        ) : (
          <p className="text-white/60">
            Inga deltagare än. Gå med för att starta stegen!
          </p>
        )}
      </div>
    )
  }

  return (
    <div>
      {active.length > 0 && (
        <ul className="border-t border-white/10">
          {active.map((participant) => {
            const eligibility =
              isMember && !isCompleted && participant.uid !== currentUid
                ? getChallengeEligibility(
                    ladder.participants,
                    currentUid,
                    participant.uid
                  )
                : null
            const isChallengeable = eligibility?.eligible === true
            const isMe = participant.uid === currentUid

            const name = participant.displayName || participant.uid

            const rowClass = 'flex min-w-0 items-center gap-3 py-2.5 pr-2'

            const rowContent = (
              <>
                <span className="w-7 shrink-0 text-center text-sm font-semibold leading-none tabular-nums tracking-[-0.02em] text-white/90">
                  {participant.position}
                </span>
                <div className="flex min-w-0 flex-1 items-center overflow-hidden">
                  <span
                    title={name}
                    className={`inline-block max-w-full truncate rounded-md px-2.5 py-1 align-middle text-xs font-semibold leading-none ${
                      isMe
                        ? 'bg-[#F1E334] text-gray-900'
                        : 'bg-white/15 text-white/90'
                    }`}
                  >
                    {name}
                  </span>
                </div>
                <span className="shrink-0 text-xs font-medium tabular-nums tracking-[-0.02em] text-white/55">
                  {formatStats(participant.wins, participant.losses)}
                </span>
              </>
            )

            return (
              <li key={participant.uid} className="border-b border-white/10">
                {isChallengeable ? (
                  <button
                    type="button"
                    onClick={() => onChallenge(participant.uid)}
                    className={`${rowClass} w-full cursor-pointer text-left transition-colors hover:bg-white/5 active:bg-white/10`}
                    aria-label={`Utmana ${name}`}
                  >
                    {rowContent}
                  </button>
                ) : (
                  <div className={rowClass}>{rowContent}</div>
                )}
              </li>
            )
          })}
        </ul>
      )}

      {paused.length > 0 && (
        <div className="mt-4">
          <p className="mb-1.5 px-1 text-xs font-semibold uppercase tracking-wider text-white/40">
            Pausade
          </p>
          <ul className="border-t border-white/10">
            {paused.map((participant) => {
              const name = participant.displayName || participant.uid
              const isMe = participant.uid === currentUid
              return (
                <li
                  key={participant.uid}
                  className="flex min-w-0 items-center gap-3 border-b border-white/10 py-2.5 pr-2"
                >
                  <span className="w-7 shrink-0 text-center text-sm font-semibold leading-none tabular-nums tracking-[-0.02em] text-white/30">
                    —
                  </span>
                  <div className="flex min-w-0 flex-1 items-center overflow-hidden">
                    <span
                      title={name}
                      className={`inline-block max-w-full truncate rounded-md px-2.5 py-1 align-middle text-xs font-semibold leading-none opacity-50 ${
                        isMe
                          ? 'bg-[#F1E334] text-gray-900'
                          : 'bg-white/15 text-white/90'
                      }`}
                    >
                      {name}
                    </span>
                  </div>
                  <span className="shrink-0 text-xs font-medium tabular-nums tracking-[-0.02em] text-white/30">
                    {formatStats(participant.wins, participant.losses)}
                  </span>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}

interface MatchCardProps {
  match: LadderMatch
}

function MatchCard({ match }: MatchCardProps) {
  const playerA = match.playerAName
  const playerB = match.playerBName

  if (match.ladderStatus === 'completed') {
    const winnerName = match.winnerId
      ? match.winnerId === match.playerAId
        ? playerA
        : playerB
      : '?'
    const loserName = match.winnerId === match.playerAId ? playerB : playerA
    return (
      <div className="rounded-xl border border-gray-200 bg-white px-4 py-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-xs text-gray-400">
              {formatMatchDateHeading(match)}
            </p>
            <div className="mt-0.5">
              {match.winnerId ? (
                <MatchPlayersLine playerA={winnerName} playerB={loserName} />
              ) : (
                <p className="text-sm text-gray-500">
                  Inget resultat registrerat
                </p>
              )}
            </div>
          </div>
          <span className="inline-flex shrink-0 items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
            Avklarad
          </span>
        </div>
        {match.ladderComment && (
          <p className="mt-2 text-xs text-gray-500 italic">
            {match.ladderComment}
          </p>
        )}
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white px-4 py-3">
      <p className="text-xs text-gray-400">{formatMatchDateHeading(match)}</p>
      <div className="mt-0.5">
        <MatchPlayersLine playerA={playerA} playerB={playerB} />
      </div>
    </div>
  )
}

interface PlannedMatchReportRowProps {
  match: LadderMatch
  ladderId: string
  expanded: boolean
  onExpand: () => void
  onCollapse: () => void
  isCompleted: boolean
}

function PlannedMatchReportRow({
  match,
  ladderId,
  expanded,
  onExpand,
  onCollapse,
  isCompleted,
}: PlannedMatchReportRowProps) {
  const playerA = match.playerAName
  const playerB = match.playerBName

  // On a completed ladder show a plain read-only card (no expand/report)
  if (isCompleted) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white px-4 py-3">
        <p className="text-xs text-gray-400">{formatMatchDateHeading(match)}</p>
        <div className="mt-0.5">
          <MatchPlayersLine playerA={playerA} playerB={playerB} />
        </div>
      </div>
    )
  }

  function toggleHeader() {
    if (expanded) onCollapse()
    else onExpand()
  }

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
      <button
        type="button"
        onClick={() => toggleHeader()}
        aria-expanded={expanded}
        aria-label={
          expanded
            ? 'Stäng rapportformulär'
            : 'Rapportera resultat, öppna formulär'
        }
        className="flex min-h-[44px] w-full items-center gap-2 py-3 pl-4 pr-3 text-left transition-colors hover:bg-gray-50/80"
      >
        <div className="min-w-0 flex-1">
          <p className="text-xs text-gray-400">
            {formatMatchDateHeading(match)}
          </p>
          <div className="mt-0.5">
            <MatchPlayersLine playerA={playerA} playerB={playerB} />
          </div>
        </div>
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-gray-400 transition-colors hover:bg-gray-200 hover:text-gray-800">
          <IconSquareRoundedChevronRight
            size={24}
            stroke={1.5}
            className={`transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none ${expanded ? 'rotate-90' : ''}`}
            aria-hidden
          />
        </span>
      </button>
      <div
        className={`grid transition-[grid-template-rows] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none ${
          expanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
        }`}
      >
        <div
          className={`min-h-0 overflow-hidden ${expanded ? '' : 'pointer-events-none'}`}
        >
          <div
            className="border-t border-gray-100 px-4 pb-4 pt-3"
            aria-hidden={!expanded}
            inert={expanded ? undefined : true}
          >
            <ReportForm
              match={match}
              ladderId={ladderId}
              onDone={onCollapse}
              embedded
            />
          </div>
        </div>
      </div>
    </div>
  )
}

interface ReportFormProps {
  match: LadderMatch
  ladderId: string
  onDone: () => void
  embedded?: boolean
}

function ReportForm({
  match,
  ladderId,
  onDone,
  embedded = false,
}: ReportFormProps) {
  const { addToast } = useToast()
  const queryClient = useQueryClient()
  const [winnerId, setWinnerId] = useState('')
  const [comment, setComment] = useState('')
  const [saving, setSaving] = useState(false)
  const [cancelChallengeOpen, setCancelChallengeOpen] = useState(false)
  const [isDeletingLadder, setIsDeletingLadder] = useState(false)

  const loserId =
    winnerId === match.playerAId ? match.playerBId : match.playerAId

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!winnerId) return
    setSaving(true)
    try {
      await reportLadderResult(ladderId, match.id, winnerId, loserId, comment)
      await queryClient.invalidateQueries({ queryKey: LADDERS_QUERY_KEY })
      await queryClient.invalidateQueries({
        queryKey: LADDER_MATCHES_QUERY_KEY(ladderId),
      })
      addToast('Resultat sparat')
      onDone()
    } catch (err) {
      console.error('Failed to report result:', err)
      addToast('Kunde inte spara. Försök igen.', 'error')
    } finally {
      setSaving(false)
    }
  }

  async function handleDeleteLadderBooking() {
    setIsDeletingLadder(true)
    try {
      await deleteMemberBooking(match.id)
      await queryClient.invalidateQueries({ queryKey: BOOKINGS_QUERY_KEY })
      await queryClient.invalidateQueries({
        queryKey: LADDER_MATCHES_QUERY_KEY(ladderId),
      })
      addToast('Utmaning avbruten')
      onDone()
    } catch {
      addToast('Kunde inte ta bort bokningen.', 'error')
    } finally {
      setIsDeletingLadder(false)
    }
  }

  const players: { uid: string; name: string }[] = [
    { uid: match.playerAId, name: match.playerAName },
    { uid: match.playerBId, name: match.playerBName },
  ]

  return (
    <>
      <form
        onSubmit={(e) => void handleSubmit(e)}
        className={
          embedded
            ? 'space-y-4'
            : 'space-y-4 rounded-xl border border-gray-200 bg-white px-4 py-4'
        }
      >
        {!embedded && (
          <p className="text-sm font-semibold text-gray-900">
            Rapportera resultat
          </p>
        )}
        <p className="text-sm font-semibold text-gray-900">Vinnare</p>
        <div
          className="grid grid-cols-2 gap-2"
          role="group"
          aria-label="Välj vinnare"
        >
          {players.map(({ uid, name }) => {
            const selected = winnerId === uid
            return (
              <button
                key={uid}
                type="button"
                onClick={() => setWinnerId(uid)}
                aria-pressed={selected}
                className={`min-h-[44px] cursor-pointer rounded-lg border-2 px-2 py-2 text-center text-sm font-semibold transition-all ${
                  selected
                    ? 'border-gray-900 bg-[#F1E334] text-gray-900'
                    : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50/90'
                }`}
              >
                {name}
              </button>
            )
          })}
        </div>
        <textarea
          rows={2}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder={
            embedded
              ? 'Skriv gärna ett kort matchreferat'
              : 'Kommentar (valfri)'
          }
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-gray-500 focus:outline-none"
        />
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setCancelChallengeOpen(true)}
            disabled={saving || isDeletingLadder}
            aria-label="Avbryt utmaning"
            title="Avbryt utmaning"
            className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-gray-200 text-gray-500 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <IconTrash size={20} stroke={1.75} aria-hidden />
          </button>
          <div className="ml-auto flex gap-2">
            <button
              type="button"
              onClick={onDone}
              className="min-h-[44px] cursor-pointer rounded-lg border border-gray-200 px-4 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Avbryt
            </button>
            <button
              type="submit"
              disabled={!winnerId || saving}
              className="min-h-[44px] cursor-pointer rounded-lg border border-[#0f3019] bg-[#194b29] px-5 text-sm font-semibold text-white shadow-sm transition-[filter,box-shadow] hover:brightness-110 active:brightness-95 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:brightness-100"
            >
              {saving ? 'Sparar…' : 'Spara'}
            </button>
          </div>
        </div>
      </form>
      <LadderChallengeCancelSheet
        open={cancelChallengeOpen}
        onCancel={() => setCancelChallengeOpen(false)}
        onConfirm={() => {
          setCancelChallengeOpen(false)
          void handleDeleteLadderBooking()
        }}
      />
    </>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function StegenPage() {
  const { user, loading: authLoading } = useAuth()

  const { addToast } = useToast()
  const queryClient = useQueryClient()

  const isDesktop = useIsDesktop()

  const [challengeOpponentUid, setChallengeOpponentUid] = useState<
    string | null
  >(null)
  const [reportingMatch, setReportingMatch] = useState<LadderMatch | null>(null)
  const [isJoining, setIsJoining] = useState(false)
  const [matchesTab, setMatchesTab] = useState<'kommande' | 'spelade'>(
    'kommande'
  )
  const [rulesDialogOpen, setRulesDialogOpen] = useState(false)
  const [selectedLadderId, setSelectedLadderId] = useState<string | null>(null)

  const { data: allLadders = [], isLoading: laddersLoading } = useQuery({
    queryKey: LADDERS_QUERY_KEY,
    queryFn: getAllLadders,
    enabled: !!user,
  })

  // Default selection: the active ladder, fallback to the first (most recent) ladder
  const defaultLadderId = useMemo(() => {
    if (allLadders.length === 0) return null
    const active = allLadders.find((l) => l.status === 'active')
    return active ? active.id : allLadders[0].id
  }, [allLadders])

  const effectiveLadderId = selectedLadderId ?? defaultLadderId
  const selectedLadder =
    allLadders.find((l) => l.id === effectiveLadderId) ?? null
  const isCompleted = selectedLadder?.status === 'completed'

  const { data: matches = [] } = useQuery({
    queryKey: selectedLadder
      ? LADDER_MATCHES_QUERY_KEY(selectedLadder.id)
      : ['ladder', 'matches', 'none'],
    queryFn: () =>
      selectedLadder
        ? getLadderMatches(selectedLadder.id)
        : Promise.resolve([]),
    enabled: !!selectedLadder,
    staleTime: 2 * 60 * 1000,
  })

  const { data: existingBookings = [] } = useQuery({
    queryKey: BOOKINGS_QUERY_KEY,
    queryFn: getUpcomingBookings,
  })

  const ladderJoinOpenNow = isLadderJoinOpenNow(
    { joinOpensAt: selectedLadder?.joinOpensAt ?? null },
    new Date()
  )
  const ladderJoinOpensAt = selectedLadder?.joinOpensAt ?? null
  const ladderJoinOpenDateLabel =
    ladderJoinOpensAt != null
      ? new Intl.DateTimeFormat('sv-SE', { dateStyle: 'long' }).format(
          ladderJoinOpensAt.toDate()
        )
      : ''

  if (authLoading) return null

  if (!user) {
    return (
      <div>
        <main className="px-4 py-6">
          <div className="mx-auto max-w-lg md:max-w-3xl">
            <div className="rounded-xl border border-gray-200 bg-white px-4 py-6 text-center">
              <p className="text-sm text-gray-600">
                Du behöver vara inloggad för att se stegen.
              </p>
            </div>
          </div>
        </main>
      </div>
    )
  }

  const myParticipant = selectedLadder?.participants.find(
    (p) => p.uid === user.uid
  )

  const plannedMatches = matches
    .filter((m) => m.ladderStatus === 'planned')
    .sort((a, b) => a.startTime.toMillis() - b.startTime.toMillis())

  const completedMatches = matches
    .filter((m) => m.ladderStatus === 'completed')
    .sort((a, b) => b.startTime.toMillis() - a.startTime.toMillis())

  async function handleJoin() {
    if (!selectedLadder) return
    setIsJoining(true)
    try {
      await joinLadder(selectedLadder.id, user!.uid, user!.displayName)
      await queryClient.invalidateQueries({ queryKey: LADDERS_QUERY_KEY })
      addToast('Du har gått med i stegen!')
    } catch (err) {
      console.error('Failed to join ladder:', err)
      if (
        err instanceof Error &&
        err.message === 'Ladder join is not open yet'
      ) {
        addToast('Anmälan är inte öppen ännu.', 'error')
      } else {
        addToast('Kunde inte gå med. Försök igen.', 'error')
      }
    } finally {
      setIsJoining(false)
    }
  }

  const challengeOpponent =
    challengeOpponentUid && selectedLadder
      ? selectedLadder.participants.find((p) => p.uid === challengeOpponentUid)
      : null

  async function handleLadderMobileSubmit(
    date: string,
    startTime: string,
    endTime: string
  ) {
    if (!selectedLadder || !challengeOpponentUid || !challengeOpponent || !user)
      return
    const start = new Date(`${date}T${startTime}`)
    const end = new Date(`${date}T${endTime}`)
    await queryClient.refetchQueries({ queryKey: BOOKINGS_QUERY_KEY })
    const freshBookings =
      queryClient.getQueryData<typeof existingBookings>(BOOKINGS_QUERY_KEY) ??
      existingBookings
    const conflict = findConflictingBooking(freshBookings, start, end)
    if (conflict) {
      throw new Error(`Det finns redan en bokning som överlappar med vald tid.`)
    }
    await createLadderMatch(
      selectedLadder.id,
      user.uid,
      challengeOpponentUid,
      user.displayName,
      challengeOpponent.displayName ?? challengeOpponentUid,
      user.uid,
      user.email,
      user.displayName,
      start,
      end
    )
    setChallengeOpponentUid(null)
    await queryClient.invalidateQueries({
      queryKey: LADDER_MATCHES_QUERY_KEY(selectedLadder.id),
    })
    await queryClient.invalidateQueries({ queryKey: BOOKINGS_QUERY_KEY })
    addToast('Match bokad!')
  }

  return (
    <div>
      <main className="px-4 py-6">
        <div className="mx-auto max-w-lg space-y-6 md:max-w-3xl">
          {/* Ladder selector */}
          {laddersLoading ? (
            <div className="rounded-xl border border-gray-200 bg-white px-4 py-6 text-center">
              <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-gray-200 border-t-gray-600" />
            </div>
          ) : allLadders.length === 0 ? (
            <div className="rounded-xl border border-gray-200 bg-white px-4 py-6 text-center">
              <IconTrophy
                size={32}
                stroke={1.5}
                className="mx-auto mb-2 text-gray-300"
              />
              <p className="text-sm text-gray-500">
                Ingen stege är skapad ännu.
              </p>
            </div>
          ) : (
            <>
              {/* Selector row */}
              {allLadders.length > 1 && (
                <div className="flex items-center gap-3">
                  <select
                    value={effectiveLadderId ?? ''}
                    onChange={(e) => {
                      setSelectedLadderId(e.target.value)
                      setReportingMatch(null)
                      setChallengeOpponentUid(null)
                    }}
                    className="min-h-[44px] flex-1 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-900 focus:border-gray-400 focus:outline-none"
                    aria-label="Välj stege"
                  >
                    {allLadders.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.status === 'completed'
                          ? `${l.name} (avslutad)`
                          : l.name}
                      </option>
                    ))}
                  </select>
                  {isCompleted && (
                    <span className="inline-flex shrink-0 items-center rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-500">
                      Avslutad
                    </span>
                  )}
                </div>
              )}

              {/* Single ladder: show name + badge if completed */}
              {allLadders.length === 1 && isCompleted && (
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-gray-800">
                    {selectedLadder?.name}
                  </p>
                  <span className="inline-flex shrink-0 items-center rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-500">
                    Avslutad
                  </span>
                </div>
              )}

              {/* Join banner — hidden on completed ladders */}
              {selectedLadder && !myParticipant && !isCompleted && (
                <div
                  className="overflow-hidden rounded-xl text-sm text-gray-800"
                  style={{ backgroundColor: '#F1E334' }}
                >
                  <div className="px-4 py-3">
                    <p className="font-semibold text-gray-900">
                      {ladderJoinOpenNow
                        ? 'Välkommen till stegen!'
                        : 'Anmälan öppnar snart'}
                    </p>
                    <p className="mt-0.5 text-gray-800">
                      {ladderJoinOpenNow
                        ? 'Utmana andra spelare och klättra i rankingen.'
                        : ladderJoinOpenDateLabel
                          ? `Anmälan öppnar ${ladderJoinOpenDateLabel}. Du kan då gå med i stegen.`
                          : 'Anmälan är inte öppen ännu.'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleJoin()}
                    disabled={isJoining || !ladderJoinOpenNow}
                    className="flex w-full items-center px-4 py-2.5 font-semibold transition-opacity hover:opacity-70 disabled:opacity-50"
                    style={{ backgroundColor: '#E5D82C' }}
                  >
                    {isJoining ? 'Går med…' : 'Gå med i stegen'}
                  </button>
                </div>
              )}

              {selectedLadder && (
                <div className="flex flex-col gap-6 md:flex-row md:items-start md:gap-8">
                  <section className="min-w-0 w-full rounded-2xl bg-[#194b29] px-4 py-4 md:flex-1">
                    <div className="mb-3 flex items-center justify-between gap-2">
                      <h2 className="text-xs font-semibold uppercase tracking-wider text-white/70">
                        Rankingslista
                      </h2>
                      <button
                        type="button"
                        onClick={() => setRulesDialogOpen(true)}
                        className="inline-flex h-7 shrink-0 cursor-pointer items-center rounded-md border border-white/25 bg-white/10 px-2 text-xs font-semibold text-white/90 transition-colors hover:border-white/40 hover:bg-white/15"
                      >
                        Regler
                      </button>
                    </div>
                    <RankingsTable
                      ladder={selectedLadder}
                      currentUid={user.uid}
                      ladderJoinOpenNow={ladderJoinOpenNow}
                      isCompleted={isCompleted ?? false}
                      onChallenge={(uid) => {
                        setChallengeOpponentUid(uid)
                        setReportingMatch(null)
                      }}
                    />
                  </section>

                  <div className="min-w-0 w-full rounded-2xl bg-[#194b29] px-4 py-4 md:flex-1">
                    <div
                      className="relative mb-4 flex w-full rounded-xl bg-white/10 p-1"
                      role="tablist"
                      aria-label="Välj kommande eller spelade stegmatcher"
                    >
                      <div
                        className="absolute top-1 h-[calc(100%-8px)] w-[calc(50%-6px)] rounded-lg bg-[#F1E334] transition-[left] duration-300 ease-out"
                        style={{
                          left:
                            matchesTab === 'spelade'
                              ? 'calc(50% + 2px)'
                              : '4px',
                        }}
                        aria-hidden
                      />
                      <button
                        type="button"
                        role="tab"
                        aria-selected={matchesTab === 'kommande'}
                        onClick={() => setMatchesTab('kommande')}
                        className={`relative z-10 flex-1 rounded-lg py-2 text-sm font-semibold transition-colors duration-200 ${
                          matchesTab === 'kommande'
                            ? 'text-gray-900 hover:brightness-110 active:brightness-95'
                            : 'text-white/60 hover:text-white/90 active:text-white'
                        }`}
                      >
                        Kommande
                      </button>
                      <button
                        type="button"
                        role="tab"
                        aria-selected={matchesTab === 'spelade'}
                        onClick={() => setMatchesTab('spelade')}
                        className={`relative z-10 flex-1 rounded-lg py-2 text-sm font-semibold transition-colors duration-200 ${
                          matchesTab === 'spelade'
                            ? 'text-gray-900 hover:brightness-110 active:brightness-95'
                            : 'text-white/60 hover:text-white/90 active:text-white'
                        }`}
                      >
                        Spelade
                      </button>
                    </div>

                    {matchesTab === 'kommande' &&
                      (plannedMatches.length > 0 ? (
                        <div className="space-y-2">
                          {plannedMatches.map((match) => {
                            const isInvolved =
                              !isCompleted &&
                              (match.playerAId === user.uid ||
                                match.playerBId === user.uid)
                            if (isInvolved) {
                              return (
                                <PlannedMatchReportRow
                                  key={match.id}
                                  match={match}
                                  ladderId={selectedLadder.id}
                                  expanded={reportingMatch?.id === match.id}
                                  isCompleted={isCompleted ?? false}
                                  onExpand={() => {
                                    setReportingMatch(match)
                                    setChallengeOpponentUid(null)
                                  }}
                                  onCollapse={() => setReportingMatch(null)}
                                />
                              )
                            }
                            return <MatchCard key={match.id} match={match} />
                          })}
                        </div>
                      ) : (
                        <div className="rounded-xl border border-dashed border-white/20 px-4 py-10 text-center text-sm">
                          {!ladderJoinOpenNow ? (
                            <p className="font-medium text-white/85">
                              Här visas kommande stegmatcher när spelare har
                              gått med och bokat tider.
                            </p>
                          ) : (
                            <p className="text-white/60">
                              Inga stegmatcher bokade just nu.
                            </p>
                          )}
                        </div>
                      ))}

                    {matchesTab === 'spelade' &&
                      (completedMatches.length > 0 ? (
                        <div className="space-y-2">
                          {completedMatches.map((match) => (
                            <MatchCard key={match.id} match={match} />
                          ))}
                        </div>
                      ) : (
                        <div className="rounded-xl border border-dashed border-white/20 px-4 py-10 text-center text-sm">
                          {!ladderJoinOpenNow ? (
                            <p className="font-medium text-white/85">
                              Här visas spelade stegmatcher när matcher är
                              avslutade.
                            </p>
                          ) : (
                            <p className="text-white/60">
                              Inga spelade stegmatcher än.
                            </p>
                          )}
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </main>
      {rulesDialogOpen ? (
        <LadderRulesSheetDialog onClose={() => setRulesDialogOpen(false)} />
      ) : null}
      {challengeOpponent &&
        challengeOpponentUid &&
        selectedLadder &&
        !isDesktop && (
          <BookingDrawer
            existingBookings={existingBookings}
            onSubmit={handleLadderMobileSubmit}
            onClose={() => setChallengeOpponentUid(null)}
            playerNames={{
              playerA: user.displayName,
              playerB: challengeOpponent.displayName ?? challengeOpponentUid,
            }}
          />
        )}
      {challengeOpponent &&
        challengeOpponentUid &&
        selectedLadder &&
        isDesktop && (
          <SheetDialogShell
            titleId="challenge-dialog-title"
            title={`Utmana ${challengeOpponent.displayName ?? challengeOpponentUid}`}
            onClose={() => setChallengeOpponentUid(null)}
            maxHeightVariant="tall"
          >
            <BookingForm
              variant="dialog"
              hideSectionTitle
              existingBookings={existingBookings}
              onSuccess={() => {
                setChallengeOpponentUid(null)
                void queryClient.invalidateQueries({
                  queryKey: LADDER_MATCHES_QUERY_KEY(selectedLadder.id),
                })
                void queryClient.invalidateQueries({
                  queryKey: BOOKINGS_QUERY_KEY,
                })
                addToast('Match bokad!')
              }}
              user={user}
              ladderMeta={{
                ladderId: selectedLadder.id,
                playerAId: user.uid,
                playerBId: challengeOpponentUid,
                playerAName: user.displayName,
                playerBName:
                  challengeOpponent.displayName ?? challengeOpponentUid,
              }}
            />
          </SheetDialogShell>
        )}
    </div>
  )
}
