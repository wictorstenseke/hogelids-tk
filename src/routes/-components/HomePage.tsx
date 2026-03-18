import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  getUpcomingBookings,
  BOOKINGS_QUERY_KEY,
  type BookingWithId,
} from '../../services/BookingService'
import { BookingForm } from './BookingForm'
import { SuccessDialog } from './SuccessDialog'

function formatDateRange(booking: BookingWithId): string {
  const start = booking.startTime.toDate()
  const end = booking.endTime.toDate()

  const dateStr = start.toLocaleDateString('sv-SE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })

  const startTime = start.toLocaleTimeString('sv-SE', {
    hour: '2-digit',
    minute: '2-digit',
  })
  const endTime = end.toLocaleTimeString('sv-SE', {
    hour: '2-digit',
    minute: '2-digit',
  })

  // Capitalize first letter of weekday
  const capitalized = dateStr.charAt(0).toUpperCase() + dateStr.slice(1)

  return `${capitalized} · ${startTime}–${endTime}`
}

function getBookingLabel(
  booking: BookingWithId,
  guestEmail: string | null
): string {
  if (guestEmail && booking.ownerEmail === guestEmail) {
    return 'Din bokning'
  }
  if (booking.type === 'member') {
    return booking.ownerDisplayName
  }
  return 'Banan bokad'
}

function BookingItem({
  booking,
  guestEmail,
}: {
  booking: BookingWithId
  guestEmail: string | null
}) {
  const label = getBookingLabel(booking, guestEmail)
  const isOwnBooking = !!guestEmail && booking.ownerEmail === guestEmail

  return (
    <li className="flex items-center justify-between rounded-xl bg-white px-4 py-3 shadow-sm">
      <span className="text-sm text-gray-700">{formatDateRange(booking)}</span>
      <span
        className={`ml-4 shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${
          isOwnBooking
            ? 'bg-[#F1E334] text-gray-900'
            : 'bg-gray-100 text-gray-600'
        }`}
      >
        {label}
      </span>
    </li>
  )
}

export function HomePage() {
  const guestEmail = localStorage.getItem('htk_guest_email')
  const queryClient = useQueryClient()
  const [successBooking, setSuccessBooking] = useState<{
    startTime: Date
    endTime: Date
  } | null>(null)

  const {
    data: bookings,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: BOOKINGS_QUERY_KEY,
    queryFn: getUpcomingBookings,
  })

  function handleSuccess(startTime: Date, endTime: Date) {
    void queryClient.invalidateQueries({ queryKey: BOOKINGS_QUERY_KEY })
    setSuccessBooking({ startTime, endTime })
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="mx-auto max-w-lg px-4 py-5">
          <div className="flex items-center gap-3">
            <div
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
              style={{ backgroundColor: '#F1E334' }}
            >
              <span className="text-sm font-bold text-gray-900">H</span>
            </div>
            <h1 className="text-xl font-bold tracking-tight text-gray-900">
              Högelids Tennisklubb
            </h1>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="mx-auto max-w-lg px-4 py-6 space-y-6">
        <BookingForm
          existingBookings={bookings ?? []}
          onSuccess={handleSuccess}
        />

        <div>
          <h2 className="mb-4 text-lg font-semibold text-gray-800">
            Kommande bokningar
          </h2>

          {isLoading && (
            <div className="flex items-center justify-center py-12">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-gray-700" />
              <span className="ml-3 text-sm text-gray-500">
                Laddar bokningar…
              </span>
            </div>
          )}

          {isError && (
            <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-4 text-sm text-red-700">
              Kunde inte hämta bokningar.{' '}
              {error instanceof Error ? error.message : 'Okänt fel.'}
            </div>
          )}

          {!isLoading && !isError && bookings && bookings.length === 0 && (
            <div className="rounded-xl border border-dashed border-gray-200 bg-white px-4 py-10 text-center text-sm text-gray-400">
              Inga kommande bokningar.
            </div>
          )}

          {!isLoading && !isError && bookings && bookings.length > 0 && (
            <ul className="space-y-2">
              {bookings.map((booking) => (
                <BookingItem
                  key={booking.id}
                  booking={booking}
                  guestEmail={guestEmail}
                />
              ))}
            </ul>
          )}
        </div>
      </main>

      {successBooking && (
        <SuccessDialog
          startTime={successBooking.startTime}
          endTime={successBooking.endTime}
          onClose={() => setSuccessBooking(null)}
        />
      )}
    </div>
  )
}
