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
  return `${startTime}–${endTime}`
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
  const [confirmPending, setConfirmPending] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  async function handleDelete() {
    setIsDeleting(true)
    setDeleteError(null)
    try {
      if (booking.type === 'member') {
        await deleteMemberBooking(booking.id)
      } else {
        await deleteGuestBooking(booking.id)
      }
      await queryClient.invalidateQueries({ queryKey: BOOKINGS_QUERY_KEY })
    } catch {
      setDeleteError('Kunde inte ta bort bokningen.')
      setConfirmPending(false)
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <li>
      {/* Main row */}
      <div className="flex items-center gap-3 rounded-xl bg-white px-3 py-2 shadow-sm border border-gray-100">
        <span className="shrink-0 text-sm font-medium text-gray-800">
          {formatTimeRange(booking)}
        </span>
        <span
          className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${
            isOwnBooking
              ? 'bg-[#F1E334] text-gray-900'
              : 'bg-gray-100 text-gray-600'
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
                ? 'bg-red-100 text-red-600'
                : 'text-gray-300 hover:bg-red-50 hover:text-red-400'
            }`}
          >
            <IconTrash size={15} stroke={1.75} />
          </button>
        )}
      </div>

      {/* Confirm strip — below the row, no overflow risk */}
      {canDelete && confirmPending && (
        <div className="mt-1 flex items-center justify-end gap-2 rounded-xl border border-red-100 bg-red-50 px-4 py-2.5">
          <span className="mr-auto text-xs text-red-700">
            Radera bokningen?
          </span>
          <button
            onClick={() => setConfirmPending(false)}
            disabled={isDeleting}
            className="flex min-h-[32px] cursor-pointer items-center rounded-lg bg-white px-3 py-1 text-xs font-semibold text-gray-600 shadow-sm transition-colors hover:bg-gray-50 disabled:opacity-50"
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
      )}

      {deleteError && (
        <div className="mt-1 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">
          {deleteError}
        </div>
      )}
    </li>
  )
}
