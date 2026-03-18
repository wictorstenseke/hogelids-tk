import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  getUpcomingBookings,
  getEarliestBookingYear,
  BOOKINGS_QUERY_KEY,
  type BookingWithId,
} from '../../services/BookingService'
import { getEmail } from '../../lib/GuestSession'
import { useAuth } from '../../lib/useAuth'
import { signOut } from '../../services/AuthService'
import { BookingForm } from './BookingForm'
import { SuccessDialog } from './SuccessDialog'
import { AuthModal } from './AuthModal'
import { HistorySection } from './HistorySection'
import { ProfileModal } from './ProfileModal'
import { BookingItem } from './BookingItem'
import { AvatarMenu } from './AvatarMenu'

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

export function HomePage() {
  const [guestEmail, setGuestEmail] = useState(getEmail)
  const queryClient = useQueryClient()
  const { user, loading: authLoading } = useAuth()
  const [authModal, setAuthModal] = useState<'sign-in' | 'sign-up' | null>(null)
  const [showProfile, setShowProfile] = useState(false)
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

  const currentYear = new Date().getFullYear()

  const { data: earliestYear } = useQuery({
    queryKey: ['bookings', 'earliestYear'],
    queryFn: getEarliestBookingYear,
  })

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
      {/* Header — transparent so body gradient flows through */}
      <header className="bg-transparent">
        <div className="mx-auto max-w-lg px-4 py-4">
          <div className="flex items-center justify-between gap-3">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <img
                src="/htk-logo.svg"
                alt="HTK Logo"
                className="h-auto w-[48px] sm:w-[56px] shrink-0 [filter:drop-shadow(0px_4px_4px_rgba(0,0,0,0.15))] hover:[filter:drop-shadow(0px_4px_6px_2px_rgba(0,0,0,0.25))] transition-[filter] duration-200"
              />
              <h1 className="font-display text-[22px] font-bold uppercase leading-none tracking-wide text-white">
                Högelids Tennisklubb
              </h1>
            </div>

            {/* Auth controls */}
            {!authLoading && (
              <div className="flex shrink-0 items-center gap-1">
                {user ? (
                  <AvatarMenu
                    user={user}
                    onOpenProfile={() => setShowProfile(true)}
                    onSignOut={() => void signOut()}
                  />
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => setAuthModal('sign-in')}
                      className="flex min-h-[44px] cursor-pointer items-center rounded-lg px-3 py-2 text-sm font-medium text-white/80 hover:text-white transition-colors"
                    >
                      Logga in
                    </button>
                    <button
                      type="button"
                      onClick={() => setAuthModal('sign-up')}
                      className="flex min-h-[44px] cursor-pointer items-center rounded-lg px-4 py-2 text-sm font-semibold text-gray-900 transition-opacity hover:opacity-80"
                      style={{ backgroundColor: '#F1E334' }}
                    >
                      Skapa konto
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="mx-auto max-w-lg px-4 py-6 space-y-6">
        <BookingForm
          existingBookings={bookings ?? []}
          onSuccess={handleSuccess}
          user={user}
        />

        <div>
          <h2 className="font-display mb-4 text-[20px] font-bold uppercase tracking-wide text-white">
            Kommande bokningar
          </h2>

          {isLoading && (
            <div className="flex items-center justify-center py-12">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-white/40 border-t-white" />
              <span className="ml-3 text-sm text-white/80">
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
            <div className="rounded-xl border border-dashed border-white/30 bg-white/10 px-4 py-10 text-center text-sm text-white/70">
              Inga kommande bokningar.
            </div>
          )}

          {!isLoading && !isError && groups.length > 0 && (
            <div className="space-y-4">
              {groups.map((group) => (
                <div key={group.dateKey}>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-white/60">
                    {group.dateLabel}
                  </p>
                  <ul className="space-y-1">
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
        </div>

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

      {authModal && (
        <AuthModal initialView={authModal} onClose={() => setAuthModal(null)} />
      )}

      {user && showProfile && (
        <ProfileModal user={user} onClose={() => setShowProfile(false)} />
      )}
    </div>
  )
}
