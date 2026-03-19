import React, { forwardRef, useState } from 'react'
import DatePicker, { registerLocale } from 'react-datepicker'
import { sv } from 'date-fns/locale'
import { format } from 'date-fns'
import 'react-datepicker/dist/react-datepicker.css'
import * as GuestSession from '../../lib/GuestSession'
import { useToast } from '../../lib/ToastContext'
import {
  hasConflict,
  createGuestBooking,
  createMemberBooking,
  type BookingWithId,
} from '../../services/BookingService'
import { createLadderMatch } from '../../services/LadderService'
import type { AuthUser } from '../../lib/useAuth'

export interface LadderMeta {
  ladderId: string
  playerAId: string
  playerBId: string
}
import { IconChevronLeft, IconChevronRight } from '@tabler/icons-react'
import { useIsDesktop } from '../../lib/useIsDesktop'
import { TimeSelect } from './TimeSelect'
import { BookingDrawer } from './BookingDrawer'

registerLocale('sv', sv)

const DateDisplayInput = forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & { placeholder?: string }
>(({ value, onClick, placeholder }, ref) => (
  <button
    ref={ref}
    type="button"
    onClick={onClick}
    className="w-full min-h-[44px] rounded-lg border border-white/20 bg-white/10 px-3 py-2.5 text-left text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-[#F1E334]/30 hover:border-white/40 cursor-pointer"
  >
    {value ? (
      <span className="text-white">
        {(value as string).charAt(0).toUpperCase() + (value as string).slice(1)}
      </span>
    ) : (
      <span className="text-white/40">{placeholder}</span>
    )}
  </button>
))

