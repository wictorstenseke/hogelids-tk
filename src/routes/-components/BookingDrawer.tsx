import { useEffect, useMemo, useState } from 'react'
import { IconX } from '@tabler/icons-react'
import { WheelPicker, WheelPickerWrapper } from '@ncdai/react-wheel-picker'
import '@ncdai/react-wheel-picker/style.css'
import type { WheelPickerOption } from '@ncdai/react-wheel-picker'

type Step = 'date' | 'start' | 'end'

const STEP_LABELS: Record<Step, string> = {
  date: 'Datum',
  start: 'Starttid',
  end: 'Sluttid',
}

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

function formatDateSummary(dateValue: string): string {
  if (!dateValue) return ''
  const d = new Date(`${dateValue}T12:00:00`)
  const raw = d.toLocaleDateString('sv-SE', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })
  return raw.charAt(0).toUpperCase() + raw.slice(1)
}

interface BookingDrawerProps {
  dateValue: string
  startTimeValue: string
  endTimeValue: string
  onDateChange: (v: string) => void
  onStartTimeChange: (v: string) => void
  onEndTimeChange: (v: string) => void
  onClose: () => void
  initialStep?: Step
}

export function BookingDrawer({
  dateValue,
  startTimeValue,
  endTimeValue,
  onDateChange,
  onStartTimeChange,
  onEndTimeChange,
  onClose,
  initialStep = 'date',
}: BookingDrawerProps) {
  const [step, setStep] = useState<Step>(initialStep)
  const [visible, setVisible] = useState(false)

  const DATE_OPTIONS = useMemo(() => generateDateOptions(), [])
  const nearest = getNearestQuarter()

  const [draftDate, setDraftDate] = useState(
    dateValue || DATE_OPTIONS[0]?.value || ''
  )
  const [draftStartHour, setDraftStartHour] = useState(
    startTimeValue ? startTimeValue.split(':')[0]! : nearest.hour
  )
  const [draftStartMinute, setDraftStartMinute] = useState(
    startTimeValue ? startTimeValue.split(':')[1]! : nearest.minute
  )

  const endDefault = endTimeValue
    ? { hour: endTimeValue.split(':')[0]!, minute: endTimeValue.split(':')[1]! }
    : addTwoHours(draftStartHour, draftStartMinute)

  const [draftEndHour, setDraftEndHour] = useState(endDefault.hour)
  const [draftEndMinute, setDraftEndMinute] = useState(endDefault.minute)

  useEffect(() => {
    const id = requestAnimationFrame(() => setVisible(true))
    document.body.style.overflow = 'hidden'
    return () => {
      cancelAnimationFrame(id)
      document.body.style.overflow = ''
    }
  }, [])

  function handleClose() {
    setVisible(false)
    setTimeout(onClose, 280)
  }

  function handleNext() {
    if (step === 'date') {
      onDateChange(draftDate)
      setStep('start')
    } else if (step === 'start') {
      const startTime = `${draftStartHour}:${draftStartMinute}`
      onStartTimeChange(startTime)
      const computed = addTwoHours(draftStartHour, draftStartMinute)
      if (!endTimeValue) {
        setDraftEndHour(computed.hour)
        setDraftEndMinute(computed.minute)
      }
      setStep('end')
    } else {
      onEndTimeChange(`${draftEndHour}:${draftEndMinute}`)
      handleClose()
    }
  }

  const nextLabel = step === 'end' ? 'Klar' : 'Nästa'

  const wheelClassNames = {
    highlightWrapper: 'htk-wheel-highlight',
    optionItem: 'htk-wheel-option',
  }

  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-black/40 transition-opacity duration-300 ${visible ? 'opacity-100' : 'opacity-0'}`}
        onClick={handleClose}
        aria-hidden="true"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label={STEP_LABELS[step]}
        className={`fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl bg-white shadow-2xl transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          visible ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        <div className="px-5 pb-10 pt-5">
          {/* Header */}
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="font-display text-[20px] font-bold uppercase tracking-wide text-gray-900">
                {STEP_LABELS[step]}
              </h2>
              {step !== 'date' && dateValue && (
                <p className="mt-0.5 text-xs text-gray-500">
                  {formatDateSummary(dateValue)}
                  {step === 'end' && startTimeValue && ` · ${startTimeValue}`}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={handleClose}
              aria-label="Stäng"
              className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl bg-gray-100 text-gray-500 transition-colors hover:bg-gray-200 hover:text-gray-800"
            >
              <IconX size={18} stroke={2} />
            </button>
          </div>

          {/* Date wheel */}
          {step === 'date' && (
            <WheelPickerWrapper className="htk-wheel-wrapper">
              <WheelPicker
                options={DATE_OPTIONS}
                value={draftDate}
                onValueChange={(v) => setDraftDate(v)}
                visibleCount={8}
                optionItemHeight={44}
                infinite={false}
                classNames={wheelClassNames}
              />
            </WheelPickerWrapper>
          )}

          {/* Start time wheels */}
          {step === 'start' && (
            <WheelPickerWrapper className="htk-wheel-wrapper">
              <WheelPicker
                options={HOUR_OPTIONS}
                value={draftStartHour}
                onValueChange={(v) => setDraftStartHour(v)}
                visibleCount={8}
                optionItemHeight={44}
                infinite={true}
                classNames={wheelClassNames}
              />
              <WheelPicker
                options={MINUTE_OPTIONS}
                value={draftStartMinute}
                onValueChange={(v) => setDraftStartMinute(v)}
                visibleCount={8}
                optionItemHeight={44}
                infinite={true}
                classNames={wheelClassNames}
              />
            </WheelPickerWrapper>
          )}

          {/* End time wheels */}
          {step === 'end' && (
            <WheelPickerWrapper className="htk-wheel-wrapper">
              <WheelPicker
                options={HOUR_OPTIONS}
                value={draftEndHour}
                onValueChange={(v) => setDraftEndHour(v)}
                visibleCount={8}
                optionItemHeight={44}
                infinite={true}
                classNames={wheelClassNames}
              />
              <WheelPicker
                options={MINUTE_OPTIONS}
                value={draftEndMinute}
                onValueChange={(v) => setDraftEndMinute(v)}
                visibleCount={8}
                optionItemHeight={44}
                infinite={true}
                classNames={wheelClassNames}
              />
            </WheelPickerWrapper>
          )}

          <button
            type="button"
            onClick={handleNext}
            className="mt-6 flex w-full min-h-[52px] cursor-pointer items-center justify-center rounded-xl text-sm font-semibold text-gray-900 transition-opacity"
            style={{ backgroundColor: '#F1E334' }}
          >
            {nextLabel}
          </button>
        </div>
      </div>
    </>
  )
}
