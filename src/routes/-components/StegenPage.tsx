import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import {
  IconSquareRoundedChevronLeft,
  IconSquareRoundedChevronRight,
  IconTrash,
  IconTrophy,
} from '@tabler/icons-react'
import { useAuth } from '../../lib/useAuth'
import { useToast } from '../../lib/ToastContext'
import { useAppSettings } from '../../lib/useAppSettings'
import {
  getActiveLadder,
  joinLadder,
  pauseLadder,
  getLadderMatches,
  reportLadderResult,
  LADDER_QUERY_KEY,
  LADDER_MATCHES_QUERY_KEY,
  type LadderParticipant,
  type Ladder,
  type LadderMatch,
} from '../../services/LadderService'
import { getChallengeEligibility, formatStats } from '../../lib/ladder'
import { useState } from 'react'
import { BookingForm } from './BookingForm'
import { ConfirmSheetDialog } from './ConfirmSheetDialog'
import {
  getUpcomingBookings,
  BOOKINGS_QUERY_KEY,
} from '../../services/BookingService'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getActiveParticipants(participants: LadderParticipant[]) {
  return participants
    .filter((p) => !p.paused)
    .sort((a, b) => a.position - b.position)
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
}

function RankingsTable({
  ladder,
  currentUid,
  onChallenge,
}: RankingsTableProps) {
  const active = getActiveParticipants(ladder.participants)
  const me = ladder.participants.find((p) => p.uid === currentUid)
  const isMember = !!me

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
      {active.length === 0 ? (
        <p className="px-4 py-6 text-sm text-gray-500 text-center">
          Inga deltagare än. Gå med för att starta stegen!
        </p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider text-gray-400 w-10">
                #
              </th>
              <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">
                Spelare
              </th>
              <th className="px-4 py-2 text-right text-xs font-semibold uppercase tracking-wider text-gray-400">
                Statistik
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {active.map((participant) => {
              const isMe = participant.uid === currentUid
              const eligibility =
                isMember && !isMe
                  ? getChallengeEligibility(
                      ladder.participants,
                      currentUid,
                      participant.uid
                    )
                  : null
              const isChallengeable = eligibility?.eligible === true

              return (
                <tr
                  key={participant.uid}
                  onClick={
                    isChallengeable
                      ? () => onChallenge(participant.uid)
                      : undefined
                  }
                  className={[
                    'transition-colors',
                    isMe ? 'bg-[#F1E334]/20' : '',
                    isChallengeable
                      ? 'cursor-pointer hover:bg-gray-50 active:bg-gray-100'
                      : '',
                  ].join(' ')}
                >
                  <td className="px-4 py-3 text-gray-500 font-mono text-xs">
                    {participant.position}
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-medium text-gray-900">
                      {participant.displayName || participant.uid}
                    </span>
                    {isMe && (
                      <span className="ml-2 inline-flex items-center rounded-full bg-[#F1E334] px-2 py-0.5 text-xs font-semibold text-gray-800">
                        Du
                      </span>
                    )}
                    {isChallengeable && (
                      <span className="ml-2 inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
                        Utmana
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-gray-700">
                    {formatStats(participant.wins, participant.losses)}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
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
}

function PlannedMatchReportRow({
  match,
  ladderId,
  expanded,
  onExpand,
  onCollapse,
}: PlannedMatchReportRowProps) {
  const playerA = match.playerAName
  const playerB = match.playerBName

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
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-gray-500 transition-colors hover:bg-gray-200 hover:text-gray-800">
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

  const loserId =
    winnerId === match.playerAId ? match.playerBId : match.playerAId

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!winnerId) return
    setSaving(true)
    try {
      await reportLadderResult(ladderId, match.id, winnerId, loserId, comment)
      await queryClient.invalidateQueries({ queryKey: LADDER_QUERY_KEY })
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
                className={`min-h-[44px] cursor-pointer rounded-lg border px-2 py-2 text-center text-sm font-medium transition-colors ${
                  selected
                    ? 'border-gray-900 bg-gray-50 text-gray-900'
                    : 'border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50/80'
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
            disabled={saving}
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
              className="min-h-[44px] cursor-pointer rounded-lg bg-gray-900 px-5 text-sm font-semibold text-white hover:bg-gray-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {saving ? 'Sparar…' : 'Spara'}
            </button>
          </div>
        </div>
      </form>
      {cancelChallengeOpen && (
        <ConfirmSheetDialog
          titleId="cancel-challenge-title"
          title="Avbryt utmaning?"
          description="Vill du stänga utan att spara resultat? Du kan rapportera matchen igen senare."
          cancelLabel="Tillbaka"
          confirmLabel="Avbryt utmaning"
          confirmDanger
          onCancel={() => setCancelChallengeOpen(false)}
          onConfirm={() => {
            setCancelChallengeOpen(false)
            onDone()
          }}
        />
      )}
    </>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function StegenPage() {
  const { user, loading: authLoading } = useAuth()
  const { addToast } = useToast()
  const queryClient = useQueryClient()
  const { settings } = useAppSettings()

  const [challengeOpponentUid, setChallengeOpponentUid] = useState<
    string | null
  >(null)
  const [reportingMatch, setReportingMatch] = useState<LadderMatch | null>(null)
  const [isJoining, setIsJoining] = useState(false)
  const [isPausing, setIsPausing] = useState(false)

  const { data: ladder, isLoading: ladderLoading } = useQuery({
    queryKey: LADDER_QUERY_KEY,
    queryFn: getActiveLadder,
    enabled: !!user,
  })

  const { data: matches = [] } = useQuery({
    queryKey: ladder
      ? LADDER_MATCHES_QUERY_KEY(ladder.id)
      : ['ladder', 'matches', 'none'],
    queryFn: () => (ladder ? getLadderMatches(ladder.id) : Promise.resolve([])),
    enabled: !!ladder,
  })

  const { data: existingBookings = [] } = useQuery({
    queryKey: BOOKINGS_QUERY_KEY,
    queryFn: getUpcomingBookings,
  })

  const ladderEnabled = settings?.ladderEnabled ?? true

  if (authLoading) return null

  if (!user || !ladderEnabled) {
    return (
      <main className="min-h-screen px-4 py-8">
        <div className="mx-auto max-w-lg">
          <div className="flex items-center gap-3 mb-8">
            <Link
              to="/"
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/20 text-white transition-colors hover:bg-white/30"
            >
              <IconSquareRoundedChevronLeft size={24} stroke={1.5} />
            </Link>
            <h1 className="text-2xl font-bold text-white">Stegen</h1>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white px-4 py-6 text-center">
            <p className="text-sm text-gray-600">
              {!user
                ? 'Du behöver vara inloggad för att se stegen.'
                : 'Stegen är inte tillgänglig just nu.'}
            </p>
          </div>
        </div>
      </main>
    )
  }

  const myParticipant = ladder?.participants.find((p) => p.uid === user.uid)
  const isActive = !!myParticipant && !myParticipant.paused
  const isPaused = !!myParticipant && myParticipant.paused

  const plannedMatches = matches
    .filter((m) => m.ladderStatus === 'planned')
    .sort((a, b) => a.startTime.toMillis() - b.startTime.toMillis())

  const completedMatches = matches
    .filter((m) => m.ladderStatus === 'completed')
    .sort((a, b) => b.startTime.toMillis() - a.startTime.toMillis())

  async function handleJoin() {
    if (!ladder) return
    setIsJoining(true)
    try {
      await joinLadder(ladder.id, user!.uid, user!.displayName)
      await queryClient.invalidateQueries({ queryKey: LADDER_QUERY_KEY })
      addToast('Du har gått med i stegen!')
    } catch (err) {
      console.error('Failed to join ladder:', err)
      addToast('Kunde inte gå med. Försök igen.', 'error')
    } finally {
      setIsJoining(false)
    }
  }

  async function handlePause() {
    if (!ladder) return
    setIsPausing(true)
    try {
      await pauseLadder(ladder.id, user!.uid)
      await queryClient.invalidateQueries({ queryKey: LADDER_QUERY_KEY })
      addToast('Du har pausat din deltagning.')
    } catch (err) {
      console.error('Failed to pause ladder:', err)
      addToast('Kunde inte pausa. Försök igen.', 'error')
    } finally {
      setIsPausing(false)
    }
  }

  const challengeOpponent =
    challengeOpponentUid && ladder
      ? ladder.participants.find((p) => p.uid === challengeOpponentUid)
      : null

  return (
    <main className="min-h-screen px-4 py-8">
      <div className="mx-auto max-w-lg space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link
              to="/"
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/20 text-white transition-colors hover:bg-white/30"
            >
              <IconSquareRoundedChevronLeft size={24} stroke={1.5} />
            </Link>
            <h1 className="text-2xl font-bold text-white">Stegen</h1>
          </div>
          {ladder && (
            <div className="flex items-center gap-2">
              {isActive && myParticipant && (
                <span className="text-xs text-white/70">
                  Placering {myParticipant.position}
                </span>
              )}
              {isPaused && (
                <button
                  type="button"
                  onClick={() => void handleJoin()}
                  disabled={isJoining}
                  className="min-h-[36px] cursor-pointer rounded-lg bg-white/20 px-3 text-xs font-semibold text-white hover:bg-white/30 transition-colors disabled:opacity-50"
                >
                  {isJoining ? 'Återgår…' : 'Återgå till stegen'}
                </button>
              )}
              {!myParticipant && (
                <button
                  type="button"
                  onClick={() => void handleJoin()}
                  disabled={isJoining}
                  className="min-h-[36px] cursor-pointer rounded-lg bg-[#F1E334] px-3 text-xs font-semibold text-gray-900 hover:opacity-80 transition-opacity disabled:opacity-50"
                >
                  {isJoining ? 'Går med…' : 'Gå med i stegen'}
                </button>
              )}
              {isActive && (
                <button
                  type="button"
                  onClick={() => void handlePause()}
                  disabled={isPausing}
                  className="min-h-[36px] cursor-pointer rounded-lg border border-white/30 px-3 text-xs font-medium text-white/70 hover:text-white hover:border-white/50 transition-colors disabled:opacity-50"
                >
                  {isPausing ? 'Pausar…' : 'Pausa'}
                </button>
              )}
            </div>
          )}
        </div>

        {ladderLoading ? (
          <div className="rounded-xl border border-gray-200 bg-white px-4 py-6 text-center">
            <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-gray-200 border-t-gray-600" />
          </div>
        ) : !ladder ? (
          <div className="rounded-xl border border-gray-200 bg-white px-4 py-6 text-center">
            <IconTrophy
              size={32}
              stroke={1.5}
              className="mx-auto mb-2 text-gray-300"
            />
            <p className="text-sm text-gray-500">Ingen aktiv stege just nu.</p>
          </div>
        ) : (
          <>
            {/* Challenge form */}
            {challengeOpponent && challengeOpponentUid && (
              <div className="rounded-xl border border-gray-200 bg-white px-4 py-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-gray-900">
                    Utmana{' '}
                    {challengeOpponent?.displayName ?? challengeOpponentUid}
                  </p>
                  <button
                    type="button"
                    onClick={() => setChallengeOpponentUid(null)}
                    className="text-xs text-gray-400 hover:text-gray-600"
                  >
                    Avbryt
                  </button>
                </div>
                <BookingForm
                  existingBookings={existingBookings}
                  onSuccess={() => {
                    setChallengeOpponentUid(null)
                    void queryClient.invalidateQueries({
                      queryKey: LADDER_MATCHES_QUERY_KEY(ladder.id),
                    })
                    void queryClient.invalidateQueries({
                      queryKey: BOOKINGS_QUERY_KEY,
                    })
                    addToast('Match bokad!')
                  }}
                  user={user}
                  ladderMeta={{
                    ladderId: ladder.id,
                    playerAId: user.uid,
                    playerBId: challengeOpponentUid,
                    playerAName: user.displayName,
                    playerBName:
                      challengeOpponent?.displayName ?? challengeOpponentUid,
                  }}
                />
              </div>
            )}

            {/* Rankings table */}
            <section>
              <h2 className="mb-2 px-1 text-xs font-semibold uppercase tracking-wider text-white/70">
                Rankingslista
              </h2>
              <RankingsTable
                ladder={ladder}
                currentUid={user.uid}
                onChallenge={(uid) => {
                  setChallengeOpponentUid(uid)
                  setReportingMatch(null)
                }}
              />
            </section>

            {/* Planned matches */}
            {plannedMatches.length > 0 && (
              <section>
                <h2 className="mb-2 px-1 text-xs font-semibold uppercase tracking-wider text-white/70">
                  Kommande matcher
                </h2>
                <div className="space-y-2">
                  {plannedMatches.map((match) => {
                    const isInvolved =
                      match.playerAId === user.uid ||
                      match.playerBId === user.uid
                    if (isInvolved) {
                      return (
                        <PlannedMatchReportRow
                          key={match.id}
                          match={match}
                          ladderId={ladder.id}
                          expanded={reportingMatch?.id === match.id}
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
              </section>
            )}

            {/* Completed matches */}
            {completedMatches.length > 0 && (
              <section>
                <h2 className="mb-2 px-1 text-xs font-semibold uppercase tracking-wider text-white/70">
                  Spelade matcher
                </h2>
                <div className="space-y-2">
                  {completedMatches.map((match) => (
                    <MatchCard key={match.id} match={match} />
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </main>
  )
}
