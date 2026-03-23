import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
  getErrorCode,
  getFirebaseErrorMessage,
} from '../../lib/firebaseAuthErrors'
import * as GuestSession from '../../lib/GuestSession'
import { BOOKINGS_QUERY_KEY } from '../../services/BookingService'
import { signUp } from '../../services/AuthService'

const MEMBER_ADVANTAGES = [
  'Se vem som har bokat',
  'Se statistik över åren',
  'Delta i stegturneringen eller följ hur det går',
  'Ta bort dina bokningar från vilken enhet som helst',
]

interface GuestSignupNudgeProps {
  onDismiss: () => void
  onAccountCreated: () => void
}

export function GuestSignupNudge({
  onDismiss,
  onAccountCreated,
}: GuestSignupNudgeProps) {
  const queryClient = useQueryClient()
  const storedEmail = GuestSession.getEmail() ?? ''

  const [displayName, setDisplayName] = useState(GuestSession.getName() ?? '')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    const name = displayName.trim()
    if (!name) {
      setError('Ange ditt namn.')
      return
    }
    if (!storedEmail) {
      setError('Saknar e-post. Försök boka igen.')
      return
    }
    if (password.length < 6) {
      setError('Lösenordet måste vara minst 6 tecken.')
      return
    }
    if (password !== confirmPassword) {
      setError('Lösenorden matchar inte.')
      return
    }

    setLoading(true)
    try {
      await signUp(storedEmail, password, name)
      GuestSession.setName(name)
      void queryClient.invalidateQueries({ queryKey: BOOKINGS_QUERY_KEY })
      onAccountCreated()
    } catch (err) {
      setError(getFirebaseErrorMessage(getErrorCode(err)))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mt-1 rounded-xl border border-gray-200 bg-gray-50 px-4 py-4">
      <p className="mb-1 text-sm font-semibold text-gray-800">
        Du är bara ett steg från ett konto
      </p>
      <p className="mb-3 text-sm text-gray-600">
        Välj lösenord nedan — samma e-post som vid bokningen.
      </p>

      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
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

      <form
        onSubmit={(e) => void handleSubmit(e)}
        className="space-y-3"
        noValidate
      >
        <div>
          <label
            htmlFor="guest-signup-email"
            className="mb-1 block text-sm font-medium text-gray-700"
          >
            E-post
          </label>
          <input
            id="guest-signup-email"
            type="email"
            readOnly
            value={storedEmail}
            className="w-full min-h-[44px] cursor-not-allowed rounded-xl border border-gray-200 bg-gray-100 px-4 py-3 text-sm text-gray-600"
            autoComplete="email"
          />
        </div>

        <div>
          <label
            htmlFor="guest-signup-name"
            className="mb-1 block text-sm font-medium text-gray-700"
          >
            Namn
          </label>
          <input
            id="guest-signup-name"
            type="text"
            autoComplete="name"
            required
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            disabled={loading}
            className="w-full min-h-[44px] rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 focus:border-gray-400 focus:outline-none disabled:opacity-50"
            placeholder="För- och efternamn"
          />
        </div>

        <div>
          <label
            htmlFor="guest-signup-password"
            className="mb-1 block text-sm font-medium text-gray-700"
          >
            Lösenord
          </label>
          <input
            id="guest-signup-password"
            type="password"
            autoComplete="new-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
            className="w-full min-h-[44px] rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 focus:border-gray-400 focus:outline-none disabled:opacity-50"
          />
        </div>

        <div>
          <label
            htmlFor="guest-signup-password-confirm"
            className="mb-1 block text-sm font-medium text-gray-700"
          >
            Bekräfta lösenord
          </label>
          <input
            id="guest-signup-password-confirm"
            type="password"
            autoComplete="new-password"
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            disabled={loading}
            className="w-full min-h-[44px] rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 focus:border-gray-400 focus:outline-none disabled:opacity-50"
          />
        </div>

        {error && (
          <p className="text-sm text-red-600" role="alert">
            {error}
            {error.includes('används redan') && (
              <span className="block mt-1 text-gray-600">
                Logga in via knappen uppe till höger.
              </span>
            )}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="flex w-full min-h-[44px] items-center justify-center rounded-xl px-4 py-3 text-sm font-semibold text-gray-900 transition-opacity disabled:opacity-50"
          style={{ backgroundColor: '#F1E334' }}
        >
          {loading ? 'Skapar konto…' : 'Skapa konto'}
        </button>
      </form>

      <button
        type="button"
        onClick={onDismiss}
        disabled={loading}
        className="mt-3 block w-full text-center text-sm text-gray-500 underline underline-offset-2 hover:text-gray-700 disabled:opacity-50"
      >
        Nej tack
      </button>
    </div>
  )
}
