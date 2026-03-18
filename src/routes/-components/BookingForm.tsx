import { useState } from 'react'
import * as GuestSession from '../../lib/GuestSession'
import {
  hasConflict,
  createGuestBooking,
  createMemberBooking,
  type BookingWithId,
} from '../../services/BookingService'
import type { AuthUser } from '../../lib/useAuth'

interface BookingFormProps {
  existingBookings: BookingWithId[]
  onSuccess: (startTime: Date, endTime: Date) => void
  user: AuthUser | null
}

function toDatetimeLocalValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return (
    date.getFullYear() +
    '-' +
    pad(date.getMonth() + 1) +
    '-' +
    pad(date.getDate()) +
    'T' +
    pad(date.getHours()) +
    ':' +
    pad(date.getMinutes())
  )
}

export function BookingForm({
  existingBookings,
  onSuccess,
  user,
}: BookingFormProps) {
  const [email, setEmail] = useState(GuestSession.getEmail() ?? '')
  const [startValue, setStartValue] = useState('')
  const [endValue, setEndValue] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const conflictDetected = (() => {
    if (!startValue || !endValue) return false
    const start = new Date(startValue)
    const end = new Date(endValue)
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return false
    if (end <= start) return false
    return hasConflict(existingBookings, start, end)
  })()

  function handleStartChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value
    setStartValue(val)
    if (val) {
      const start = new Date(val)
      if (!isNaN(start.getTime())) {
        const autoEnd = new Date(start.getTime() + 2 * 60 * 60 * 1000)
        setEndValue(toDatetimeLocalValue(autoEnd))
      }
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitError(null)

    const effectiveEmail = user ? user.email : email.trim()

    if (!effectiveEmail || !startValue || !endValue) {
      setSubmitError('Fyll i alla fält innan du bokar.')
      return
    }

    const start = new Date(startValue)
    const end = new Date(endValue)

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      setSubmitError('Ogiltigt datum eller tid.')
      return
    }

    if (end <= start) {
      setSubmitError('Sluttiden måste vara efter starttiden.')
      return
    }

    if (hasConflict(existingBookings, start, end)) {
      setSubmitError('Det finns redan en bokning som överlappar med vald tid.')
      return
    }

    setIsSubmitting(true)
    try {
      if (user) {
        await createMemberBooking(
          user.uid,
          user.email,
          user.displayName,
          start,
          end
        )
      } else {
        // Use email as display name for guests
        await createGuestBooking(effectiveEmail, effectiveEmail, start, end)
        GuestSession.setEmail(effectiveEmail)
        GuestSession.incrementBookingCount()
      }
      onSuccess(start, end)
    } catch (err) {
      setSubmitError(
        err instanceof Error
          ? err.message
          : 'Något gick fel. Försök igen senare.'
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section className="rounded-xl bg-white px-4 py-5 shadow-sm border border-gray-100">
      <h2 className="font-display mb-4 text-[20px] font-bold uppercase tracking-wide text-gray-900">
        Ny bokning
      </h2>
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        {/* Email — guests only */}
        {!user && (
          <div>
            <label
              htmlFor="booking-email"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              E-post
            </label>
            <input
              id="booking-email"
              type="email"
              autoComplete="email"
              inputMode="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="din@epost.se"
              className="w-full min-h-[44px] rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-[#F1E334] focus:outline-none focus:ring-2 focus:ring-[#F1E334]/30"
            />
          </div>
        )}

        {/* Start time */}
        <div>
          <label
            htmlFor="booking-start"
            className="mb-1 block text-sm font-medium text-gray-700"
          >
            Starttid
          </label>
          <input
            id="booking-start"
            type="datetime-local"
            value={startValue}
            onChange={handleStartChange}
            className="w-full min-h-[44px] rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-900 focus:border-[#F1E334] focus:outline-none focus:ring-2 focus:ring-[#F1E334]/30"
          />
        </div>

        {/* End time */}
        <div>
          <label
            htmlFor="booking-end"
            className="mb-1 block text-sm font-medium text-gray-700"
          >
            Sluttid
          </label>
          <input
            id="booking-end"
            type="datetime-local"
            value={endValue}
            onChange={(e) => setEndValue(e.target.value)}
            className="w-full min-h-[44px] rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-900 focus:border-[#F1E334] focus:outline-none focus:ring-2 focus:ring-[#F1E334]/30"
          />
        </div>

        {/* Inline conflict error */}
        {conflictDetected && (
          <p className="text-sm text-red-600">
            Det finns redan en bokning som överlappar med vald tid.
          </p>
        )}

        {/* Submit error */}
        {submitError && (
          <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
            {submitError}
          </div>
        )}

        {/* Submit button */}
        <button
          type="submit"
          disabled={isSubmitting || conflictDetected}
          className="flex w-full min-h-[44px] cursor-pointer items-center justify-center rounded-xl px-4 py-3 text-sm font-semibold text-gray-900 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ backgroundColor: '#F1E334' }}
        >
          {isSubmitting ? 'Bokar…' : 'Boka bana'}
        </button>
      </form>
    </section>
  )
}
