import { useCallback, useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  getBookingsByYear,
  getAllBookings,
  type BookingWithId,
} from '../../services/BookingService'
import { computeStats } from './historyStats'

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

  const handleResult = useCallback((result: YearQueryResult) => {
    setResults((prev) => {
      const next = new Map(prev)
      next.set(result.year, result)
      return next
    })
  }, [])

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

const LINE_COLORS = [
  '#F1E334',
  '#60a5fa',
  '#f97316',
  '#34d399',
  '#e879f9',
  '#fb7185',
]

function getMonthAbbr(monthIndex: number): string {
  return new Date(2000, monthIndex, 1).toLocaleDateString('sv-SE', {
    month: 'short',
  })
}

function buildChartData(
  byYearByMonth: Record<number, Record<number, number>>,
  selectedYears: number[]
): Record<string, string | number>[] {
  // Collect all active month indices across all selected years
  const activeMonthsSet = new Set<number>()
  for (const year of selectedYears) {
    const byMonth = byYearByMonth[year]
    if (byMonth) {
      for (const monthKey of Object.keys(byMonth)) {
        activeMonthsSet.add(Number(monthKey))
      }
    }
  }

  const activeMonths = Array.from(activeMonthsSet).sort((a, b) => a - b)

  return activeMonths.map((monthIndex) => {
    const row: Record<string, string | number> = {
      month: getMonthAbbr(monthIndex),
    }
    for (const year of selectedYears) {
      row[String(year)] = byYearByMonth[year]?.[monthIndex] ?? 0
    }
    return row
  })
}

function StatistikTab({ selectedYears }: { selectedYears: number[] }) {
  const { data: allBookings, isLoading } = useQuery({
    queryKey: ['bookings', 'all'],
    queryFn: getAllBookings,
    staleTime: Infinity,
    gcTime: Infinity,
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-gray-700" />
        <span className="ml-3 text-sm text-white/80">Laddar statistik…</span>
      </div>
    )
  }

  const stats = computeStats(allBookings ?? [], selectedYears)
  const chartData = buildChartData(stats.byYearByMonth, selectedYears)
  const hasData = selectedYears.length > 0 && chartData.length > 0

  return (
    <div className="rounded-xl bg-white/10 px-6 py-8">
      <p className="text-4xl font-bold text-white">
        {stats.totalBookings}
        <span className="ml-2 text-xl font-semibold text-white/70">
          bokningar
        </span>
      </p>

      {hasData && (
        <div className="mt-6">
          <ResponsiveContainer width="100%" height={220}>
            <LineChart
              data={chartData}
              margin={{ top: 8, right: 8, left: -16, bottom: 0 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgba(255,255,255,0.1)"
              />
              <XAxis
                dataKey="month"
                tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 12 }}
                axisLine={{ stroke: 'rgba(255,255,255,0.2)' }}
                tickLine={{ stroke: 'rgba(255,255,255,0.2)' }}
              />
              <YAxis
                allowDecimals={false}
                tickFormatter={(v: number) => Math.round(v).toString()}
                tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 12 }}
                axisLine={{ stroke: 'rgba(255,255,255,0.2)' }}
                tickLine={{ stroke: 'rgba(255,255,255,0.2)' }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0f2d19',
                  border: '1px solid rgba(255,255,255,0.15)',
                  borderRadius: '8px',
                  color: '#fff',
                  fontSize: 13,
                }}
                labelStyle={{ color: 'rgba(255,255,255,0.7)', marginBottom: 4 }}
                itemStyle={{ color: '#fff' }}
              />
              <Legend
                wrapperStyle={{ color: 'rgba(255,255,255,0.8)', fontSize: 13 }}
              />
              {selectedYears.map((year, i) => (
                <Line
                  key={year}
                  type="monotone"
                  dataKey={String(year)}
                  stroke={LINE_COLORS[i % LINE_COLORS.length]}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
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
        <StatistikTab selectedYears={selectedYears} />
      )}

      {activeTab === 'historik' && (
        <HistorikTab selectedYears={selectedYears} />
      )}
    </div>
  )
}
