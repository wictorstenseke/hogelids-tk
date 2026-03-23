import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { IconArrowLeft, IconX } from '@tabler/icons-react'
import { WheelPicker, WheelPickerWrapper } from '@ncdai/react-wheel-picker'
import '@ncdai/react-wheel-picker/style.css'
import type { WheelPickerOption } from '@ncdai/react-wheel-picker'
import { formatTimeDisplay } from '../../lib/formatTimeDisplay'
import {
  type BookingWithId,
  findConflictingBooking,
} from '../../services/BookingService'

type Step = 'datetime' | 'end' | 'summary'

/** Snapshot when opening edit from summary — restored if user backs out without confirming */
type BookingDraftSnapshot = {
  draftDate: string
  draftStartHour: string
  draftStartMinute: string
  draftEndHour: string
  draftEndMinute: string
}

const VISIBLE_COUNT = 20
const ITEM_HEIGHT = 44

const HOUR_OPTIONS: WheelPickerOption<string>[] = Array.from(
  { length: 24 },
  (_, i) => ({
    value: String(i).padStart(2, '0'),
    label: String(i).padStart(2, '0'),
  })
)

const MINUTE_OPTIONS: WheelPickerOption<string>[] = [
  '00',
  '15',
  '30',
  '45',
].map((m) => ({ value: m, label: m }))

function generateDateOptions(): WheelPickerOption<string>[] {
  const options: WheelPickerOption<string>[] = []
  const today = new Date()
  today.setHours(12, 0, 0, 0)
  for (let i = 0; i < 60; i++) {
    const d = new Date(today)
    d.setDate(today.getDate() + i)
    const value = d.toISOString().slice(0, 10)
    const raw = d.toLocaleDateString('sv-SE', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    })
    const label = raw.charAt(0).toUpperCase() + raw.slice(1)
    options.push({ value, label })
  }
  return options
}

function getNearestQuarter(): { hour: string; minute: string } {
  const now = new Date()
  const totalMins = now.getHours() * 60 + now.getMinutes()
  const rounded = Math.round(totalMins / 15) * 15
  const h = Math.floor(rounded / 60) % 24
  const m = rounded % 60
  return {
    hour: String(h).padStart(2, '0'),
    minute: String(m).padStart(2, '0'),
  }
}

function addTwoHours(
  hour: string,
  minute: string
): { hour: string; minute: string } {
  const totalMins = (parseInt(hour) * 60 + parseInt(minute) + 120) % (24 * 60)
  return {
    hour: String(Math.floor(totalMins / 60)).padStart(2, '0'),
    minute: String(totalMins % 60).padStart(2, '0'),
  }
}

