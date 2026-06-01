import { Suspense, lazy, useEffect, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  getUpcomingBookings,
  getEarliestBookingYear,
  BOOKINGS_QUERY_KEY,
  type BookingWithId,
} from '../../services/BookingService'
import { getProfile, PROFILE_QUERY_KEY } from '../../services/ProfileService'
import { getActiveLadder, LADDER_QUERY_KEY } from '../../services/LadderService'
import {
  HISTORY_ARCHIVE_QUERY_KEY,
  loadHistoryArchive,
  type LoadedArchive,
} from '../../services/HistoryArchiveService'
import { getEmail } from '../../lib/GuestSession'
import { useAuth, type AuthUser } from '../../lib/useAuth'
import { useAppSettings } from '../../lib/useAppSettings'
import { BookingForm } from './BookingForm'
import { Banner } from './Banner'
import { GlassNoticeCard } from './GlassNoticeCard'
import { SuccessDialog } from './SuccessDialog'
import { BookingItem } from './BookingItem'
import {
  BOOKING_BOARD_REFETCH_ON_MOUNT,
  BOOKING_BOARD_STALE_TIME_MS,
  LADDER_STALE_TIME_MS,
  PROFILE_STALE_TIME_MS,
} from '../../services/queryStaleTimes'

const HistorySection = lazy(() =>
  import('./HistorySection').then((module) => ({
    default: module.HistorySection,
  }))
)

function UpcomingBookingsSection({
  isLoading,
  isError,
  error,
  bookings,
  effectiveGuestEmail,
  user,
}: {
  isLoading: boolean
  isError: boolean
  error: unknown
  bookings: BookingWithId[] | undefined
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

      {!isLoading && !isError && bookings && bookings.length > 0 && (
        <ul className="border-t border-white/10">
          {bookings.map((booking) => (
            <BookingItem
              key={booking.id}
              booking={booking}
              guestEmail={effectiveGuestEmail}
              user={user}
            />
          ))}
        </ul>
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
    isGuestBooking: boolean
  } | null>(null)

  const {
    data: bookings,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: BOOKINGS_QUERY_KEY,
    queryFn: getUpcomingBookings,
    staleTime: BOOKING_BOARD_STALE_TIME_MS,
    refetchOnMount: BOOKING_BOARD_REFETCH_ON_MOUNT,
    refetchOnWindowFocus: true,
  })

  const { settings: appSettings } = useAppSettings()

  const currentYear = new Date().getFullYear()

  const archiveQuery = useQuery<LoadedArchive>({
    queryKey: HISTORY_ARCHIVE_QUERY_KEY,
    queryFn: loadHistoryArchive,
    staleTime: Infinity,
    gcTime: Infinity,
    enabled: !!user,
  })
  const earliestYearQuery = useQuery({
    queryKey: ['bookings', 'earliestYear'],
    queryFn: getEarliestBookingYear,
    enabled:
      !!user && archiveQuery.data === undefined && !archiveQuery.isLoading,
    staleTime: Infinity,
    gcTime: Infinity,
  })
  const earliestYear =
    archiveQuery.data?.earliestYear ?? earliestYearQuery.data ?? currentYear

  // Prefetch profile and ladder as soon as user is known
  useEffect(() => {
    if (!user) return
    void queryClient.prefetchQuery({
      queryKey: [PROFILE_QUERY_KEY, user.uid],
      queryFn: () => getProfile(user.uid),
      staleTime: PROFILE_STALE_TIME_MS,
    })
    void queryClient.prefetchQuery({
      queryKey: LADDER_QUERY_KEY,
      queryFn: getActiveLadder,
      staleTime: LADDER_STALE_TIME_MS,
    })
  }, [user, queryClient])

  // When logged in, ignore any stored guest email
  const effectiveGuestEmail = user ? null : guestEmail

  function handleSuccess(
    startTime: Date,
    endTime: Date,
    meta: { isGuestBooking: boolean }
  ) {
    setGuestEmail(getEmail())
    setSuccessBooking({
      startTime,
      endTime,
      isGuestBooking: meta.isGuestBooking,
    })
  }

  return (
    <div>
      {/* Main content — outer padding + inner max-width matches StegenPage */}
      <main className="px-4 py-6">
        <div className="mx-auto max-w-lg space-y-6 md:max-w-3xl">
          {appSettings && <Banner settings={appSettings} />}

          {appSettings && !appSettings.bookingEnabled ? (
            <>
              <GlassNoticeCard>
                <div className="px-6 py-10 text-center">
                  <p className="font-display mb-4 text-[20px] font-bold uppercase tracking-wide text-white">
                    Bokning stängd tills vidare
                  </p>
                  <p className="mt-2 text-sm text-white/70">
                    Du kan boka när banan är öppen för säsongen.
                  </p>
                </div>
              </GlassNoticeCard>

              {(isLoading || isError || (bookings && bookings.length > 0)) && (
                <div className="rounded-2xl bg-[#194b29] px-4 py-4">
                  <UpcomingBookingsSection
                    isLoading={isLoading}
                    isError={isError}
                    error={error}
                    bookings={bookings}
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
                  effectiveGuestEmail={effectiveGuestEmail}
                  user={user}
                />
              </div>
            </div>
          )}

          {user && (
            <Suspense
              fallback={
                <div className="rounded-2xl bg-[#194b29] px-4 py-10 text-center text-sm text-white/70">
                  Laddar historik…
                </div>
              }
            >
              <HistorySection
                currentYear={currentYear}
                earliestYear={earliestYear ?? currentYear}
              />
            </Suspense>
          )}
        </div>
      </main>

      {successBooking && (
        <SuccessDialog
          startTime={successBooking.startTime}
          endTime={successBooking.endTime}
          isGuestBooking={successBooking.isGuestBooking}
          onClose={() => setSuccessBooking(null)}
        />
      )}
    </div>
  )
}
