import { useEffect, useState } from 'react'
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

type Tab = 'statistik' | 'historik'

interface YearQueryResult {
  year: number
  data: BookingWithId[] | undefined
  isLoading: boolean
}

function YearBookings({
  year,
  onResult,
}: {
  year: number
  onResult: (result: YearQueryResult) => void
}) {
  const { data, isLoading } = useQuery({
    queryKey: ['bookings', 'history', year],
    queryFn: () => getBookingsByYear(year),
    staleTime: Infinity,
    gcTime: Infinity,
  })

  useEffect(() => {
    onResult({ year, data, isLoading })
  }, [year, data, isLoading, onResult])

  return null
}

function HistorikTab({ selectedYears }: { selectedYears: number[] }) {
  const [results, setResults] = useState<Map<number, YearQueryResult>>(
    new Map()
  )

  const handleResult = (result: YearQueryResult) => {
    setResults((prev) => {
      const next = new Map(prev)
      next.set(result.year, result)
      return next
    })
  }

  const isLoading = selectedYears.some((y) => {
    const r = results.get(y)
    return !r || r.isLoading
  })

  const combinedBookings: BookingWithId[] = []
  for (const year of selectedYears) {
    const r = results.get(year)
    if (r?.data) {
      combinedBookings.push(...r.data)
    }
  }
  combinedBookings.sort(
    (a, b) => a.startTime.toDate().getTime() - b.startTime.toDate().getTime()
  )

  return (
    <>
      {selectedYears.map((year) => (
        <YearBookings key={year} year={year} onResult={handleResult} />
      ))}

      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-gray-700" />
          <span className="ml-3 text-sm text-white/80">Laddar historik…</span>
        </div>
      )}

      {!isLoading && combinedBookings.length === 0 && (
        <div className="rounded-xl border border-dashed border-white/30 bg-white/10 px-4 py-10 text-center text-sm text-white/70">
          Inga bokningar för valda år.
        </div>
      )}

      {!isLoading && combinedBookings.length > 0 && (
        <ul className="space-y-2">
          {combinedBookings.map((booking) => (
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
    </>
  )
}

export function HistorySection({
  currentYear,
  earliestYear,
}: HistorySectionProps) {
  const [activeTab, setActiveTab] = useState<Tab>('historik')

  const years: number[] = []
  for (let y = currentYear; y >= earliestYear; y--) {
    years.push(y)
  }

  const [selectedYears, setSelectedYears] = useState<number[]>([...years])

  const toggleYear = (year: number) => {
    setSelectedYears((prev) => {
      if (prev.includes(year)) {
        return prev.filter((y) => y !== year)
      }
      return [...prev, year]
    })
  }

  return (
    <div>
      <h2 className="font-display mb-4 text-[20px] font-bold uppercase tracking-wide text-white">
        Historik &amp; Statistik
      </h2>

      {/* Tab switcher */}
      <div className="mb-4 flex gap-2">
        {(['statistik', 'historik'] as Tab[]).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className="min-h-[44px] rounded-xl px-5 py-2 text-sm font-semibold capitalize transition-colors"
            style={
              activeTab === tab
                ? { backgroundColor: '#F1E334', color: '#111827' }
                : { backgroundColor: 'rgba(255,255,255,0.12)', color: '#fff' }
            }
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Year chips — shared across tabs */}
      <div className="mb-4 flex flex-wrap gap-2">
        {years.map((year) => {
          const isSelected = selectedYears.includes(year)
          return (
            <button
              key={year}
              type="button"
              onClick={() => toggleYear(year)}
              className="flex min-h-[44px] items-center rounded-xl px-4 py-2 text-sm font-semibold transition-colors"
              style={
                isSelected
                  ? { backgroundColor: '#F1E334', color: '#111827' }
                  : {
                      backgroundColor: 'rgba(255,255,255,0.12)',
                      color: 'rgba(255,255,255,0.5)',
                    }
              }
            >
              {year}
            </button>
          )
        })}
      </div>

      {/* Tab content */}
      {activeTab === 'statistik' && (
        <div className="rounded-xl border border-dashed border-white/30 bg-white/10 px-4 py-10 text-center text-sm text-white/40">
          Statistik laddas…
        </div>
      )}

      {activeTab === 'historik' && (
        <HistorikTab selectedYears={selectedYears} />
      )}
    </div>
  )
}
