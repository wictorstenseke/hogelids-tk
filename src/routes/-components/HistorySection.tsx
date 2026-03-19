import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  IconSquareRoundedPlus,
  IconSquareRoundedMinus,
} from '@tabler/icons-react'
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

function buildMonthChartData(
  byYearByMonth: Record<number, Record<number, number>>,
  selectedYears: number[]
): Record<string, string | number>[] {
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

function buildYearChartData(
  byYearByMonth: Record<number, Record<number, number>>,
  allYears: number[]
): Record<string, string | number>[] {
  return allYears
    .slice()
    .sort((a, b) => a - b)
    .map((year) => {
      const byMonth = byYearByMonth[year] ?? {}
      const total = Object.values(byMonth).reduce((sum, n) => sum + n, 0)
      return { year: String(year), total }
    })
    .filter((row) => (row.total as number) > 0)
}

const CHART_STYLE = {
  grid: { strokeDasharray: '3 3', stroke: 'rgba(255,255,255,0.1)' },
  axis: { stroke: 'rgba(255,255,255,0.2)' },
  tick: { fill: 'rgba(255,255,255,0.6)', fontSize: 12 },
  tooltip: {
    contentStyle: {
      backgroundColor: '#0f2d19',
      border: '1px solid rgba(255,255,255,0.15)',
      borderRadius: '8px',
      color: '#fff',
      fontSize: 13,
    },
    labelStyle: { color: 'rgba(255,255,255,0.7)', marginBottom: 4 },
    itemStyle: { color: '#fff' },
  },
}

function StatistikTab({
  selectedYears,
  allYears,
  allSelected,
}: {
  selectedYears: number[]
  allYears: number[]
  allSelected: boolean
}) {
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

  const stats = computeStats(
    allBookings ?? [],
    allSelected ? allYears : selectedYears
  )
  const yearChartData = buildYearChartData(stats.byYearByMonth, allYears)
  const monthChartData = buildMonthChartData(stats.byYearByMonth, selectedYears)
  const hasData = allSelected
    ? yearChartData.length > 0
    : monthChartData.length > 0

  return (
    <div>
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
              data={allSelected ? yearChartData : monthChartData}
              margin={{ top: 8, right: 8, left: -16, bottom: 0 }}
            >
              <CartesianGrid {...CHART_STYLE.grid} />
              <XAxis
                dataKey={allSelected ? 'year' : 'month'}
                tick={CHART_STYLE.tick}
                axisLine={CHART_STYLE.axis}
                tickLine={CHART_STYLE.axis}
              />
              <YAxis
                allowDecimals={false}
                tickFormatter={(v: number) => Math.round(v).toString()}
                tick={CHART_STYLE.tick}
                axisLine={CHART_STYLE.axis}
                tickLine={CHART_STYLE.axis}
              />
              <Tooltip {...CHART_STYLE.tooltip} />
              {allSelected ? (
                <Line
                  type="monotone"
                  dataKey="total"
                  stroke="#F1E334"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
              ) : (
                <>
                  <Legend
                    wrapperStyle={{
                      color: 'rgba(255,255,255,0.8)',
                      fontSize: 13,
                    }}
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
                </>
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}

function useRowFit(
  containerRef: React.RefObject<HTMLDivElement | null>,
  deps: number
): number {
  const [visibleCount, setVisibleCount] = useState(Infinity)

  // Phase 2: when all chips are in the DOM (visibleCount === Infinity), measure
  // which ones land on row 1. useLayoutEffect runs synchronously before paint
  // so the two renders (reset → correct) are batched into one visible frame.
  useLayoutEffect(() => {
    if (visibleCount !== Infinity) return
    const el = containerRef.current
    if (!el) return
    const children = Array.from(el.children)
    if (children.length === 0) return
    const firstTop = children[0].getBoundingClientRect().top
    let count = 0
    for (const child of children) {
      if (child.getBoundingClientRect().top > firstTop + 2) break
      count++
    }
    // Subtract "Visa alla" chip (plus button lives outside this container)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setVisibleCount(Math.max(0, count - 1))
  }) // intentionally no deps — runs after every render, noop unless Infinity

  // Phase 1: reset to Infinity so all chips render for measurement.
  // Triggered by container resize or year-list length change.
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver(() => setVisibleCount(Infinity))
    ro.observe(el)
    return () => ro.disconnect()
  }, [containerRef])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setVisibleCount(Infinity)
  }, [deps])

  return visibleCount
}

