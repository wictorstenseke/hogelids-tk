import { useEffect, useRef, useState } from 'react'
import { IconX } from '@tabler/icons-react'

type Step = 'date' | 'start' | 'end'

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

function formatDateLabel(dateValue: string): string {
  if (!dateValue) return ''
  const d = new Date(`${dateValue}T12:00:00`)
  return d.toLocaleDateString('sv-SE', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })
}

const STEP_LABELS: Record<Step, string> = {
  date: 'Datum',
  start: 'Starttid',
  end: 'Sluttid',
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

  const dragStartY = useRef<number | null>(null)
  const [dragOffset, setDragOffset] = useState(0)

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

  function onTouchStart(e: React.TouchEvent) {
    dragStartY.current = e.touches[0]?.clientY ?? null
  }

  function onTouchMove(e: React.TouchEvent) {
    if (dragStartY.current === null) return
    setDragOffset(
      Math.max(0, (e.touches[0]?.clientY ?? 0) - dragStartY.current)
    )
  }

  function onTouchEnd() {
    if (dragOffset > 100) {
      handleClose()
    } else {
      setDragOffset(0)
    }
    dragStartY.current = null
  }

  function handleNext() {
    if (step === 'date') setStep('start')
    else if (step === 'start') setStep('end')
    else handleClose()
  }

  const canAdvance =
    (step === 'date' && !!dateValue) ||
    (step === 'start' && !!startTimeValue) ||
    (step === 'end' && !!endTimeValue)

  const nextLabel = step === 'end' ? 'Klar' : 'Nästa'

  const panelStyle =
    dragOffset > 0
      ? { transform: `translateY(${dragOffset}px)`, transition: 'none' }
      : undefined

  const inputClass =
    'w-full min-h-[52px] rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-base text-gray-900 focus:border-[#F1E334] focus:outline-none focus:ring-2 focus:ring-[#F1E334]/30'

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
        style={panelStyle}
        className={`fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl bg-white shadow-2xl transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          visible ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        <div
          className="flex flex-col items-center pb-1 pt-3"
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          <div className="h-1 w-10 rounded-full bg-gray-300" />
        </div>

        <div className="px-5 pb-10 pt-3">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="font-display text-[20px] font-bold uppercase tracking-wide text-gray-900">
                {STEP_LABELS[step]}
              </h2>
              {step !== 'date' && dateValue && (
                <p className="mt-0.5 text-xs text-gray-500">
                  {formatDateLabel(dateValue)}
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

          {step === 'date' && (
            <div>
              <label
                htmlFor="drawer-date"
                className="mb-2 block text-sm font-medium text-gray-700"
              >
                Välj datum
              </label>
              <input
                id="drawer-date"
                type="date"
                value={dateValue}
                onChange={(e) => onDateChange(e.target.value)}
                autoFocus
                className={inputClass}
              />
            </div>
          )}

          {step === 'start' && (
            <div>
              <label
                htmlFor="drawer-start"
                className="mb-2 block text-sm font-medium text-gray-700"
              >
                Välj starttid
              </label>
              <input
                id="drawer-start"
                type="time"
                step="900"
                value={startTimeValue}
                onChange={(e) => onStartTimeChange(e.target.value)}
                autoFocus
                className={inputClass}
              />
            </div>
          )}

          {step === 'end' && (
            <div>
              <label
                htmlFor="drawer-end"
                className="mb-2 block text-sm font-medium text-gray-700"
              >
                Välj sluttid
              </label>
              <input
                id="drawer-end"
                type="time"
                step="900"
                value={endTimeValue}
                onChange={(e) => onEndTimeChange(e.target.value)}
                autoFocus
                className={inputClass}
              />
            </div>
          )}

          <button
            type="button"
            onClick={handleNext}
            disabled={!canAdvance}
            className="mt-6 flex w-full min-h-[52px] cursor-pointer items-center justify-center rounded-xl text-sm font-semibold text-gray-900 transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
            style={{ backgroundColor: '#F1E334' }}
          >
            {nextLabel}
          </button>
        </div>
      </div>
    </>
  )
}
