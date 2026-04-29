import { useQueries, useQuery, useQueryClient } from '@tanstack/react-query'
import { getProfile, PROFILE_QUERY_KEY } from '../../services/ProfileService'

import {
  IconPhoneOff,
  IconSquareRoundedChevronRight,
  IconTrash,
  IconX,
} from '@tabler/icons-react'
import { useAuth } from '../../lib/useAuth'
import { useToast } from '../../lib/ToastContext'
import { useProfileModal } from '../../lib/ProfileModalContext'
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
import { formatPhoneForStorage } from '../../lib/phoneFormat'
import { getChallengeEligibility, formatStats } from '../../lib/ladder'
import { isLadderJoinOpenNow } from '../../lib/ladderJoinWindow'
import { isLadderChallengeOpenNow } from '../../lib/ladderTournamentStart'
import { useState, useMemo, useEffect } from 'react'
import { BookingForm } from './BookingForm'
import { BookingDrawer } from './BookingDrawer'
import { LadderChallengeCancelSheet } from './LadderChallengeCancelSheet'
import { LadderRulesSheetDialog } from './LadderRulesSheetDialog'
import { SheetDialogShell } from './SheetDialogShell'
import { GlassNoticeCard } from './GlassNoticeCard'
import { ParticipantPhoneSheetDialog } from './ParticipantPhoneSheetDialog'
import { LadderStatsCards } from './LadderStatsCards'
import { MenuSelect } from './MenuSelect'
import {
  deleteMemberBooking,
  findConflictingBooking,
  getUpcomingBookings,
  BOOKINGS_QUERY_KEY,
} from '../../services/BookingService'
import { resolveBookingInterval } from '../../lib/bookingInterval'
import { formatTimeDisplay } from '../../lib/formatTimeDisplay'
import { useIsDesktop } from '../../lib/useIsDesktop'
import { useAppSettings } from '../../lib/useAppSettings'
import {
  dismissJoinWelcomeBannerForLadder,
  getJoinWelcomeBannerDismissedLadderId,
} from '../../lib/GuestSession'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getActiveParticipants(participants: LadderParticipant[]) {
  return participants
    .filter((p) => !p.paused && p.inPool !== true)
    .sort((a, b) => a.position - b.position)
}

function getPoolParticipants(participants: LadderParticipant[]) {
  return participants
    .filter((p) => !p.paused && p.inPool === true)
    .sort((a, b) => a.displayName.localeCompare(b.displayName, 'sv-SE'))
}

function getPausedParticipants(participants: LadderParticipant[]) {
  return participants.filter((p) => p.paused)
}

function formatMatchDateHeading(match: LadderMatch): string {
  const start = match.startTime.toDate()
  const end = match.endTime.toDate()
  const dateStr = start.toLocaleDateString('sv-SE', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
  const timeStr = `${formatTimeDisplay(start)}–${formatTimeDisplay(end)}`
  return `${dateStr} · ${timeStr}`
}

function MatchPlayersLine({
  playerA,
  playerB,
  tone = 'light',
}: {
  playerA: string
  playerB: string
  tone?: 'light' | 'dark'
}) {
  const nameClass = tone === 'dark' ? 'text-white' : 'text-gray-900'
  const motClass = tone === 'dark' ? 'text-white/55' : 'text-gray-400'
  return (
    <p className={`text-sm ${nameClass}`}>
      <span className="font-semibold">{playerA}</span>{' '}
      <span className={`font-medium ${motClass}`}>mot</span>{' '}
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
  /** When false, participant rows render as plain text (no challenge button). */
  challengesEnabled: boolean
  isCompleted: boolean
  /** När satt: visar "Gå med i stegen" i tom lista (under text) eller ovanför listan om andra redan gått med. */
  onJoin?: () => void
  isJoining?: boolean
  /** Profile phone per uid — fresh source of truth, supersedes the snapshot in the ladder doc. */
  phonesByUid?: Record<string, string | null>
}

const joinCtaButtonClass =
  'flex min-h-[44px] w-full min-[480px]:w-auto cursor-pointer items-center justify-center rounded-lg border border-[#d4c92e] bg-[#F1E334] px-4 py-2.5 text-sm font-semibold text-gray-900 shadow-sm transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/50'

function MissingPhoneIcon({
  displayName,
  isMe,
}: {
  displayName: string
  isMe: boolean
}) {
  const { openProfileModal } = useProfileModal()
  const { addToast } = useToast()

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation()
        if (isMe) {
          openProfileModal()
        } else {
          addToast(
            `${displayName} har inte lagt till ett telefonnummer ännu`,
            'error'
          )
        }
      }}
      aria-label={
        isMe
          ? 'Lägg till ditt telefonnummer i profilen'
          : `${displayName} har inget telefonnummer`
      }
      title={isMe ? 'Lägg till telefonnummer' : 'Telefonnummer saknas'}
      className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-lg text-white/25 transition-colors hover:bg-white/10 hover:text-white/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/40"
    >
      <IconPhoneOff size={18} stroke={1.75} aria-hidden />
    </button>
  )
}

