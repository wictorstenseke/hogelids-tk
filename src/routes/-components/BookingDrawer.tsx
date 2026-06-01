import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import {
  IconArrowLeft,
  IconCheck,
  IconSearch,
  IconX,
} from '@tabler/icons-react'
import { WheelPicker, WheelPickerWrapper } from '@ncdai/react-wheel-picker'
import '@ncdai/react-wheel-picker/style.css'
import type { WheelPickerOption } from '@ncdai/react-wheel-picker'
import { formatTimeDisplay } from '../../lib/formatTimeDisplay'
import { resolveBookingInterval } from '../../lib/bookingInterval'
import {
  type BookingWithId,
  findConflictingBooking,
} from '../../services/BookingService'
import { BOOKING_DRAWER_PRIMARY_BUTTON_CLASS } from '../../lib/bookingPrimaryButtonClass'
import type { MenuSelectOption } from './MenuSelect'

type Step = 'datetime' | 'end' | 'opponent' | 'summary'

/** Snapshot when opening edit from summary — restored if user backs out without confirming */
type BookingDraftSnapshot = {
  draftDate: string
  draftStartHour: string
  draftStartMinute: string
  draftEndHour: string
  draftEndMinute: string
  draftOpponentUid: string
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
  onSubmit: (
    date: string,
    startTime: string,
    endTime: string,
    opponent: { uid: string; displayName: string } | null
  ) => Promise<void>
  onClose: () => void
  playerNames?: { playerA: string; playerB: string }
  /** When true, insert an opponent picker step after the datetime wheels. */
  showOpponentStep?: boolean
  /** Pre-built options for the opponent picker. First option is "Ingen motspelare" (value=''). */
  opponentOptions?: MenuSelectOption[]
}