export function HistorySection({
  currentYear,
  earliestYear,
}: HistorySectionProps) {
  const [activeTab, setActiveTab] = useState<Tab>('statistik')
  const [showAllYears, setShowAllYears] = useState(false)

  const years: number[] = []
  for (let y = currentYear; y >= earliestYear; y--) {
    years.push(y)
  }

  const [selectedYears, setSelectedYears] = useState<number[]>([...years])

  useEffect(() => {
    setSelectedYears([...years])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [earliestYear])

  const allSelected = selectedYears.length === years.length

  const toggleYear = (year: number) => {
    if (allSelected) {
      setSelectedYears([year])
      return
    }
    setSelectedYears((prev) => {
      if (prev.includes(year)) {
        return prev.filter((y) => y !== year)
      }
      return [...prev, year]
    })
  }

  const containerRef = useRef<HTMLDivElement>(null)
  const visibleCount = useRowFit(containerRef, years.length)
  const visibleYears = showAllYears ? years : years.slice(0, visibleCount)
  const hasMoreYears = years.length > visibleCount

  return (
    <div className="rounded-2xl bg-[#194b29] px-4 py-4">
      <h2 className="font-display mb-4 text-[20px] font-bold uppercase tracking-wide text-white">
        Historik &amp; Statistik
      </h2>

      {/* Segmented control */}
      <div className="mb-4 flex rounded-xl bg-white/10 p-1">
        {(['statistik', 'historik'] as Tab[]).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className="flex-1 rounded-lg py-2 text-sm font-semibold transition-colors"
            style={
              activeTab === tab
                ? { backgroundColor: '#F1E334', color: '#111827' }
                : { color: 'rgba(255,255,255,0.6)' }
            }
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Year chips — shared across tabs */}
      <div className="mb-4 flex items-start gap-2">
        {/* Chip area: grows to fill width, wraps year chips */}
        <div
          ref={containerRef}
          className="flex flex-1 flex-wrap items-center gap-2"
        >
          {/* Visa alla */}
          <button
            type="button"
            onClick={() => setSelectedYears([...years])}
            className="grow rounded-xl px-3 py-1.5 text-center text-sm font-semibold transition-colors"
            style={
              allSelected
                ? { backgroundColor: '#F1E334', color: '#111827' }
                : {
                    backgroundColor: 'rgba(255,255,255,0.12)',
                    color: 'rgba(255,255,255,0.6)',
                  }
            }
          >
            Visa alla
          </button>

          {visibleYears.map((year) => {
            const isSelected = !allSelected && selectedYears.includes(year)
            return (
              <button
                key={year}
                type="button"
                onClick={() => toggleYear(year)}
                className="grow rounded-xl px-3 py-1.5 text-center text-sm font-semibold transition-colors"
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

        {/* Plus/minus pinned to right edge */}
        <button
          type="button"
          onClick={() => setShowAllYears((v) => !v)}
          aria-label={showAllYears ? 'Visa färre år' : 'Visa fler år'}
          className={`flex shrink-0 items-center justify-center rounded-xl bg-white/10 p-2 text-white/90 transition-colors hover:bg-white/15 hover:text-white${!hasMoreYears ? ' invisible' : ''}`}
        >
          {showAllYears ? (
            <IconSquareRoundedMinus size={18} stroke={1.75} />
          ) : (
            <IconSquareRoundedPlus size={18} stroke={1.75} />
          )}
        </button>
      </div>

      {/* Tab content */}
      {activeTab === 'statistik' && (
        <StatistikTab
          selectedYears={selectedYears}
          allYears={years}
          allSelected={allSelected}
        />
      )}

      {activeTab === 'historik' && (
        <HistorikTab selectedYears={selectedYears} />
      )}
    </div>
  )
}
