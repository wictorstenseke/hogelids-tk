import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  getBookingsByYear,
  type BookingWithId,
} from '../../services/BookingService'

interface HistorySectionProps {
  currentYear: number
  earliestYear: number
}

function formatHistoryDateRange(booking: BookingWithId): string {
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

  const capitalized = dateStr.charAt(0).toUpperCase() + dateStr.slice(1)

  return `${capitalized} · ${startTime}–${endTime}`
}

export function HistorySection({
  currentYear,
  earliestYear,
}: HistorySectionProps) {
  const [selectedYear, setSelectedYear] = useState(currentYear)

  const years: number[] = []
  for (let y = currentYear; y >= earliestYear; y--) {
    years.push(y)
  }

  const { data: bookings, isLoading } = useQuery({
    queryKey: ['bookings', 'history', selectedYear],
    queryFn: () => getBookingsByYear(selectedYear),
  })

  return (
    <div>
      <h2 className="font-display mb-4 text-[20px] font-bold uppercase tracking-wide text-white">
        Historik
      </h2>

      {/* Year picker */}
      <div className="mb-4 flex flex-wrap gap-2">
        {years.map((year) => (
          <button
            key={year}
            type="button"
            onClick={() => setSelectedYear(year)}
            className="flex min-h-[44px] items-center rounded-xl px-4 py-2 text-sm font-semibold transition-colors"
            style={
              selectedYear === year
                ? { backgroundColor: '#F1E334', color: '#111827' }
                : { backgroundColor: '#fff', color: '#374151' }
            }
          >
            {year}
          </button>
        ))}
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-gray-700" />
          <span className="ml-3 text-sm text-white/80">Laddar historik…</span>
        </div>
      )}

      {!isLoading && bookings && bookings.length === 0 && (
        <div className="rounded-xl border border-dashed border-white/30 bg-white/10 px-4 py-10 text-center text-sm text-white/70">
          Inga bokningar det här året.
        </div>
      )}

      {!isLoading && bookings && bookings.length > 0 && (
        <ul className="space-y-2">
          {bookings.map((booking) => (
            <li key={booking.id}>
              <div className="flex items-center justify-between rounded-xl bg-white px-4 py-3 shadow-sm">
                <span className="text-sm text-gray-700">
                  {formatHistoryDateRange(booking)}
                </span>
                <span className="ml-4 shrink-0 rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600">
                  {booking.ownerDisplayName}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
