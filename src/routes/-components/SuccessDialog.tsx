import { useState } from 'react'
import { formatTimeDisplay } from '../../lib/formatTimeDisplay'
import { shouldShowNudge } from '../../lib/GuestSession'
import { NudgePrompt } from './NudgePrompt'

interface SuccessDialogProps {
  startTime: Date
  endTime: Date
  onClose: () => void
}

export function SuccessDialog({
  startTime,
  endTime,
  onClose,
}: SuccessDialogProps) {
  const [nudgeDismissed, setNudgeDismissed] = useState(false)
  const dateStr = startTime.toLocaleDateString('sv-SE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
  const capitalized = dateStr.charAt(0).toUpperCase() + dateStr.slice(1)

  const startTimeStr = formatTimeDisplay(startTime)
  const endTimeStr = formatTimeDisplay(endTime)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Dialog card */}
      <div className="relative w-full max-w-sm rounded-2xl bg-white px-6 py-8 shadow-xl">
        {/* Yellow accent icon */}
        <div
          className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full"
          style={{ backgroundColor: '#F1E334' }}
        >
          <span className="text-xl font-bold text-gray-900">✓</span>
        </div>

        <h2 className="mb-6 text-center text-xl font-bold text-gray-900">
          Bokning bekräftad!
        </h2>

        <div className="mb-8 space-y-1 text-center">
          <p className="text-base font-medium text-gray-800">{capitalized}</p>
          <p className="text-base text-gray-600">
            {startTimeStr} – {endTimeStr}
          </p>
        </div>

        {shouldShowNudge() && !nudgeDismissed && (
          <NudgePrompt onDismiss={() => setNudgeDismissed(true)} />
        )}

        <button
          type="button"
          onClick={onClose}
          className="mt-6 flex w-full min-h-[44px] items-center justify-center rounded-xl px-4 py-3 text-sm font-semibold text-gray-900 transition-opacity"
          style={{ backgroundColor: '#F1E334' }}
        >
          Stäng
        </button>
      </div>
    </div>
  )
}