function formatDateFull(dateValue: string): string {
  if (!dateValue) return ''
  const d = new Date(`${dateValue}T12:00:00`)
  const str = d.toLocaleDateString('sv-SE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
  return str.charAt(0).toUpperCase() + str.slice(1)
}

interface BookingDrawerProps {
  existingBookings: BookingWithId[]
  onSubmit: (date: string, startTime: string, endTime: string) => Promise<void>
  onClose: () => void
}

export function BookingDrawer({
  existingBookings,
  onSubmit,
  onClose,
}: BookingDrawerProps) {
  const [step, setStep] = useState<Step>('datetime')
  const [visible, setVisible] = useState(false)
  const [fromSummary, setFromSummary] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const drawerBodyMeasureRef = useRef<HTMLDivElement>(null)
  const preEditDraftRef = useRef<BookingDraftSnapshot | null>(null)
  /** Pixel height for CSS transition (cannot animate auto → auto) */
  const [drawerBodyHeightPx, setDrawerBodyHeightPx] = useState<number | null>(
    null
  )

  const DATE_OPTIONS = useMemo(() => generateDateOptions(), [])
  const nearest = useMemo(() => getNearestQuarter(), [])

  const [draftDate, setDraftDate] = useState(DATE_OPTIONS[0]?.value ?? '')
  const [draftStartHour, setDraftStartHour] = useState(nearest.hour)
  const [draftStartMinute, setDraftStartMinute] = useState(nearest.minute)
  const [draftEndHour, setDraftEndHour] = useState(
    () => addTwoHours(nearest.hour, nearest.minute).hour
  )
  const [draftEndMinute, setDraftEndMinute] = useState(
    () => addTwoHours(nearest.hour, nearest.minute).minute
  )

  useEffect(() => {
    const id = requestAnimationFrame(() => setVisible(true))
    document.body.style.overflow = 'hidden'
    return () => {
      cancelAnimationFrame(id)
      document.body.style.overflow = ''
    }
  }, [])

  useLayoutEffect(() => {
    const el = drawerBodyMeasureRef.current
    if (!el) return

    function syncHeight() {
      const node = drawerBodyMeasureRef.current
      if (!node) return
      setDrawerBodyHeightPx(node.scrollHeight)
    }

    syncHeight()
    const ro = new ResizeObserver(syncHeight)
    ro.observe(el)
    return () => ro.disconnect()
  }, [step, visible])

  function handleClose() {
    setVisible(false)
    setTimeout(onClose, 280)
  }

  function snapshotDraftForEdit() {
    preEditDraftRef.current = {
      draftDate,
      draftStartHour,
      draftStartMinute,
      draftEndHour,
      draftEndMinute,
    }
  }

  function discardEditAndReturnToSummary() {
    const snap = preEditDraftRef.current
    if (snap) {
      setDraftDate(snap.draftDate)
      setDraftStartHour(snap.draftStartHour)
      setDraftStartMinute(snap.draftStartMinute)
      setDraftEndHour(snap.draftEndHour)
      setDraftEndMinute(snap.draftEndMinute)
      preEditDraftRef.current = null
    }
    setStep('summary')
    setFromSummary(false)
  }

  function handleHeaderClose() {
    if (fromSummary && step !== 'summary') {
      discardEditAndReturnToSummary()
    } else {
      handleClose()
    }
  }

  function handleBackdropClick() {
    if (fromSummary && step !== 'summary') {
      discardEditAndReturnToSummary()
    } else {
      handleClose()
    }
  }

  function handleNext() {
    if (step === 'datetime') {
      if (!fromSummary) {
        // First pass: auto-calculate end time from start
        const { hour, minute } = addTwoHours(draftStartHour, draftStartMinute)
        setDraftEndHour(hour)
        setDraftEndMinute(minute)
      }
      preEditDraftRef.current = null
      setStep('summary')
      setFromSummary(false)
    } else if (step === 'end') {
      preEditDraftRef.current = null
      setStep('summary')
      setFromSummary(false)
    }
  }

  function handleEditDatetime() {
    snapshotDraftForEdit()
    setFromSummary(true)
    setStep('datetime')
  }

  function handleEditEnd() {
    snapshotDraftForEdit()
    setFromSummary(true)
    setStep('end')
  }

  async function handleBookingSubmit() {
    setIsSubmitting(true)
    setSubmitError(null)
    try {
      await onSubmit(
        draftDate,
        `${draftStartHour}:${draftStartMinute}`,
        `${draftEndHour}:${draftEndMinute}`
      )
      handleClose()
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : 'Något gick fel. Försök igen.'
      )
      setIsSubmitting(false)
    }
  }

  // Conflict detection
  const startDate = draftDate
    ? new Date(`${draftDate}T${draftStartHour}:${draftStartMinute}`)
    : null

  // Datetime step uses tentative end (start + 2h); summary uses actual draftEnd
  const tentativeEnd = addTwoHours(draftStartHour, draftStartMinute)
  const tentativeEndDate = draftDate
    ? new Date(`${draftDate}T${tentativeEnd.hour}:${tentativeEnd.minute}`)
    : null
  const endDate = draftDate
    ? new Date(`${draftDate}T${draftEndHour}:${draftEndMinute}`)
    : null

  const datetimeConflictBooking =
    startDate && tentativeEndDate
      ? findConflictingBooking(existingBookings, startDate, tentativeEndDate)
      : null
  const summaryConflictBooking =
    startDate && endDate
      ? findConflictingBooking(existingBookings, startDate, endDate)
      : null

  function conflictLabel(booking: BookingWithId | null) {
    if (!booking) return null
    return `Upptaget ${formatTimeDisplay(booking.startTime.toDate())} – ${formatTimeDisplay(booking.endTime.toDate())}`
  }

  // Also block if end ≤ start (wraps midnight)
  const endBeforeStart =
    endDate && startDate ? endDate.getTime() <= startDate.getTime() : false

  const canBook = !conflictLabel(summaryConflictBooking) && !endBeforeStart

  // ClassNames for wheel highlights
  const dateClassNames = {
    optionItem: 'text-gray-400',
    highlightWrapper: '',
  }
  const hourClassNames = {
    optionItem: 'text-gray-400',
    highlightWrapper: '',
  }
  const minuteClassNames = {
    optionItem: 'text-gray-400',
    highlightWrapper: '',
  }
  const endHourClassNames = {
    optionItem: 'text-gray-400',
    highlightWrapper: '',
  }
  const endMinuteClassNames = {
    optionItem: 'text-gray-400',
    highlightWrapper: '',
  }

  const linkClass =
    'underline underline-offset-2 transition-opacity hover:opacity-60'

  const drawerTitle =
    step === 'summary'
      ? 'Din bokning'
      : step === 'end'
        ? 'Ändra sluttid'
        : fromSummary
          ? 'Ändra datum & starttid'
          : 'Datum & starttid'

  const showBackBeforeTitle = fromSummary && step !== 'summary'

  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-black/40 backdrop-blur-sm transition-opacity duration-300 motion-reduce:backdrop-blur-none ${visible ? 'opacity-100' : 'opacity-0'}`}
        onClick={handleBackdropClick}
        aria-hidden="true"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label={drawerTitle}
        className={`fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl bg-white shadow-2xl transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          visible ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        <div
          className="overflow-hidden transition-[height] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none"
          style={
            drawerBodyHeightPx === null
              ? undefined
              : { height: `${drawerBodyHeightPx}px` }
          }
        >
          <div ref={drawerBodyMeasureRef} className="px-5 pb-10 pt-5">
            {/* Header */}
            {showBackBeforeTitle ? (
              <div className="mb-5 flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleHeaderClose}
                  aria-label="Tillbaka till sammanfattning"
                  className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-xl bg-gray-100 text-gray-500 transition-colors hover:bg-gray-200 hover:text-gray-800"
                >
                  <IconArrowLeft size={18} stroke={2} aria-hidden={true} />
                </button>
                <h2 className="font-display min-w-0 flex-1 text-[20px] font-bold uppercase tracking-wide text-gray-900">
                  {drawerTitle}
                </h2>
              </div>
            ) : (
              <div className="mb-5 flex items-center justify-between gap-3">
                <h2 className="font-display min-w-0 flex-1 text-[20px] font-bold uppercase tracking-wide text-gray-900">
                  {drawerTitle}
                </h2>
                <button
                  type="button"
                  onClick={handleHeaderClose}
                  aria-label="Stäng"
                  className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-xl bg-gray-100 text-gray-500 transition-colors hover:bg-gray-200 hover:text-gray-800"
                >
                  <IconX size={18} stroke={2} />
                </button>
              </div>
            )}

            {/* Datetime step */}
            {step === 'datetime' && (
              <>
                <WheelPickerWrapper className="htk-datetime-picker rounded-2xl border border-gray-200 bg-white overflow-hidden px-3">
                  <WheelPicker
                    options={DATE_OPTIONS}
                    value={draftDate}
                    onValueChange={(v) => setDraftDate(v)}
                    visibleCount={VISIBLE_COUNT}
                    optionItemHeight={ITEM_HEIGHT}
                    infinite={false}
                    classNames={dateClassNames}
                  />
                  <WheelPicker
                    options={HOUR_OPTIONS}
                    value={draftStartHour}
                    onValueChange={(v) => setDraftStartHour(v)}
                    visibleCount={VISIBLE_COUNT}
                    optionItemHeight={ITEM_HEIGHT}
                    infinite={true}
                    classNames={hourClassNames}
                  />
                  <WheelPicker
                    options={MINUTE_OPTIONS}
                    value={draftStartMinute}
                    onValueChange={(v) => setDraftStartMinute(v)}
                    visibleCount={VISIBLE_COUNT}
                    optionItemHeight={ITEM_HEIGHT}
                    infinite={true}
                    classNames={minuteClassNames}
                  />
                </WheelPickerWrapper>
                {conflictLabel(datetimeConflictBooking) && (
                  <p className="mt-3 text-sm font-medium text-red-600">
                    {conflictLabel(datetimeConflictBooking)}
                  </p>
                )}
                <button
                  type="button"
                  onClick={handleNext}
                  className="mt-6 flex w-full min-h-[52px] cursor-pointer items-center justify-center rounded-xl text-base font-semibold text-gray-900 transition-opacity"
                  style={{ backgroundColor: '#F1E334' }}
                >
                  Nästa
                </button>
              </>
            )}

            {/* End time step */}
            {step === 'end' && (
              <>
                <WheelPickerWrapper className="htk-endtime-picker rounded-2xl border border-gray-200 bg-white overflow-hidden px-3">
                  <WheelPicker
                    options={HOUR_OPTIONS}
                    value={draftEndHour}
                    onValueChange={(v) => setDraftEndHour(v)}
                    visibleCount={VISIBLE_COUNT}
                    optionItemHeight={ITEM_HEIGHT}
                    infinite={true}
                    classNames={endHourClassNames}
                  />
                  <WheelPicker
                    options={MINUTE_OPTIONS}
                    value={draftEndMinute}
                    onValueChange={(v) => setDraftEndMinute(v)}
                    visibleCount={VISIBLE_COUNT}
                    optionItemHeight={ITEM_HEIGHT}
                    infinite={true}
                    classNames={endMinuteClassNames}
                  />
                </WheelPickerWrapper>
                <button
                  type="button"
                  onClick={handleNext}
                  className="mt-6 flex w-full min-h-[52px] cursor-pointer items-center justify-center rounded-xl text-base font-semibold text-gray-900 transition-opacity"
                  style={{ backgroundColor: '#F1E334' }}
                >
                  Klar
                </button>
              </>
            )}

            {/* Summary step */}
            {step === 'summary' && (
              <>
                <p
                  id="booking-drawer-summary-hint"
                  className="mb-2 text-sm leading-snug text-gray-600"
                >
                  Tryck nedan för att ändra datum, starttid eller sluttid.
                </p>
                {/* Booking summary card */}
                <div
                  className="rounded-xl bg-gray-50 px-4 py-4"
                  aria-describedby="booking-drawer-summary-hint"
                >
                  <p className="text-base font-semibold leading-snug text-gray-900">
                    <button
                      type="button"
                      onClick={handleEditDatetime}
                      className={linkClass}
                    >
                      {formatDateFull(draftDate)} ·{' '}
                      {`${draftStartHour}.${draftStartMinute}`}
                    </button>
                    {' – '}
                    <button
                      type="button"
                      onClick={handleEditEnd}
                      className={linkClass}
                    >
                      {`${draftEndHour}.${draftEndMinute}`}
                    </button>
                  </p>
                </div>

                {/* Conflict / validation message */}
                {(conflictLabel(summaryConflictBooking) || endBeforeStart) && (
                  <p className="mt-3 text-sm font-medium text-red-600">
                    {conflictLabel(summaryConflictBooking) ??
                      'Sluttiden måste vara efter starttiden.'}
                  </p>
                )}

                {/* Submit error */}
                {submitError && (
                  <div className="mt-3 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {submitError}
                  </div>
                )}

                {/* Boka button */}
                <button
                  type="button"
                  onClick={() => void handleBookingSubmit()}
                  disabled={isSubmitting || !canBook}
                  className="mt-6 flex w-full min-h-[52px] cursor-pointer items-center justify-center rounded-xl text-base font-semibold text-gray-900 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ backgroundColor: '#F1E334' }}
                >
                  {isSubmitting ? 'Bokar…' : 'Boka banan'}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
