import React, { forwardRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import DatePicker, { registerLocale } from 'react-datepicker'
import { sv } from 'date-fns/locale'
import { format } from 'date-fns'
import 'react-datepicker/dist/react-datepicker.css'
import * as GuestSession from '../../lib/GuestSession'
import { useToast } from '../../lib/ToastContext'
import {
  findConflictingBooking,
  createGuestBooking,
  createMemberBooking,
  type BookingWithId,
  BOOKINGS_QUERY_KEY,
} from '../../services/BookingService'
import { formatTimeDisplay } from '../../lib/formatTimeDisplay'
import { createLadderMatch } from '../../services/LadderService'
import type { AuthUser } from '../../lib/useAuth'

export interface LadderMeta {
  ladderId: string
  playerAId: string
  playerBId: string
  playerAName: string
  playerBName: string
}
import { IconChevronLeft, IconChevronRight } from '@tabler/icons-react'
import { useIsDesktop } from '../../lib/useIsDesktop'
import { TimeSelect } from './TimeSelect'
import { BookingDrawer } from './BookingDrawer'
import { BOOKING_PRIMARY_BUTTON_CLASS } from '../../lib/bookingPrimaryButtonClass'
import { resolveBookingInterval } from '../../lib/bookingInterval'

registerLocale('sv', sv)

export const DateDisplayInput = forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    placeholder?: string
    appearance?: 'green' | 'light'
  }
>(({ value, onClick, placeholder, appearance = 'green', ...rest }, ref) => (
  <button
    ref={ref}
    type="button"
    onClick={onClick}
    {...rest}
    className={
      appearance === 'light'
        ? 'w-full min-h-[44px] cursor-pointer rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-left text-sm text-gray-900 transition-colors hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#F1E334]/40'
        : 'w-full min-h-[44px] cursor-pointer rounded-lg border border-white/20 bg-white/10 px-3 py-2.5 text-left text-sm transition-colors hover:border-white/40 focus:outline-none focus:ring-2 focus:ring-[#F1E334]/30'
    }
  >
    {value ? (
      <span className={appearance === 'light' ? 'text-gray-900' : 'text-white'}>
        {(value as string).charAt(0).toUpperCase() + (value as string).slice(1)}
      </span>
    ) : (
      <span
        className={appearance === 'light' ? 'text-gray-400' : 'text-white/40'}
      >
        {placeholder}
      </span>
    )}
  </button>
))
DateDisplayInput.displayName = 'DateDisplayInput'

export type BookingSuccessMeta = { isGuestBooking: boolean }

interface BookingFormProps {
  existingBookings: BookingWithId[]
  onSuccess: (startTime: Date, endTime: Date, meta: BookingSuccessMeta) => void
  user: AuthUser | null
  ladderMeta?: LadderMeta
  /** Hide the in-form "Ny bokning" heading (e.g. when the shell already has a title). */
  hideSectionTitle?: boolean
  /**
   * `dialog` = white card, dark text (e.g. challenge flow in `SheetDialogShell`).
   * `default` = green panel (home page column).
   */
  variant?: 'default' | 'dialog'
}

function padTwo(n: number): string {
  return String(n).padStart(2, '0')
}

function addHours(timeValue: string, hours: number): string {
  const [h, m] = timeValue.split(':').map(Number)
  const totalMinutes = (h * 60 + (m ?? 0) + hours * 60) % (24 * 60)
  return `${padTwo(Math.floor(totalMinutes / 60))}:${padTwo(totalMinutes % 60)}`
}

/** Same copy as BookingDrawer conflict lines — includes overlapping booking interval when known */
function overlapConflictMessage(booking: BookingWithId | null): string {
  const base = 'Det finns redan en bokning som överlappar med vald tid.'
  if (!booking) return base
  return `${base} Upptaget ${formatTimeDisplay(booking.startTime.toDate())} – ${formatTimeDisplay(booking.endTime.toDate())}.`
}

