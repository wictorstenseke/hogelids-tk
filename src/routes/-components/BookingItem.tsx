import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { IconTrash } from '@tabler/icons-react'
import {
  deleteGuestBooking,
  deleteMemberBooking,
  BOOKINGS_QUERY_KEY,
  isOwnBooking,
  canDeleteBooking,
  type BookingWithId,
} from '../../services/BookingService'
import { LADDER_MATCHES_QUERY_KEY } from '../../services/LadderService'
import { formatTimeDisplay } from '../../lib/formatTimeDisplay'
import type { AuthUser } from '../../lib/useAuth'
import { useToast } from '../../lib/ToastContext'
import { LadderChallengeCancelSheet } from './LadderChallengeCancelSheet'

function formatTimeRange(booking: BookingWithId): string {
  const start = booking.startTime.toDate()
  const end = booking.endTime.toDate()
  return `${formatTimeDisplay(start)} – ${formatTimeDisplay(end)}`
}

function getBookingLabel(
  booking: BookingWithId,
  guestEmail: string | null,
  user: AuthUser | null
): string {
  if (booking.playerAId) {
    if (!user) return 'Stegmatch'
    return `${booking.playerAName} vs ${booking.playerBName}`
  }
  if (user) {
    if (booking.type === 'member' && user.uid === booking.ownerUid) {
      return user.displayName ?? 'Din bokning'
    }
    if (booking.type === 'member') {
      return booking.ownerDisplayName || booking.ownerEmail || 'Okänd'
    }
    return booking.ownerEmail || 'Gäst'
  }
  if (guestEmail && booking.ownerEmail === guestEmail) {
    return 'Din bokning'
  }
  if (booking.type === 'member') {
    return 'Medlem'
  }
  return booking.ownerEmail || 'Gäst'
}

interface BookingItemProps {
  booking: BookingWithId
  guestEmail: string | null
  user: AuthUser | null
}

export function BookingItem({ booking, guestEmail, user }: BookingItemProps) {
  const isLadder = !!booking.playerAId
  const label = getBookingLabel(booking, guestEmail, user)
  const ownBooking = isOwnBooking(booking, user, guestEmail)
  const deletable = canDeleteBooking(booking, user)

  const queryClient = useQueryClient()
  const { addToast } = useToast()
  const [confirmPending, setConfirmPending] = useState(false)
  const [ladderCancelOpen, setLadderCancelOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  async function handleDelete() {
    setIsDeleting(true)
    try {
      if (booking.type === 'member') {
        await deleteMemberBooking(booking.id)
      } else {
        await deleteGuestBooking(booking.id)
      }
      await queryClient.invalidateQueries({ queryKey: BOOKINGS_QUERY_KEY })
      if (isLadder && booking.ladderId) {
        await queryClient.invalidateQueries({
          queryKey: LADDER_MATCHES_QUERY_KEY(booking.ladderId),
        })
      }
      addToast(isLadder ? 'Utmaning avbruten' : 'Bokning raderad')
    } catch {
      addToast('Kunde inte ta bort bokningen.', 'error')
      setConfirmPending(false)
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <li
      className={`border-b ${confirmPending ? 'border-b-transparent' : 'border-white/10'}`}
    >
      {/* Main row */}
      <div className="flex min-w-0 items-center gap-3 py-2">
        <span className="shrink-0 self-center text-sm font-semibold leading-none tabular-nums tracking-[-0.02em] text-white/90">
          {formatTimeRange(booking)}
        </span>
        <div className="flex min-w-0 flex-1 items-center overflow-hidden self-center">
          <span
            title={label}
            className={`inline-block max-w-full truncate rounded-md px-2.5 py-1 align-middle text-xs font-semibold leading-none ${
              ownBooking
                ? 'bg-[#F1E334] text-gray-900'
                : 'bg-white/15 text-white/80'
            }`}
          >
            {label}
          </span>
        </div>
        {deletable && (
          <button
            onClick={() =>
              isLadder
                ? setLadderCancelOpen(true)
                : setConfirmPending((v) => !v)
            }
            disabled={isDeleting}
            aria-label={isLadder ? 'Avbryt utmaning' : 'Radera bokning'}
            title={isLadder ? 'Avbryt utmaning' : 'Radera bokning'}
            className={`flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
              confirmPending
                ? 'bg-white/20 text-white'
                : 'text-white/30 hover:bg-white/10 hover:text-white/70'
            }`}
          >
            <IconTrash size={15} stroke={1.75} />
          </button>
        )}
      </div>

      {/* Confirm strip — regular bookings only */}
      {deletable && !isLadder && (
        <div
          className={`-mx-4 grid transition-all duration-200 ease-in-out ${
            confirmPending
              ? 'grid-rows-[1fr] opacity-100'
              : 'grid-rows-[0fr] opacity-0'
          }`}
        >
          <div className="overflow-hidden">
            <div className="flex items-center gap-2 bg-[#112e18] px-4 py-2.5">
              <span className="mr-auto text-xs font-medium text-white/70">
                Radera bokningen?
              </span>
              <button
                onClick={() => void handleDelete()}
                disabled={isDeleting}
                className="flex min-h-[32px] cursor-pointer items-center rounded-lg bg-red-500 px-3 py-1 text-xs font-semibold text-white transition-colors hover:bg-red-600 disabled:opacity-50"
              >
                {isDeleting ? (
                  <span className="h-3 w-3 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                ) : (
                  'Radera'
                )}
              </button>
              <button
                onClick={() => setConfirmPending(false)}
                disabled={isDeleting}
                className="flex min-h-[32px] cursor-pointer items-center rounded-lg bg-white/10 px-3 py-1 text-xs font-semibold text-white/80 transition-colors hover:bg-white/20 disabled:opacity-50"
              >
                Avbryt
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm sheet — ladder bookings only */}
      <LadderChallengeCancelSheet
        open={ladderCancelOpen}
        onCancel={() => setLadderCancelOpen(false)}
        onConfirm={() => {
          setLadderCancelOpen(false)
          void handleDelete()
        }}
      />
    </li>
  )
}
