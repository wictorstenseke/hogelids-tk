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

function padTwo(n: number): string {
  return String(n).padStart(2, '0')
}

function addHours(timeValue: string, hours: number): string {
  const [h, m] = timeValue.split(':').map(Number)
  const totalMinutes = (h * 60 + (m ?? 0) + hours * 60) % (24 * 60)
  return `${padTwo(Math.floor(totalMinutes / 60))}:${padTwo(totalMinutes % 60)}`
}

export function BookingForm({
  existingBookings,
  onSuccess,
  user,
}: BookingFormProps) {
  const [email, setEmail] = useState(GuestSession.getEmail() ?? '')
  const [dateValue, setDateValue] = useState('')
  const [startTimeValue, setStartTimeValue] = useState('')
  const [endTimeValue, setEndTimeValue] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const startDate =
    dateValue && startTimeValue
      ? new Date(`${dateValue}T${startTimeValue}`)
      : null
  const endDate =
    dateValue && endTimeValue ? new Date(`${dateValue}T${endTimeValue}`) : null

  const conflictDetected = (() => {
    if (!startDate || !endDate) return false
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) return false
    if (endDate <= startDate) return false
    return hasConflict(existingBookings, startDate, endDate)
  })()

  function handleStartTimeChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value
    setStartTimeValue(val)
    if (val) {
      setEndTimeValue(addHours(val, 2))
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitError(null)

    const effectiveEmail = user ? user.email : email.trim()

    if (!effectiveEmail || !dateValue || !startTimeValue || !endTimeValue) {
      setSubmitError('Fyll i alla fält innan du bokar.')
      return
    }

    const start = new Date(`${dateValue}T${startTimeValue}`)
    const end = new Date(`${dateValue}T${endTimeValue}`)

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

  const inputClass =
    'w-full min-h-[44px] rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-900 focus:border-[#F1E334] focus:outline-none focus:ring-2 focus:ring-[#F1E334]/30'

  return (
    <section className="rounded-xl bg-white px-4 py-5 shadow-sm border border-gray-100 overflow-hidden">
      <h2 className="font-display mb-4 text-[20px] font-bold uppercase tracking-wide text-gray-900">
        Ny bokning
      </h2>
      <form
        onSubmit={handleSubmit}
        noValidate
        className="space-y-4 w-full min-w-0"
      >
        {/* Email — guests only */}
        {!user && (
          <div className="min-w-0">
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
              className={inputClass}
            />
          </div>
        )}

        {/* Date */}
        <div className="min-w-0">
          <label
            htmlFor="booking-date"
            className="mb-1 block text-sm font-medium text-gray-700"
          >
            Datum
          </label>
          <input
            id="booking-date"
            type="date"
            value={dateValue}
            onChange={(e) => setDateValue(e.target.value)}
            className={inputClass}
          />
        </div>

        {/* Start time */}
        <div className="min-w-0">
          <label
            htmlFor="booking-start-time"
            className="mb-1 block text-sm font-medium text-gray-700"
          >
            Starttid
          </label>
          <input
            id="booking-start-time"
            type="time"
            value={startTimeValue}
            onChange={handleStartTimeChange}
            className={inputClass}
          />
        </div>

        {/* End time — shown after start is set */}
        {startTimeValue && (
          <div className="min-w-0">
            <label
              htmlFor="booking-end-time"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              Sluttid
            </label>
            <input
              id="booking-end-time"
              type="time"
              value={endTimeValue}
              onChange={(e) => setEndTimeValue(e.target.value)}
              className={inputClass}
            />
          </div>
        )}

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