export function BookingForm({
  existingBookings,
  onSuccess,
  user,
  ladderMeta,
  hideSectionTitle = false,
  variant = 'default',
}: BookingFormProps) {
  const isDialog = variant === 'dialog'
  const isDesktop = useIsDesktop()
  const { addToast } = useToast()
  const queryClient = useQueryClient()
  const [email, setEmail] = useState(GuestSession.getEmail() ?? '')

  // Desktop state
  const [dateValue, setDateValue] = useState('')
  const [startTimeValue, setStartTimeValue] = useState('')
  const [endTimeValue, setEndTimeValue] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  // Mobile drawer
  const [drawerOpen, setDrawerOpen] = useState(false)

  const resolvedDesktopInterval =
    dateValue && startTimeValue && endTimeValue
      ? resolveBookingInterval(dateValue, startTimeValue, endTimeValue)
      : null
  const startDate = resolvedDesktopInterval?.start ?? null
  const endDate = resolvedDesktopInterval?.end ?? null

  const conflictingBooking =
    startDate && endDate
      ? findConflictingBooking(existingBookings, startDate, endDate)
      : null
  const conflictDetected = conflictingBooking !== null

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

    const resolved = resolveBookingInterval(
      dateValue,
      startTimeValue,
      endTimeValue
    )
    if (!resolved) {
      setSubmitError('Sluttiden måste vara efter starttiden.')
      return
    }
    const { start, end } = resolved

    setIsSubmitting(true)
    await queryClient.refetchQueries({ queryKey: BOOKINGS_QUERY_KEY })
    const freshBookings =
      queryClient.getQueryData<BookingWithId[]>(BOOKINGS_QUERY_KEY) ??
      existingBookings
    const conflicting = findConflictingBooking(freshBookings, start, end)
    if (conflicting) {
      setSubmitError(overlapConflictMessage(conflicting))
      setIsSubmitting(false)
      return
    }
    try {
      if (user && ladderMeta) {
        await createLadderMatch(
          ladderMeta.ladderId,
          ladderMeta.playerAId,
          ladderMeta.playerBId,
          ladderMeta.playerAName,
          ladderMeta.playerBName,
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
      onSuccess(start, end, { isGuestBooking: !user })
      setDateValue('')
      setStartTimeValue('')
      setEndTimeValue('')
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
    const resolved = resolveBookingInterval(date, startTime, endTime)
    if (!resolved) {
      throw new Error('Sluttiden måste vara efter starttiden.')
    }
    const { start, end } = resolved

    await queryClient.refetchQueries({ queryKey: BOOKINGS_QUERY_KEY })
    const freshBookings =
      queryClient.getQueryData<BookingWithId[]>(BOOKINGS_QUERY_KEY) ??
      existingBookings
    const conflicting = findConflictingBooking(freshBookings, start, end)
    if (conflicting) {
      throw new Error(overlapConflictMessage(conflicting))
    }

    if (user && ladderMeta) {
      await createLadderMatch(
        ladderMeta.ladderId,
        ladderMeta.playerAId,
        ladderMeta.playerBId,
        ladderMeta.playerAName,
        ladderMeta.playerBName,
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
    onSuccess(start, end, { isGuestBooking: !user })
  }

  const inputClass = isDialog
    ? 'w-full min-h-[44px] rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-base text-gray-900 placeholder:text-gray-400 focus:border-[#F1E334] focus:outline-none focus:ring-2 focus:ring-[#F1E334]/30'
    : 'w-full min-h-[44px] rounded-lg border border-white/20 bg-white/10 px-3 py-2.5 text-base text-white placeholder:text-white/40 focus:border-[#F1E334] focus:outline-none focus:ring-2 focus:ring-[#F1E334]/30'

  const labelClass = isDialog
    ? 'mb-1 block text-sm font-medium text-gray-600'
    : 'mb-1 block text-sm font-medium text-white/70'

  return (
    <section
      className={
        isDialog ? 'min-w-0 px-0 py-0' : 'rounded-2xl bg-[#194b29] px-4 py-5'
      }
    >
      {!hideSectionTitle && (
        <h2
          className={`font-display mb-4 text-[20px] font-bold uppercase tracking-wide ${
            isDialog ? 'text-gray-900' : 'text-white'
          }`}
        >
          Ny bokning
        </h2>
      )}
      <form
        onSubmit={handleSubmit}
        noValidate
        className="space-y-4 w-full min-w-0"
      >
        {/* Email — guests only */}
        {!user && (
          <div className="min-w-0">
            <label htmlFor="booking-email" className={labelClass}>
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
              <label htmlFor="booking-date-desktop" className={labelClass}>
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
                portalId="datepicker-portal"
                popperClassName="!z-50"
                customInput={
                  <DateDisplayInput appearance={isDialog ? 'light' : 'green'} />
                }
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
                <label className={labelClass}>Starttid</label>
                <TimeSelect
                  value={startTimeValue}
                  onChange={handleStartTimeChange}
                  placeholder="Välj starttid"
                  appearance={isDialog ? 'light' : 'green'}
                />
              </div>

              <div className="min-w-0">
                <label className={labelClass}>Sluttid</label>
                <TimeSelect
                  value={endTimeValue}
                  onChange={setEndTimeValue}
                  placeholder="Välj sluttid"
                  appearance={isDialog ? 'light' : 'green'}
                  className={
                    !startTimeValue ? 'opacity-40 pointer-events-none' : ''
                  }
                />
              </div>
            </div>

            {/* Inline conflict error — desktop only */}
            {conflictDetected && (
              <p
                className={`text-sm ${isDialog ? 'text-red-600' : 'text-red-300'}`}
              >
                {overlapConflictMessage(conflictingBooking)}
              </p>
            )}

            {/* Submit error — desktop only */}
            {submitError && (
              <div
                className={
                  isDialog
                    ? 'rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-800'
                    : 'rounded-xl bg-white/95 px-4 py-3 text-sm text-red-700'
                }
              >
                {submitError}
              </div>
            )}

            {/* Submit button — desktop only */}
            <button
              type="submit"
              disabled={isSubmitting || conflictDetected}
              className={BOOKING_PRIMARY_BUTTON_CLASS}
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
            className={BOOKING_PRIMARY_BUTTON_CLASS}
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