interface BookingFormProps {
  existingBookings: BookingWithId[]
  onSuccess: (startTime: Date, endTime: Date) => void
  user: AuthUser | null
  ladderMeta?: LadderMeta
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
  ladderMeta,
}: BookingFormProps) {
  const isDesktop = useIsDesktop()
  const { addToast } = useToast()
  const [email, setEmail] = useState(GuestSession.getEmail() ?? '')

  // Desktop state
  const [dateValue, setDateValue] = useState('')
  const [startTimeValue, setStartTimeValue] = useState('')
  const [endTimeValue, setEndTimeValue] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  // Mobile drawer
  const [drawerOpen, setDrawerOpen] = useState(false)

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

  function handleStartTimeChange(val: string) {
    setStartTimeValue(val)
    if (val) setEndTimeValue(addHours(val, 2))
  }

  // Desktop submit
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
      if (user && ladderMeta) {
        await createLadderMatch(
          ladderMeta.ladderId,
          ladderMeta.playerAId,
          ladderMeta.playerBId,
          user.uid,
          user.email,
          user.displayName,
          start,
          end
        )
      } else if (user) {
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
      addToast('Bokning skapad!')
      onSuccess(start, end)
    } catch (err) {
      addToast(
        err instanceof Error
          ? err.message
          : 'Något gick fel. Försök igen senare.',
        'error'
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  // Mobile submit — called from BookingDrawer on confirm
  async function handleMobileSubmit(
    date: string,
    startTime: string,
    endTime: string
  ) {
    const effectiveEmail = user ? user.email : email.trim()
    const start = new Date(`${date}T${startTime}`)
    const end = new Date(`${date}T${endTime}`)

    if (user && ladderMeta) {
      await createLadderMatch(
        ladderMeta.ladderId,
        ladderMeta.playerAId,
        ladderMeta.playerBId,
        user.uid,
        user.email,
        user.displayName,
        start,
        end
      )
    } else if (user) {
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
    addToast('Bokning skapad!')
    onSuccess(start, end)
  }

  const inputClass =
    'w-full min-h-[44px] rounded-lg border border-white/20 bg-white/10 px-3 py-2.5 text-sm text-white placeholder:text-white/40 focus:border-[#F1E334] focus:outline-none focus:ring-2 focus:ring-[#F1E334]/30'

  return (
    <section className="rounded-2xl bg-[#194b29] px-4 py-5">
      <h2 className="font-display mb-4 text-[20px] font-bold uppercase tracking-wide text-white">
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
              className="mb-1 block text-sm font-medium text-white/70"
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

        {/* ── DESKTOP: DatePicker + TimeSelect ── */}
        {isDesktop && (
          <>
            <div className="min-w-0">
              <label
                htmlFor="booking-date-desktop"
                className="mb-1 block text-sm font-medium text-white/70"
              >
                Datum
              </label>
              <DatePicker
                id="booking-date-desktop"
                selected={dateValue ? new Date(`${dateValue}T12:00:00`) : null}
                onChange={(date: Date | null) => {
                  if (date) setDateValue(format(date, 'yyyy-MM-dd'))
                }}
                locale="sv"
                dateFormat="EEEE d MMMM"
                placeholderText="Välj datum"
                autoComplete="off"
                customInput={<DateDisplayInput />}
                renderCustomHeader={({
                  date,
                  decreaseMonth,
                  increaseMonth,
                }) => (
                  <div className="flex items-center justify-between px-3 pb-2">
                    <button
                      type="button"
                      onClick={decreaseMonth}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition-colors"
                    >
                      <IconChevronLeft size={18} stroke={2} />
                    </button>
                    <span className="font-display text-base font-bold uppercase tracking-wide text-gray-900">
                      {date.toLocaleDateString('sv-SE', {
                        month: 'long',
                        year: 'numeric',
                      })}
                    </span>
                    <button
                      type="button"
                      onClick={increaseMonth}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition-colors"
                    >
                      <IconChevronRight size={18} stroke={2} />
                    </button>
                  </div>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="min-w-0">
                <label className="mb-1 block text-sm font-medium text-white/70">
                  Starttid
                </label>
                <TimeSelect
                  value={startTimeValue}
                  onChange={handleStartTimeChange}
                  placeholder="Välj starttid"
                />
              </div>

              <div className="min-w-0">
                <label className="mb-1 block text-sm font-medium text-white/70">
                  Sluttid
                </label>
                <TimeSelect
                  value={endTimeValue}
                  onChange={setEndTimeValue}
                  placeholder="Välj sluttid"
                  className={
                    !startTimeValue ? 'opacity-40 pointer-events-none' : ''
                  }
                />
              </div>
            </div>

            {/* Inline conflict error — desktop only */}
            {conflictDetected && (
              <p className="text-sm text-red-300">
                Det finns redan en bokning som överlappar med vald tid.
              </p>
            )}

            {/* Submit error — desktop only */}
            {submitError && (
              <div className="rounded-xl bg-white/95 px-4 py-3 text-sm text-red-700">
                {submitError}
              </div>
            )}

            {/* Submit button — desktop only */}
            <button
              type="submit"
              disabled={isSubmitting || conflictDetected}
              className="flex w-full min-h-[44px] cursor-pointer items-center justify-center rounded-xl px-4 py-3 text-sm font-semibold text-gray-900 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ backgroundColor: '#F1E334' }}
            >
              {isSubmitting ? 'Bokar…' : 'Boka bana'}
            </button>
          </>
        )}

        {/* ── MOBILE: single button → opens BookingDrawer ── */}
        {!isDesktop && (
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            disabled={!user && !email.trim()}
            className="flex w-full min-h-[44px] cursor-pointer items-center justify-center rounded-xl px-4 py-3 text-sm font-semibold text-gray-900 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ backgroundColor: '#F1E334' }}
          >
            Boka banan
          </button>
        )}
      </form>

      {/* Mobile booking drawer */}
      {!isDesktop && drawerOpen && (
        <BookingDrawer
          existingBookings={existingBookings}
          onSubmit={handleMobileSubmit}
          onClose={() => setDrawerOpen(false)}
        />
      )}
    </section>
  )
}
