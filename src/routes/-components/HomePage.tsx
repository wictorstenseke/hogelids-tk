import { useEffect, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  getUpcomingBookings,
  getEarliestBookingYear,
  BOOKINGS_QUERY_KEY,
  type BookingWithId,
} from '../../services/BookingService'
import { getProfile, PROFILE_QUERY_KEY } from '../../services/ProfileService'
import { getActiveLadder, LADDER_QUERY_KEY } from '../../services/LadderService'
import { getEmail } from '../../lib/GuestSession'
import { useAuth, type AuthUser } from '../../lib/useAuth'
import { useAppSettings } from '../../lib/useAppSettings'
import { BookingForm } from './BookingForm'
import { Banner } from './Banner'
import { SuccessDialog } from './SuccessDialog'
import { HistorySection } from './HistorySection'
import { BookingItem } from './BookingItem'

function formatDateHeader(date: Date): string {
  const str = date.toLocaleDateString('sv-SE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
  return str.charAt(0).toUpperCase() + str.slice(1)
}

function groupBookingsByDate(
  bookings: BookingWithId[]
): { dateKey: string; dateLabel: string; bookings: BookingWithId[] }[] {
  const groups: {
    dateKey: string
    dateLabel: string
    bookings: BookingWithId[]
  }[] = []
  const map = new Map<string, (typeof groups)[0]>()

  for (const booking of bookings) {
    const date = booking.startTime.toDate()
    const dateKey = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
    if (!map.has(dateKey)) {
      const group = { dateKey, dateLabel: formatDateHeader(date), bookings: [] }
      map.set(dateKey, group)
      groups.push(group)
    }
    map.get(dateKey)!.bookings.push(booking)
  }

  return groups
}

type UpcomingGroup = {
  dateKey: string
  dateLabel: string
  bookings: BookingWithId[]
}

function UpcomingBookingsSection({
  isLoading,
  isError,
  error,
  bookings,
  groups,
  effectiveGuestEmail,
  user,
}: {
  isLoading: boolean
  isError: boolean
  error: unknown
  bookings: BookingWithId[] | undefined
  groups: UpcomingGroup[]
  effectiveGuestEmail: string | null
  user: AuthUser | null
}) {
  return (
    <>
      <h2 className="font-display mb-4 text-[20px] font-bold uppercase tracking-wide text-white">
        Kommande bokningar
      </h2>

      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-white/40 border-t-white" />
          <span className="ml-3 text-sm text-white/80">Laddar bokningar…</span>
        </div>
      )}

      {isError && (
        <div className="rounded-xl border border-red-400/40 bg-red-900/30 px-4 py-4 text-sm text-red-200">
          Kunde inte hämta bokningar.{' '}
          {error instanceof Error ? error.message : 'Okänt fel.'}
        </div>
      )}

      {!isLoading && !isError && bookings && bookings.length === 0 && (
        <div className="rounded-xl border border-dashed border-white/20 px-4 py-10 text-center text-sm text-white/60">
          Banan är ledig! Passa på att boka.
        </div>
      )}

      {!isLoading && !isError && groups.length > 0 && (
        <div className="space-y-6">
          {groups.map((group) => (
            <div key={group.dateKey}>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-white/70">
                {group.dateLabel}
              </p>
              <ul className="border-t border-white/10">
                {group.bookings.map((booking) => (
                  <BookingItem
                    key={booking.id}
                    booking={booking}
                    guestEmail={effectiveGuestEmail}
                    user={user}
                  />
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </>
  )
}

export function HomePage() {
  const [guestEmail, setGuestEmail] = useState(getEmail)
  const queryClient = useQueryClient()
  const { user } = useAuth()
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
    staleTime: 1000 * 60 * 2,
  })

  const { settings: appSettings } = useAppSettings()

  const currentYear = new Date().getFullYear()

  const { data: earliestYear } = useQuery({
    queryKey: ['bookings', 'earliestYear'],
    queryFn: getEarliestBookingYear,
    staleTime: Infinity,
    gcTime: Infinity,
  })

  // Prefetch profile and ladder as soon as user is known
  useEffect(() => {
    if (!user) return
    void queryClient.prefetchQuery({
      queryKey: [PROFILE_QUERY_KEY, user.uid],
      queryFn: () => getProfile(user.uid),
      staleTime: 1000 * 60 * 10,
    })
    void queryClient.prefetchQuery({
      queryKey: LADDER_QUERY_KEY,
      queryFn: getActiveLadder,
      staleTime: 1000 * 60 * 5,
    })
  }, [user, queryClient])

  // When logged in, ignore any stored guest email
  const effectiveGuestEmail = user ? null : guestEmail

  function handleSuccess(startTime: Date, endTime: Date) {
    setGuestEmail(getEmail())
    void queryClient.invalidateQueries({ queryKey: BOOKINGS_QUERY_KEY })
    setSuccessBooking({ startTime, endTime })
  }

  const groups = bookings ? groupBookingsByDate(bookings) : []

  return (
    <div className="min-h-screen">
      {/* Main content */}
      <main className="mx-auto max-w-lg px-4 py-6 space-y-6 md:max-w-3xl">
        {appSettings && <Banner settings={appSettings} />}

        {appSettings && !appSettings.bookingEnabled ? (
          <>
            <div className="rounded-xl border border-dashed border-white/30 bg-white/10 px-6 py-10 text-center">
              <p className="font-display mb-4 text-[20px] font-bold uppercase tracking-wide text-white">
                Bokning stängd tills vidare
              </p>
              <p className="mt-2 text-sm text-white/70">
                Säsongen har inte dragit igång än. Bokning öppnar när banorna är
                i bruk.
              </p>
            </div>

            {bookings && bookings.length > 0 && (
              <div className="rounded-2xl bg-[#194b29] px-4 py-4">
                <UpcomingBookingsSection
                  isLoading={isLoading}
                  isError={isError}
                  error={error}
                  bookings={bookings}
                  groups={groups}
                  effectiveGuestEmail={effectiveGuestEmail}
                  user={user}
                />
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-col gap-6 md:flex-row md:items-start md:gap-8">
            <div className="w-full min-w-0 md:max-w-[20rem] md:shrink-0">
              <BookingForm
                existingBookings={bookings ?? []}
                onSuccess={handleSuccess}
                user={user}
              />
            </div>

            <div className="min-w-0 flex-1 rounded-2xl bg-[#194b29] px-4 py-4">
              <UpcomingBookingsSection
                isLoading={isLoading}
                isError={isError}
                error={error}
                bookings={bookings}
                groups={groups}
                effectiveGuestEmail={effectiveGuestEmail}
                user={user}
              />
            </div>
          </div>
        )}

        {user && (
          <HistorySection
            currentYear={currentYear}
            earliestYear={earliestYear ?? currentYear}
          />
        )}
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
