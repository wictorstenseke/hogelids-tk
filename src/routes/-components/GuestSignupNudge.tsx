import * as GuestSession from '../../lib/GuestSession'
import { useAuthModal } from '../../lib/AuthModalContext'

const MEMBER_ADVANTAGES = [
  'Se vem som har bokat',
  'Se statistik över åren',
  'Delta i stegturneringen eller följ hur det går',
  'Ta bort dina bokningar från vilken enhet som helst',
]

interface GuestSignupNudgeProps {
  onDismiss: () => void
}

export function GuestSignupNudge({ onDismiss }: GuestSignupNudgeProps) {
  const { openAuthModal } = useAuthModal()
  const email = GuestSession.getEmail() ?? ''
  const bookingCount = GuestSession.getBookingCount()
  const isFullVariant = bookingCount <= 1

  function handleSignUp() {
    onDismiss()
    openAuthModal('sign-up', email)
  }

  function handleSignIn() {
    onDismiss()
    openAuthModal('sign-in', email)
  }

  if (isFullVariant) {
    return (
      <div className="mt-1 rounded-xl border border-gray-200 bg-gray-50 px-4 py-4">
        <p className="mb-1 text-sm font-semibold text-gray-800">
          Du är bara ett steg från ett konto
        </p>

        <p className="mb-2 mt-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
          Som inloggad kan du bland annat:
        </p>
        <ul className="mb-4 space-y-1">
          {MEMBER_ADVANTAGES.map((advantage) => (
            <li
              key={advantage}
              className="flex items-start gap-2 text-sm text-gray-700"
            >
              <span className="mt-0.5 shrink-0 text-xs text-gray-400">•</span>
              {advantage}
            </li>
          ))}
        </ul>

        <button
          type="button"
          onClick={handleSignUp}
          className="flex min-h-[44px] w-full items-center justify-center rounded-xl px-4 py-3 text-sm font-semibold text-gray-900 transition-opacity hover:opacity-80"
          style={{ backgroundColor: '#F1E334' }}
        >
          Skapa konto
        </button>

        <p className="mt-3 text-center text-sm text-gray-500">
          Har du redan ett konto?{' '}
          <button
            type="button"
            onClick={handleSignIn}
            className="font-medium text-gray-900 underline hover:text-gray-700"
          >
            Logga in
          </button>
        </p>

        <button
          type="button"
          onClick={onDismiss}
          className="mt-3 block w-full text-center text-sm text-gray-400 hover:text-gray-600"
        >
          Nej tack
        </button>
      </div>
    )
  }

  return (
    <div className="mt-1 rounded-xl border border-gray-200 bg-gray-50 px-4 py-4">
      <button
        type="button"
        onClick={handleSignUp}
        className="flex min-h-[44px] w-full items-center justify-center rounded-xl px-4 py-3 text-sm font-semibold text-gray-900 transition-opacity hover:opacity-80"
        style={{ backgroundColor: '#F1E334' }}
      >
        Skapa konto
      </button>
      <button
        type="button"
        onClick={onDismiss}
        className="mt-2 block w-full text-center text-sm text-gray-400 hover:text-gray-600"
      >
        Nej tack
      </button>
    </div>
  )
}
