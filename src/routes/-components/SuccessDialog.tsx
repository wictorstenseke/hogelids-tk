import { formatTimeDisplay } from '../../lib/formatTimeDisplay'
import { getBookingCount } from '../../lib/GuestSession'
import { GuestSignupNudge } from './GuestSignupNudge'

interface SuccessDialogProps {
  startTime: Date
  endTime: Date
  /** When true, offer account creation after guest booking. */
  isGuestBooking: boolean
  onClose: () => void
}

export function SuccessDialog({
  startTime,
  endTime,
  isGuestBooking,
  onClose,
}: SuccessDialogProps) {
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
        className="absolute inset-0 bg-black/40 backdrop-blur-sm motion-reduce:backdrop-blur-none"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Dialog card — tap outside or in-dialog actions (e.g. nudge) to dismiss */}
      <div className="relative max-h-[min(90vh,calc(100vh-2rem))] w-full max-w-sm overflow-y-auto rounded-2xl bg-white px-5 py-6 shadow-xl">
        {/* Yellow accent icon */}
        <div
          className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full"
          style={{ backgroundColor: '#F1E334' }}
        >
          <span className="text-lg font-bold text-gray-900">✓</span>
        </div>

        <h2 className="mb-2 text-center text-lg font-bold leading-tight text-gray-900">
          Bokning bekräftad!
        </h2>

        {(!isGuestBooking || getBookingCount() > 1) && (
          <div className="mb-5 space-y-0.5 text-center">
            <p className="text-sm font-medium text-gray-800">{capitalized}</p>
            <p className="text-sm text-gray-600">
              {startTimeStr} – {endTimeStr}
            </p>
          </div>
        )}

        {!isGuestBooking && (
          <button
            type="button"
            onClick={onClose}
            className="flex min-h-[44px] w-full items-center justify-center rounded-xl px-4 py-3 text-sm font-semibold text-gray-900 transition-opacity hover:opacity-80"
            style={{ backgroundColor: '#F1E334' }}
          >
            Klar
          </button>
        )}

        {isGuestBooking && <GuestSignupNudge onDismiss={onClose} />}
      </div>
    </div>
  )
}
