import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { IconTrash } from '@tabler/icons-react'
import {
  deleteGuestBooking,
  deleteMemberBooking,
  BOOKINGS_QUERY_KEY,
  type BookingWithId,
} from '../../services/BookingService'
import type { AuthUser } from '../../lib/useAuth'
import { useToast } from '../../lib/ToastContext'

function formatTimeRange(booking: BookingWithId): string {
  const start = booking.startTime.toDate()
  const end = booking.endTime.toDate()
  const startTime = start.toLocaleTimeString('sv-SE', {
    hour: '2-digit',
    minute: '2-digit',
  })
  const endTime = end.toLocaleTimeString('sv-SE', {
    hour: '2-digit',
    minute: '2-digit',
  })
  return `${startTime} - ${endTime}`
}

function getBookingLabel(
  booking: BookingWithId,
  guestEmail: string | null,
  user: AuthUser | null
): string {
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
  const label = getBookingLabel(booking, guestEmail, user)
  const isOwnBooking =
    (!!guestEmail && booking.ownerEmail === guestEmail) ||
    (!!user && booking.type === 'member' && user.uid === booking.ownerUid)
  const canDelete =
    booking.type === 'guest' ||
    (booking.type === 'member' && !!user && user.uid === booking.ownerUid)

  const queryClient = useQueryClient()
  const { addToast } = useToast()
  const [confirmPending, setConfirmPending] = useState(false)
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
      addToast('Bokning raderad')
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
      <div className="flex items-center gap-3 py-2.5">
        <span className="shrink-0 text-sm font-semibold tabular-nums tracking-[-0.02em] text-white/90">
          {formatTimeRange(booking)}
        </span>
        <span
          className={`shrink-0 rounded-md px-2.5 py-0.5 text-xs font-semibold ${
            isOwnBooking
              ? 'bg-[#F1E334] text-gray-900'
              : 'bg-white/15 text-white/80'
          }`}
        >
          {label}
        </span>
        {canDelete && (
          <button
            onClick={() => setConfirmPending((v) => !v)}
            disabled={isDeleting}
            aria-label="Radera bokning"
            title="Radera bokning"
            className={`ml-auto flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
              confirmPending
                ? 'bg-white/20 text-white'
                : 'text-white/30 hover:bg-white/10 hover:text-white/70'
            }`}
          >
            <IconTrash size={15} stroke={1.75} />
          </button>
        )}
      </div>

      {/* Confirm strip */}
      {canDelete && (
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
                onClick={() => setConfirmPending(false)}
                disabled={isDeleting}
                className="flex min-h-[32px] cursor-pointer items-center rounded-lg bg-white/10 px-3 py-1 text-xs font-semibold text-white/80 transition-colors hover:bg-white/20 disabled:opacity-50"
              >
                Avbryt
              </button>
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
            </div>
          </div>
        </div>
      )}
    </li>
  )
}