export function BookingDrawer({
  existingBookings,
  onSubmit,
  onClose,
  playerNames,
  showOpponentStep = false,
  opponentOptions = [],
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
  const [draftOpponentUid, setDraftOpponentUid] = useState('')
  const [opponentQuery, setOpponentQuery] = useState('')

  const filteredOpponentOptions = useMemo(() => {
    const q = opponentQuery.trim().toLowerCase()
    if (!q) return []
    return opponentOptions.filter(
      (o) => o.value !== '' && o.label.toLowerCase().includes(q)
    )
  }, [opponentOptions, opponentQuery])

  const draftOpponent = useMemo(() => {
    if (!draftOpponentUid) return null
    const opt = opponentOptions.find((o) => o.value === draftOpponentUid)
    return opt ? { uid: opt.value, displayName: opt.label } : null
  }, [draftOpponentUid, opponentOptions])

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
      draftOpponentUid,
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
      setDraftOpponentUid(snap.draftOpponentUid)
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
      const wasFromSummary = fromSummary
      if (!wasFromSummary) {
        // First pass: auto-calculate end time from start (+2h wall clock, snap to 15 min)
        const s = new Date(`${draftDate}T${draftStartHour}:${draftStartMinute}`)
        const e = new Date(s.getTime() + 2 * 60 * 60 * 1000)
        const totalMins = e.getHours() * 60 + e.getMinutes()
        const snapped = Math.round(totalMins / 15) * 15
        const eh = Math.floor(snapped / 60) % 24
        const em = snapped % 60
        setDraftEndHour(String(eh).padStart(2, '0'))
        setDraftEndMinute(String(em).padStart(2, '0'))
      }
      preEditDraftRef.current = null
      if (!wasFromSummary && showOpponentStep) {
        setStep('opponent')
      } else {
        setStep('summary')
      }
      setFromSummary(false)
    } else if (step === 'end') {
      preEditDraftRef.current = null
      setStep('summary')
      setFromSummary(false)
    } else if (step === 'opponent') {
      preEditDraftRef.current = null
      setStep('summary')
      setFromSummary(false)
    }
  }

  function handleSkipOpponent() {
    setDraftOpponentUid('')
    preEditDraftRef.current = null
    setStep('summary')
    setFromSummary(false)
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

  function handleEditOpponent() {
    snapshotDraftForEdit()
    setFromSummary(true)
    setStep('opponent')
  }

  async function handleBookingSubmit() {
    setIsSubmitting(true)
    setSubmitError(null)
    try {
      await onSubmit(
        draftDate,
        `${draftStartHour}:${draftStartMinute}`,
        `${draftEndHour}:${draftEndMinute}`,
        draftOpponent
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

  // Datetime step: tentative window = start + 2h real time (crosses midnight)
  const tentativeEndDate = startDate
    ? new Date(startDate.getTime() + 2 * 60 * 60 * 1000)
    : null

  const summaryInterval = draftDate
    ? resolveBookingInterval(
        draftDate,
        `${draftStartHour}:${draftStartMinute}`,
        `${draftEndHour}:${draftEndMinute}`
      )
    : null

  const datetimeConflictBooking =
    startDate && tentativeEndDate
      ? findConflictingBooking(existingBookings, startDate, tentativeEndDate)
      : null
  const summaryConflictBooking = summaryInterval
    ? findConflictingBooking(
        existingBookings,
        summaryInterval.start,
        summaryInterval.end
      )
    : null

  function conflictLabel(booking: BookingWithId | null) {
    if (!booking) return null
    return `Upptaget ${formatTimeDisplay(booking.startTime.toDate())} – ${formatTimeDisplay(booking.endTime.toDate())}`
  }

  const endBeforeStart = draftDate ? summaryInterval === null : false
  const summaryConflictLabel = conflictLabel(summaryConflictBooking)
  const datetimeConflictLabel = conflictLabel(datetimeConflictBooking)

  const canBook = !summaryConflictLabel && !endBeforeStart

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
        : step === 'opponent'
          ? fromSummary
            ? 'Ändra motspelare'
            : 'Välj motspelare'
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
          <div
            ref={drawerBodyMeasureRef}
            className="px-5 pt-5 pb-[calc(3rem+env(safe-area-inset-bottom,0px))]"
          >
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
                {!isSubmitting && datetimeConflictLabel && (
                  <p className="mt-3 text-sm font-medium text-red-600">
                    {datetimeConflictLabel}
                  </p>
                )}
                <button
                  type="button"
                  onClick={handleNext}
                  className={BOOKING_DRAWER_PRIMARY_BUTTON_CLASS}
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
                  className={BOOKING_DRAWER_PRIMARY_BUTTON_CLASS}
                >
                  Klar
                </button>
              </>
            )}

            {/* Opponent step */}
            {step === 'opponent' && (
              <>
                <p className="mb-3 text-sm text-gray-600">
                  Spelar du med en annan medlem? Sök nedan (valfritt).
                </p>
                {draftOpponent ? (
                  <div className="flex items-center justify-between gap-3 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3">
                    <span className="min-w-0 text-base font-semibold text-gray-900 wrap-break-word">
                      {draftOpponent.displayName}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setDraftOpponentUid('')
                        setOpponentQuery('')
                      }}
                      className="shrink-0 min-h-[36px] cursor-pointer rounded-lg bg-white px-3 py-1.5 text-sm font-semibold text-gray-700 border border-gray-200 transition-colors hover:bg-gray-100"
                      aria-label="Ta bort motspelare"
                    >
                      Ta bort
                    </button>
                  </div>
                ) : (
                  <div className="relative">
                    <IconSearch
                      size={18}
                      stroke={1.75}
                      className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                      aria-hidden
                    />
                    <input
                      type="text"
                      value={opponentQuery}
                      onChange={(e) => setOpponentQuery(e.target.value)}
                      placeholder="Sök medlem"
                      className="w-full min-h-[44px] rounded-2xl border border-gray-200 bg-gray-50 pl-10 pr-3 py-2 text-base text-gray-900 placeholder:text-gray-400 focus:border-[#F1E334] focus:outline-none focus:ring-2 focus:ring-[#F1E334]/30"
                      aria-label="Sök medlem"
                    />
                  </div>
                )}
                {!draftOpponent && opponentQuery.trim() !== '' && (
                  <ul
                    role="listbox"
                    aria-label="Sökresultat motspelare"
                    className="mt-2 max-h-[35vh] overflow-y-auto overflow-x-hidden rounded-2xl border border-gray-200 bg-white"
                  >
                    {filteredOpponentOptions.length === 0 ? (
                      <li
                        role="presentation"
                        className="px-4 py-3 text-sm text-gray-500"
                        aria-live="polite"
                      >
                        Inga träffar
                      </li>
                    ) : (
                      filteredOpponentOptions.map((opt) => {
                        const selected = opt.value === draftOpponentUid
                        return (
                          <li
                            key={opt.value}
                            role="option"
                            aria-selected={selected}
                          >
                            <button
                              type="button"
                              onClick={() => {
                                setDraftOpponentUid(opt.value)
                                setOpponentQuery('')
                              }}
                              className={[
                                'flex w-full min-h-[44px] items-center justify-between gap-2 px-4 py-2.5 text-left text-base font-medium transition-colors',
                                selected
                                  ? 'bg-[#F1E334] text-gray-900'
                                  : 'text-gray-700 hover:bg-gray-50',
                              ].join(' ')}
                            >
                              <span className="min-w-0 wrap-break-word">
                                {opt.label}
                              </span>
                              <span
                                className="flex h-[18px] w-[18px] shrink-0 items-center justify-center"
                                aria-hidden
                              >
                                {selected ? (
                                  <IconCheck size={18} stroke={2} />
                                ) : (
                                  <span className="block h-[18px] w-[18px]" />
                                )}
                              </span>
                            </button>
                          </li>
                        )
                      })
                    )}
                  </ul>
                )}
                {draftOpponentUid ? (
                  <button
                    type="button"
                    onClick={handleNext}
                    className={BOOKING_DRAWER_PRIMARY_BUTTON_CLASS}
                  >
                    Nästa
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleSkipOpponent}
                    className="mt-6 flex w-full min-h-[52px] cursor-pointer items-center justify-center rounded-xl border border-gray-200 bg-gray-50 px-4 text-base font-semibold text-gray-700 transition-colors hover:bg-gray-100"
                  >
                    Hoppa över
                  </button>
                )}
              </>
            )}

            {/* Summary step */}
            {step === 'summary' && (
              <>
                {/* Booking summary card */}
                <div className="rounded-xl bg-gray-50 px-4 py-4 text-center">
                  {playerNames && (
                    <p className="mb-2 text-sm text-gray-600">
                      {playerNames.playerA} vs {playerNames.playerB}
                    </p>
                  )}
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
                  {showOpponentStep && (
                    <p className="mt-2 text-sm text-gray-600">
                      {draftOpponent ? (
                        <>
                          <span className="text-gray-500">Motspelare: </span>
                          <button
                            type="button"
                            onClick={handleEditOpponent}
                            className={linkClass}
                          >
                            {draftOpponent.displayName}
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={handleEditOpponent}
                          className={linkClass}
                        >
                          Lägg till motspelare
                        </button>
                      )}
                    </p>
                  )}
                </div>

                {/* Conflict / validation message */}
                {((!isSubmitting && summaryConflictLabel) ||
                  endBeforeStart) && (
                  <p className="mt-3 text-sm font-medium text-red-600">
                    {summaryConflictLabel ??
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
                  className={BOOKING_DRAWER_PRIMARY_BUTTON_CLASS}
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
