import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  getUpcomingBookings,
  getEarliestBookingYear,
  deleteGuestBooking,
  deleteMemberBooking,
  BOOKINGS_QUERY_KEY,
  type BookingWithId,
} from '../../services/BookingService'
import { getEmail } from '../../lib/GuestSession'
import { useAuth, type AuthUser } from '../../lib/useAuth'
import { signOut, resendVerificationEmail } from '../../services/AuthService'
import { BookingForm } from './BookingForm'
import { SuccessDialog } from './SuccessDialog'
import { AuthModal } from './AuthModal'
import { VerificationBanner } from './VerificationBanner'
import { HistorySection } from './HistorySection'
import { ProfileSection } from './ProfileSection'

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
  guestEmail: string | null,
  user: AuthUser | null
): string {
  if (user && booking.type === 'member' && user.uid === booking.ownerUid) {
    return 'Din bokning'
  }
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
  user,
}: {
  booking: BookingWithId
  guestEmail: string | null
  user: AuthUser | null
}) {
  const label = getBookingLabel(booking, guestEmail, user)
  const isOwnBooking =
    (!!guestEmail && booking.ownerEmail === guestEmail) ||
    (!!user && booking.type === 'member' && user.uid === booking.ownerUid)
  const canDelete =
    booking.type === 'guest' ||
    (booking.type === 'member' && !!user && user.uid === booking.ownerUid)
  const queryClient = useQueryClient()
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
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <li className="space-y-2">
      <div className="flex items-center justify-between rounded-xl bg-white px-4 py-3 shadow-sm border border-gray-100">
        <span className="text-sm font-medium text-gray-800">
          {formatDateRange(booking)}
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
          {canDelete && (
            <button
              onClick={() => void handleDelete()}
              disabled={isDeleting}
              aria-label="Avboka"
              title="Avboka"
              className="flex h-11 w-11 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {isDeleting ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600" />
              ) : (
                <span className="text-lg leading-none">×</span>
              )}
            </button>
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

export function HomePage() {
  const guestEmail = getEmail()
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

  function handleSuccess(startTime: Date, endTime: Date) {
    void queryClient.invalidateQueries({ queryKey: BOOKINGS_QUERY_KEY })
    setSuccessBooking({ startTime, endTime })
  }

  return (
    <div className="min-h-screen bg-[#f4f4ee]">
      {/* Header */}
      <header
        className="bg-white"
        style={{ borderBottom: '4px solid #F1E334' }}
      >
        <div className="mx-auto max-w-lg px-4 py-4">
          <div className="flex items-center justify-between gap-3">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <svg
                width="40"
                height="40"
                viewBox="0 0 40 40"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
              >
                <circle cx="20" cy="20" r="20" fill="#F1E334" />
                <path
                  d="M10 9C14 13.5 15.5 16.7 15.5 20C15.5 23.3 14 26.5 10 31"
                  stroke="#0F0F0F"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  fill="none"
                />
                <path
                  d="M30 9C26 13.5 24.5 16.7 24.5 20C24.5 23.3 26 26.5 30 31"
                  stroke="#0F0F0F"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  fill="none"
                />
              </svg>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-400">
                  Boka bana
                </p>
                <h1 className="font-display text-[22px] font-bold uppercase leading-none tracking-wide text-gray-900">
                  Högelids Tennisklubb
                </h1>
              </div>
            </div>

            {/* Auth controls */}
            {!authLoading && (
              <div className="flex shrink-0 items-center gap-1">
                {user ? (
                  <>
                    <span className="hidden text-sm font-medium text-gray-500 sm:block mr-1">
                      {user.displayName}
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowProfile((v) => !v)}
                      className="flex min-h-[44px] items-center rounded-lg px-3 py-2 text-sm font-semibold transition-colors"
                      style={
                        showProfile
                          ? { backgroundColor: '#F1E334', color: '#0F0F0F' }
                          : { color: '#374151' }
                      }
                    >
                      Profil
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowProfile(false)
                        void signOut()
                      }}
                      className="flex min-h-[44px] items-center rounded-lg px-3 py-2 text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors"
                    >
                      Logga ut
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => setAuthModal('sign-in')}
                      className="flex min-h-[44px] items-center rounded-lg px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
                    >
                      Logga in
                    </button>
                    <button
                      type="button"
                      onClick={() => setAuthModal('sign-up')}
                      className="flex min-h-[44px] items-center rounded-lg px-4 py-2 text-sm font-semibold text-gray-900 transition-opacity hover:opacity-80"
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

      {/* Verification banner */}
      {user && !user.emailVerified && (
        <VerificationBanner onResend={resendVerificationEmail} />
      )}

      {/* Main content */}
      <main className="mx-auto max-w-lg px-4 py-6 space-y-6">
        <BookingForm
          existingBookings={bookings ?? []}
          onSuccess={handleSuccess}
          user={user}
        />

        <div>
          <h2 className="font-display mb-4 text-[20px] font-bold uppercase tracking-wide text-gray-800">
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
                  user={user}
                />
              ))}
            </ul>
          )}
        </div>

        {user && (
          <HistorySection
            currentYear={currentYear}
            earliestYear={earliestYear ?? currentYear}
          />
        )}

        {user && showProfile && <ProfileSection user={user} />}
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
    </div>
  )
}
