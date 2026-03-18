import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
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
      return 'Din bokning'
    }
    if (booking.type === 'member') {
      return booking.ownerDisplayName
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
    <li className="space-y-1">
      <div className="flex items-center justify-between rounded-xl bg-white px-4 py-3 shadow-sm border border-gray-100">
        <span className="text-sm font-medium text-gray-800">
          {formatTimeRange(booking)}
        </span>
        <div className="ml-4 flex shrink-0 items-center gap-2">
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              isOwnBooking
                ? 'bg-[#F1E334] text-gray-900'
                : 'bg-gray-100 text-gray-600'
            }`}
          >
            {label}
          </span>
          {canDelete && !confirmPending && (
            <button
              onClick={() => setConfirmPending(true)}
              disabled={isDeleting}
              aria-label="Avboka"
              title="Avboka"
              className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <span className="text-lg leading-none">×</span>
            </button>
          )}
          {canDelete && confirmPending && (
            <div className="flex items-center gap-1">
              <button
                onClick={() => void handleDelete()}
                disabled={isDeleting}
                className="flex min-h-[36px] cursor-pointer items-center rounded-lg bg-red-500 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-red-600 disabled:opacity-50"
              >
                {isDeleting ? (
                  <span className="h-3 w-3 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                ) : (
                  'Radera bokning'
                )}
              </button>
              <button
                onClick={() => setConfirmPending(false)}
                disabled={isDeleting}
                className="flex min-h-[36px] cursor-pointer items-center rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-semibold text-gray-700 transition-colors hover:bg-gray-200 disabled:opacity-50"
              >
                Avbryt
              </button>
            </div>
          )}
        </div>
      </div>
      {deleteError && (
        <div className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">
          {deleteError}
        </div>
      )}
    </li>
  )
}