/** Profile is source of truth; ladder snapshot is fallback for offline/loading state. */
function resolveParticipantPhoneDisplay(
  participant: LadderParticipant,
  phonesByUid: Record<string, string | null> | undefined
): string | null {
  const fromProfile = phonesByUid?.[participant.uid]?.trim()
  if (fromProfile) return fromProfile
  const fromLadder = participant.phone?.trim()
  return fromLadder || null
}

function RankingsTable({
  ladder,
  currentUid,
  onChallenge,
  ladderJoinOpenNow,
  challengesEnabled,
  isCompleted,
  onJoin,
  isJoining = false,
  phonesByUid,
}: RankingsTableProps) {
  const active = getActiveParticipants(ladder.participants)
  const pool = getPoolParticipants(ladder.participants)
  const paused = getPausedParticipants(ladder.participants)
  const me = ladder.participants.find((p) => p.uid === currentUid)
  const isMember = !!me

  const showJoinCta =
    !isCompleted &&
    !isMember &&
    ladderJoinOpenNow &&
    typeof onJoin === 'function'

  if (active.length === 0 && pool.length === 0 && paused.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-white/20 px-4 py-10 text-center text-sm">
        {!ladderJoinOpenNow ? (
          <p className="font-medium text-white/85">
            Här visas rankinglistan när medlemmar har gått med i stegen.
          </p>
        ) : (
          <div className="flex flex-col items-center gap-4">
            <p className="text-white/60">Inga deltagare än.</p>
            {showJoinCta && (
              <button
                type="button"
                onClick={() => void onJoin()}
                disabled={isJoining}
                className={joinCtaButtonClass}
              >
                {isJoining ? 'Går med…' : 'Gå med i stegen'}
              </button>
            )}
          </div>
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
            const isChallengeable =
              challengesEnabled && eligibility?.eligible === true
            const isMe = participant.uid === currentUid

            const name = participant.displayName || participant.uid
            const phoneDisplay = resolveParticipantPhoneDisplay(
              participant,
              phonesByUid
            )

            const rowClass = 'flex min-w-0 items-center gap-1 py-2.5 pr-2'

            const rowContent = (
              <>
                <span className="w-7 shrink-0 text-center text-sm font-semibold leading-none tabular-nums tracking-[-0.02em] text-white/90">
                  {participant.position}
                </span>
                <div className="flex min-w-0 flex-1 items-center">
                  <span
                    title={name}
                    className={`inline-block max-w-full min-w-0 truncate rounded-md px-2.5 py-1 text-xs font-semibold leading-none ${
                      isMe
                        ? 'bg-[#F1E334] text-gray-900'
                        : 'bg-white/15 text-white/90'
                    }`}
                  >
                    {name}
                  </span>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="text-xs font-medium tabular-nums tracking-[-0.02em] text-white/55">
                    {formatStats(participant.wins, participant.losses)}
                  </span>
                  {phoneDisplay ? (
                    <ParticipantPhoneSheetDialog
                      displayName={name}
                      phone={phoneDisplay}
                    />
                  ) : (
                    <MissingPhoneIcon displayName={name} isMe={isMe} />
                  )}
                </div>
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

      {pool.length > 0 && (
        <div className="mt-4">
          <p className="mb-1 px-1 text-xs font-semibold uppercase tracking-wider text-white/40">
            Nya spelare
          </p>
          <p className="mb-1.5 px-1 text-xs text-white/55">
            Får utmana vem som helst tills första matchen är spelad.
          </p>
          <ul className="border-t border-white/10">
            {pool.map((participant) => {
              const eligibility =
                isMember && !isCompleted && participant.uid !== currentUid
                  ? getChallengeEligibility(
                      ladder.participants,
                      currentUid,
                      participant.uid
                    )
                  : null
              const isChallengeable =
                challengesEnabled && eligibility?.eligible === true
              const isMe = participant.uid === currentUid

              const name = participant.displayName || participant.uid
              const phoneDisplay = resolveParticipantPhoneDisplay(
                participant,
                phonesByUid
              )

              const rowClass = 'flex min-w-0 items-center gap-1 py-2.5 pr-2'

              const rowContent = (
                <>
                  <div className="flex min-w-0 flex-1 items-center">
                    <span
                      title={name}
                      className={`inline-block max-w-full min-w-0 truncate rounded-md px-2.5 py-1 text-xs font-semibold leading-none ${
                        isMe
                          ? 'bg-[#F1E334] text-gray-900'
                          : 'bg-white/15 text-white/90'
                      }`}
                    >
                      {name}
                    </span>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="text-xs font-medium tracking-[-0.02em] text-white/55">
                      Ny
                    </span>
                    {phoneDisplay ? (
                      <ParticipantPhoneSheetDialog
                        displayName={name}
                        phone={phoneDisplay}
                      />
                    ) : (
                      <MissingPhoneIcon displayName={name} isMe={isMe} />
                    )}
                  </div>
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
        </div>
      )}

      {showJoinCta && (
        <div className="mt-4">
          <button
            type="button"
            onClick={() => void onJoin()}
            disabled={isJoining}
            className="flex min-h-[44px] w-full cursor-pointer items-center justify-center rounded-lg border border-[#d4c92e] bg-[#F1E334] px-4 py-2.5 text-sm font-semibold text-gray-900 shadow-sm transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/50"
          >
            {isJoining ? 'Går med…' : 'Gå med i stegen'}
          </button>
        </div>
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
              const phoneDisplay = resolveParticipantPhoneDisplay(
                participant,
                phonesByUid
              )
              return (
                <li
                  key={participant.uid}
                  className="flex min-w-0 items-center gap-1 border-b border-white/10 py-2.5 pr-2"
                >
                  <span className="w-7 shrink-0 text-center text-sm font-semibold leading-none tabular-nums tracking-[-0.02em] text-white/30">
                    —
                  </span>
                  <div className="flex min-w-0 flex-1 items-center">
                    <span
                      title={name}
                      className={`inline-block max-w-full min-w-0 truncate rounded-md px-2.5 py-1 text-xs font-semibold leading-none opacity-50 ${
                        isMe
                          ? 'bg-[#F1E334] text-gray-900'
                          : 'bg-white/15 text-white/90'
                      }`}
                    >
                      {name}
                    </span>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="text-xs font-medium tabular-nums tracking-[-0.02em] text-white/30">
                      {formatStats(participant.wins, participant.losses)}
                    </span>
                    {phoneDisplay ? (
                      <ParticipantPhoneSheetDialog
                        displayName={name}
                        phone={phoneDisplay}
                      />
                    ) : (
                      <MissingPhoneIcon displayName={name} isMe={isMe} />
                    )}
                  </div>
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
      <div className="rounded-xl border border-white/20 bg-white/10 px-4 py-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-xs text-white/60">
              {formatMatchDateHeading(match)}
            </p>
            <div className="mt-0.5">
              {match.winnerId ? (
                <MatchPlayersLine
                  playerA={winnerName}
                  playerB={loserName}
                  tone="dark"
                />
              ) : (
                <p className="text-sm text-white/60">
                  Inget resultat registrerat
                </p>
              )}
            </div>
          </div>
          <span className="inline-flex shrink-0 items-center rounded-full bg-white/15 px-2 py-0.5 text-xs text-white/80">
            Avklarad
          </span>
        </div>
        {match.ladderComment && (
          <p className="mt-2 text-xs italic text-white/55">
            {match.ladderComment}
          </p>
        )}
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-white/20 bg-white/10 px-4 py-3">
      <p className="text-xs text-white/60">{formatMatchDateHeading(match)}</p>
      <div className="mt-0.5">
        <MatchPlayersLine playerA={playerA} playerB={playerB} tone="dark" />
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
  const queryClient = useQueryClient()
  const { addToast } = useToast()
  const [cancelChallengeOpen, setCancelChallengeOpen] = useState(false)
  const [deleteInProgress, setDeleteInProgress] = useState(false)

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

  async function handleConfirmDeleteChallenge() {
    setCancelChallengeOpen(false)
    setDeleteInProgress(true)
    try {
      await deleteMemberBooking(match.id)
      await queryClient.invalidateQueries({ queryKey: BOOKINGS_QUERY_KEY })
      await queryClient.invalidateQueries({
        queryKey: LADDER_MATCHES_QUERY_KEY(ladderId),
      })
      addToast('Utmaning avbruten')
      onCollapse()
    } catch {
      addToast('Kunde inte ta bort bokningen.', 'error')
    } finally {
      setDeleteInProgress(false)
    }
  }

  return (
    <>
      <div className="overflow-hidden rounded-xl border border-white/20 bg-white/10 text-white">
        <button
          type="button"
          onClick={() => toggleHeader()}
          aria-expanded={expanded}
          aria-label={
            expanded
              ? 'Stäng rapportformulär'
              : 'Rapportera resultat, öppna formulär'
          }
          className={`flex min-h-[44px] w-full items-center gap-2 py-3 pl-4 pr-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/35 ${
            expanded ? 'bg-black/20 backdrop-blur-sm' : 'hover:bg-white/10'
          }`}
        >
          <div className="min-w-0 flex-1">
            <p className="text-xs text-white/60">
              {formatMatchDateHeading(match)}
            </p>
            <div className="mt-0.5">
              <MatchPlayersLine
                playerA={playerA}
                playerB={playerB}
                tone="dark"
              />
            </div>
          </div>
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white/60 transition-colors hover:bg-white/15 hover:text-white">
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
              className="border-t border-white/10 bg-black/20 px-4 pb-4 pt-3 backdrop-blur-sm"
              aria-hidden={!expanded}
              inert={expanded ? undefined : true}
            >
              <ReportForm
                match={match}
                ladderId={ladderId}
                onDone={onCollapse}
                embedded
                onDeleteTrashClick={() => setCancelChallengeOpen(true)}
                deleteInProgress={deleteInProgress}
              />
            </div>
          </div>
        </div>
      </div>
      <LadderChallengeCancelSheet
        open={cancelChallengeOpen}
        onCancel={() => setCancelChallengeOpen(false)}
        onConfirm={() => void handleConfirmDeleteChallenge()}
      />
    </>
  )
}

interface ReportFormProps {
  match: LadderMatch
  ladderId: string
  onDone: () => void
  embedded?: boolean
  /** When set with embedded, trash opens parent-owned delete dialog instead of rendering one inside ReportForm */
  onDeleteTrashClick?: () => void
  deleteInProgress?: boolean
}

function ReportForm({
  match,
  ladderId,
  onDone,
  embedded = false,
  onDeleteTrashClick,
  deleteInProgress = false,
}: ReportFormProps) {
  const { addToast } = useToast()
  const queryClient = useQueryClient()
  const [winnerId, setWinnerId] = useState('')
  const [comment, setComment] = useState('')
  const [saving, setSaving] = useState(false)
  const [cancelChallengeOpen, setCancelChallengeOpen] = useState(false)
  const [isDeletingLadder, setIsDeletingLadder] = useState(false)

  const useExternalDeleteDialog = Boolean(embedded && onDeleteTrashClick)

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
        <p
          className={`text-sm font-semibold ${embedded ? 'text-white' : 'text-gray-900'}`}
        >
          Vinnare
        </p>
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
                className={`min-h-[44px] cursor-pointer rounded-lg px-2 py-2 text-center text-sm font-semibold transition-all ${
                  selected
                    ? embedded
                      ? 'border-2 border-[#d4c92e] bg-[#F1E334] text-gray-900 shadow-sm'
                      : 'border-2 border-gray-900 bg-[#F1E334] text-gray-900'
                    : embedded
                      ? 'border border-white/20 bg-transparent text-white hover:border-white/40 hover:bg-transparent'
                      : 'border-2 border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50/90'
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
          className={
            embedded
              ? 'w-full rounded-lg border border-white/20 bg-transparent px-3 py-2 text-sm text-white placeholder-white/45 focus:border-white/40 focus:outline-none focus:ring-2 focus:ring-white/20'
              : 'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-gray-500 focus:outline-none'
          }
        />
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() =>
              useExternalDeleteDialog
                ? onDeleteTrashClick?.()
                : setCancelChallengeOpen(true)
            }
            disabled={saving || isDeletingLadder || deleteInProgress}
            aria-label="Avbryt utmaning"
            title="Avbryt utmaning"
            className={
              embedded
                ? 'flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-lg text-white/70 transition-colors hover:bg-red-500/15 hover:text-red-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/40 disabled:cursor-not-allowed disabled:opacity-40'
                : 'flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-gray-200 text-gray-500 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-40'
            }
          >
            <IconTrash size={20} stroke={1.75} aria-hidden />
          </button>
          <div className="ml-auto flex gap-2">
            <button
              type="button"
              onClick={onDone}
              className={
                embedded
                  ? 'min-h-[44px] cursor-pointer rounded-lg px-4 text-sm font-medium text-white/90 transition-colors hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/40'
                  : 'min-h-[44px] cursor-pointer rounded-lg border border-gray-200 px-4 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50'
              }
            >
              Avbryt
            </button>
            <button
              type="submit"
              disabled={!winnerId || saving}
              className={
                embedded
                  ? 'min-h-[44px] cursor-pointer rounded-lg border border-[#d4c92e] bg-[#F1E334] px-5 text-sm font-semibold text-gray-900 shadow-sm transition-opacity hover:opacity-90 active:opacity-100 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/50'
                  : 'min-h-[44px] cursor-pointer rounded-lg border border-[#0f3019] bg-[#194b29] px-5 text-sm font-semibold text-white shadow-sm transition-[filter,box-shadow] hover:brightness-110 active:brightness-95 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:brightness-100'
              }
            >
              {saving ? 'Sparar…' : 'Spara'}
            </button>
          </div>
        </div>
      </form>
      {!useExternalDeleteDialog && (
        <LadderChallengeCancelSheet
          open={cancelChallengeOpen}
          onCancel={() => setCancelChallengeOpen(false)}
          onConfirm={() => {
            setCancelChallengeOpen(false)
            void handleDeleteLadderBooking()
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
  const { settings: appSettings } = useAppSettings()

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
  const [archivedLadderId, setArchivedLadderId] = useState<string | null>(null)
  const [archiveExpanded, setArchiveExpanded] = useState(false)
  const [joinWelcomeBannerDismissed, setJoinWelcomeBannerDismissed] =
    useState(false)

  const { data: profile } = useQuery({
    queryKey: [PROFILE_QUERY_KEY, user?.uid],
    queryFn: () => getProfile(user!.uid),
    enabled: !!user?.uid,
  })

  const { data: allLadders = [], isLoading: laddersLoading } = useQuery({
    queryKey: LADDERS_QUERY_KEY,
    queryFn: getAllLadders,
    enabled: !!user,
  })

  const activeLadder = useMemo(
    () => allLadders.find((l) => l.status === 'active') ?? null,
    [allLadders]
  )

  useEffect(() => {
    if (!activeLadder) {
      setJoinWelcomeBannerDismissed(false)
      return
    }
    setJoinWelcomeBannerDismissed(
      getJoinWelcomeBannerDismissedLadderId() === activeLadder.id
    )
  }, [activeLadder])

  const completedLadders = useMemo(
    () =>
      allLadders
        .filter((l) => l.status === 'completed')
        .sort((a, b) => b.year - a.year),
    [allLadders]
  )

  const effectiveArchivedLadderId = useMemo(() => {
    if (completedLadders.length === 0) return null
    if (
      archivedLadderId &&
      completedLadders.some((l) => l.id === archivedLadderId)
    ) {
      return archivedLadderId
    }
    return null
  }, [completedLadders, archivedLadderId])

  const archivedLadder =
    completedLadders.find((l) => l.id === effectiveArchivedLadderId) ?? null

  const participantUids = useMemo(() => {
    const set = new Set<string>()
    activeLadder?.participants.forEach((p) => set.add(p.uid))
    archivedLadder?.participants.forEach((p) => set.add(p.uid))
    return [...set]
  }, [activeLadder, archivedLadder])

  const participantProfileQueries = useQueries({
    queries: participantUids.map((uid) => ({
      queryKey: [PROFILE_QUERY_KEY, uid],
      queryFn: () => getProfile(uid),
    })),
  })

  const phonesByUid = useMemo(() => {
    const map: Record<string, string | null> = {}
    for (const q of participantProfileQueries) {
      if (q.data) map[q.data.uid] = q.data.phone ?? null
    }
    return map
  }, [participantProfileQueries])

  const archivedLadderOptions = useMemo(
    () => [
      { value: '', label: 'Välj stege' },
      ...completedLadders.map((l) => ({
        value: l.id,
        label: `${l.name} (Avslutad)`,
      })),
    ],
    [completedLadders]
  )

  const { data: activeMatches = [] } = useQuery({
    queryKey: activeLadder
      ? LADDER_MATCHES_QUERY_KEY(activeLadder.id)
      : ['ladder', 'matches', 'none'],
    queryFn: () =>
      activeLadder ? getLadderMatches(activeLadder.id) : Promise.resolve([]),
    enabled: !!activeLadder,
    staleTime: 2 * 60 * 1000,
  })

  const { data: archivedMatches = [] } = useQuery({
    queryKey: effectiveArchivedLadderId
      ? LADDER_MATCHES_QUERY_KEY(effectiveArchivedLadderId)
      : ['ladder', 'matches', 'none'],
    queryFn: () =>
      effectiveArchivedLadderId
        ? getLadderMatches(effectiveArchivedLadderId)
        : Promise.resolve([]),
    enabled: !!effectiveArchivedLadderId,
    staleTime: 2 * 60 * 1000,
  })

  const { data: existingBookings = [] } = useQuery({
    queryKey: BOOKINGS_QUERY_KEY,
    queryFn: getUpcomingBookings,
  })

  const ladderJoinOpenNow = isLadderJoinOpenNow(
    { joinOpensAt: activeLadder?.joinOpensAt ?? null },
    new Date()
  )
  const challengeOpenNow = isLadderChallengeOpenNow(
    { tournamentStartsAt: activeLadder?.tournamentStartsAt ?? null },
    { bookingEnabled: appSettings?.bookingEnabled ?? true },
    new Date()
  )
  const tournamentStartsAt = activeLadder?.tournamentStartsAt ?? null
  const ladderJoinOpensAt = activeLadder?.joinOpensAt ?? null
  const ladderJoinOpenDateLabel =
    ladderJoinOpensAt != null
      ? new Intl.DateTimeFormat('sv-SE', { dateStyle: 'long' }).format(
          ladderJoinOpensAt.toDate()
        )
      : ''

  const archivedCompletedMatches = useMemo(
    () =>
      archivedMatches
        .filter((m) => m.ladderStatus === 'completed')
        .sort((a, b) => b.startTime.toMillis() - a.startTime.toMillis()),
    [archivedMatches]
  )

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

  const myParticipant = activeLadder?.participants.find(
    (p) => p.uid === user.uid
  )

  const plannedMatches = activeMatches
    .filter((m) => m.ladderStatus === 'planned')
    .sort((a, b) => a.startTime.toMillis() - b.startTime.toMillis())

  const completedMatches = activeMatches
    .filter((m) => m.ladderStatus === 'completed')
    .sort((a, b) => b.startTime.toMillis() - a.startTime.toMillis())

  /** Pre-season: hide empty rankings/matches until signup opens or there is data. */
  const showLadderMainColumns =
    activeLadder &&
    (ladderJoinOpenNow ||
      activeLadder.participants.length > 0 ||
      plannedMatches.length > 0 ||
      completedMatches.length > 0)

  async function handleJoin() {
    if (!activeLadder) return
    setIsJoining(true)
    try {
      await joinLadder(
        activeLadder.id,
        user!.uid,
        user!.displayName ?? '',
        formatPhoneForStorage(profile?.phone ?? '') ?? null
      )
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
    challengeOpponentUid && activeLadder
      ? activeLadder.participants.find((p) => p.uid === challengeOpponentUid)
      : null

  async function handleLadderMobileSubmit(
    date: string,
    startTime: string,
    endTime: string
  ) {
    if (!activeLadder || !challengeOpponentUid || !challengeOpponent || !user)
      return
    if (
      !isLadderChallengeOpenNow(
        { tournamentStartsAt: activeLadder.tournamentStartsAt },
        { bookingEnabled: appSettings?.bookingEnabled ?? true },
        new Date()
      )
    ) {
      throw new Error('Utmaningar är inte öppna ännu.')
    }
    const resolved = resolveBookingInterval(date, startTime, endTime)
    if (!resolved) {
      throw new Error('Sluttiden måste vara efter starttiden.')
    }
    const { start, end } = resolved
    await queryClient.refetchQueries({ queryKey: BOOKINGS_QUERY_KEY })
    const freshBookings =
      queryClient.getQueryData<typeof existingBookings>(BOOKINGS_QUERY_KEY) ??
      existingBookings
    const conflict = findConflictingBooking(freshBookings, start, end)
    if (conflict) {
      throw new Error(`Det finns redan en bokning som överlappar med vald tid.`)
    }
    await createLadderMatch(
      activeLadder.id,
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
      queryKey: LADDER_MATCHES_QUERY_KEY(activeLadder.id),
    })
    await queryClient.invalidateQueries({ queryKey: BOOKINGS_QUERY_KEY })
    addToast('Match bokad!')
  }

  return (
    <div>
      <main className="px-4 py-6">
        <div className="mx-auto max-w-lg space-y-6 md:max-w-3xl">
          {/* Steg: aktiv vy + arkiv */}
          {laddersLoading ? (
            <GlassNoticeCard>
              <div className="flex justify-center px-4 py-10">
                <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-white/25 border-t-white" />
              </div>
            </GlassNoticeCard>
          ) : allLadders.length === 0 ? (
            <GlassNoticeCard>
              <div className="px-6 py-10 text-center">
                <p className="font-display mb-4 text-[20px] font-bold uppercase tracking-wide text-white">
                  Ingen aktiv stege
                </p>
                <p className="mt-2 text-sm text-white/70">
                  Det finns ingen pågående stegturnering.
                </p>
              </div>
            </GlassNoticeCard>
          ) : (
            <>
              {!activeLadder && (
                <GlassNoticeCard>
                  <div className="px-6 py-10 text-center">
                    <p className="font-display mb-4 text-[20px] font-bold uppercase tracking-wide text-white">
                      Ingen aktiv stege
                    </p>
                    <p className="mt-2 text-sm text-white/70">
                      Det finns ingen pågående stegturnering.
                      {completedLadders.length > 0
                        ? ' Tidigare resultat hittar du under Gamla turneringar nedan.'
                        : ''}
                    </p>
                  </div>
                </GlassNoticeCard>
              )}

              {/* Välkommen: banner med gå-med-knapp (går att dölja); samma åtgärd under Tabellen */}
              {activeLadder &&
                !myParticipant &&
                ladderJoinOpenNow &&
                !joinWelcomeBannerDismissed &&
                (appSettings?.stegenJoinWelcomeBannerVisible ?? true) && (
                  <GlassNoticeCard
                    action={
                      <button
                        type="button"
                        onClick={() => void handleJoin()}
                        disabled={isJoining}
                        className="flex min-h-[44px] w-full items-center justify-start px-6 py-2.5 font-semibold text-white transition-opacity hover:opacity-80 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/50"
                      >
                        {isJoining ? 'Går med…' : 'Gå med i stegen'}
                      </button>
                    }
                  >
                    <div className="relative px-6 py-4 pr-14">
                      <button
                        type="button"
                        onClick={() => {
                          if (!activeLadder) return
                          dismissJoinWelcomeBannerForLadder(activeLadder.id)
                          setJoinWelcomeBannerDismissed(true)
                        }}
                        aria-label="Dölj meddelande"
                        className="absolute top-2 right-2 flex h-10 w-10 cursor-pointer items-center justify-center rounded-lg text-white/70 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/40"
                      >
                        <IconX size={20} stroke={1.75} aria-hidden />
                      </button>
                      <p className="pr-2 font-semibold text-white">
                        Välkommen till stegen!
                      </p>
                      <p className="mt-0.5 text-white/70">
                        Utmana andra spelare och klättra i rankingen. Du kan
                        också gå med under Tabellen nedan.
                      </p>
                    </div>
                  </GlassNoticeCard>
                )}

              {/* Pre-season: anmälan inte öppen ännu (join när öppet sker under Tabellen) */}
              {activeLadder && !myParticipant && !ladderJoinOpenNow && (
                <GlassNoticeCard>
                  <div className="px-6 py-4">
                    <p className="font-semibold text-white">
                      Anmälan öppnar snart
                    </p>
                    <p className="mt-0.5 text-white/70">
                      {ladderJoinOpenDateLabel
                        ? `Anmälan öppnar ${ladderJoinOpenDateLabel}. Du kan då gå med i stegen under Tabellen.`
                        : 'Anmälan är inte öppen ännu.'}
                    </p>
                  </div>
                </GlassNoticeCard>
              )}

              {activeLadder &&
                (appSettings?.bookingEnabled ?? true) &&
                !challengeOpenNow &&
                tournamentStartsAt && (
                  <GlassNoticeCard>
                    <div className="px-6 py-4">
                      <p className="font-semibold text-white">
                        Stegen öppnas för matchspel den{' '}
                        {new Intl.DateTimeFormat('sv-SE', {
                          dateStyle: 'long',
                        }).format(tournamentStartsAt.toDate())}
                      </p>
                    </div>
                  </GlassNoticeCard>
                )}

              {showLadderMainColumns && (
                <div className="flex flex-col gap-6 md:flex-row md:items-start md:gap-8">
                  <section className="min-w-0 w-full rounded-2xl bg-[#194b29] px-4 py-4 md:flex-1">
                    <div className="mb-3 flex items-center justify-between gap-2">
                      <h2 className="text-xs font-semibold uppercase tracking-wider text-white/70">
                        Tabellen
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
                      ladder={activeLadder}
                      currentUid={user.uid}
                      ladderJoinOpenNow={ladderJoinOpenNow}
                      challengesEnabled={challengeOpenNow}
                      isCompleted={false}
                      onJoin={() => void handleJoin()}
                      isJoining={isJoining}
                      phonesByUid={phonesByUid}
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
                              match.playerAId === user.uid ||
                              match.playerBId === user.uid
                            if (isInvolved) {
                              return (
                                <PlannedMatchReportRow
                                  key={match.id}
                                  match={match}
                                  ladderId={activeLadder.id}
                                  expanded={reportingMatch?.id === match.id}
                                  isCompleted={false}
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

              {activeLadder && (
                <LadderStatsCards participants={activeLadder.participants} />
              )}

              {completedLadders.length > 0 && (
                <section className="rounded-2xl bg-[#194b29] px-4 py-4">
                  <div className="flex flex-col gap-3 min-[480px]:flex-row min-[480px]:items-center min-[480px]:justify-between min-[480px]:gap-4">
                    <h2 className="text-xs font-semibold uppercase tracking-wider text-white/70">
                      Gamla turneringar
                    </h2>
                    <MenuSelect
                      value={effectiveArchivedLadderId ?? ''}
                      onChange={(id) => {
                        if (id === '') {
                          setArchivedLadderId(null)
                          setArchiveExpanded(false)
                        } else {
                          setArchivedLadderId(id)
                          setArchiveExpanded(true)
                        }
                      }}
                      options={archivedLadderOptions}
                      ariaLabel="Välj stege"
                      className="w-full shrink-0 min-[480px]:w-auto min-[480px]:max-w-[min(100%,18rem)]"
                      triggerClassName="min-h-[44px] w-full border-white/20 bg-white/10 text-sm font-medium text-white/90 shadow-none ring-0 hover:border-white/30 hover:bg-white/15 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/40 min-[480px]:w-auto"
                    />
                  </div>

                  {archiveExpanded && archivedLadder && (
                    <div className="mt-4 flex flex-col gap-6 border-t border-white/10 pt-4 md:flex-row md:items-start md:gap-8">
                      <section className="min-w-0 w-full rounded-2xl bg-[#194b29] px-4 py-4 md:flex-1">
                        <div className="mb-3">
                          <h3 className="text-xs font-semibold uppercase tracking-wider text-white/70">
                            Tabellen
                          </h3>
                          <p className="mt-1 text-sm font-medium text-white/90">
                            {archivedLadder.name}
                          </p>
                        </div>
                        <RankingsTable
                          ladder={archivedLadder}
                          currentUid={user.uid}
                          ladderJoinOpenNow={false}
                          challengesEnabled={false}
                          isCompleted
                          phonesByUid={phonesByUid}
                          onChallenge={() => {}}
                        />
                      </section>

                      <div className="min-w-0 w-full rounded-2xl bg-[#194b29] px-4 py-4 md:flex-1">
                        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-white/70">
                          Spelade matcher
                        </h3>
                        {archivedCompletedMatches.length > 0 ? (
                          <div className="space-y-2">
                            {archivedCompletedMatches.map((match) => (
                              <MatchCard key={match.id} match={match} />
                            ))}
                          </div>
                        ) : (
                          <div className="rounded-xl border border-dashed border-white/20 px-4 py-10 text-center text-sm">
                            <p className="text-white/60">
                              Inga spelade stegmatcher för den här turneringen.
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </section>
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
        activeLadder &&
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
        activeLadder &&
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
                  queryKey: LADDER_MATCHES_QUERY_KEY(activeLadder.id),
                })
                void queryClient.invalidateQueries({
                  queryKey: BOOKINGS_QUERY_KEY,
                })
                addToast('Match bokad!')
              }}
              user={user}
              ladderMeta={{
                ladderId: activeLadder.id,
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
