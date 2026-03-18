import { useEffect, useState } from 'react'
import { IconX } from '@tabler/icons-react'
import { signIn, signUp, sendPasswordReset } from '../../services/AuthService'

type View = 'sign-in' | 'sign-up' | 'forgot-password'

interface AuthModalProps {
  onClose: () => void
  initialView?: View
}

function getFirebaseErrorMessage(code: string): string {
  switch (code) {
    case 'auth/email-already-in-use':
      return 'E-postadressen används redan.'
    case 'auth/invalid-credential':
      return 'Felaktig e-post eller lösenord.'
    case 'auth/weak-password':
      return 'Lösenordet måste vara minst 6 tecken.'
    case 'auth/too-many-requests':
      return 'För många försök. Försök igen senare.'
    case 'auth/operation-not-allowed':
      return 'Inloggning med e-post är inte aktiverat.'
    default:
      return 'Något gick fel. Försök igen.'
  }
}

function getErrorCode(err: unknown): string {
  if (
    err !== null &&
    typeof err === 'object' &&
    'code' in err &&
    typeof (err as { code: unknown }).code === 'string'
  ) {
    return (err as { code: string }).code
  }
  return ''
}

export function AuthModal({
  onClose,
  initialView = 'sign-in',
}: AuthModalProps) {
  const [view, setView] = useState<View>(initialView)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [resetSent, setResetSent] = useState(false)
  const [visible, setVisible] = useState(false)

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

  // Form fields
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  function switchView(next: View) {
    setView(next)
    setError(null)
    setResetSent(false)
  }

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      await signIn(email, password)
      onClose()
    } catch (err) {
      setError(getFirebaseErrorMessage(getErrorCode(err)))
    } finally {
      setLoading(false)
    }
  }

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      await signUp(email, password, displayName)
      onClose()
    } catch (err) {
      setError(getFirebaseErrorMessage(getErrorCode(err)))
    } finally {
      setLoading(false)
    }
  }

  async function handleForgotPassword(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      await sendPasswordReset(email)
      setResetSent(true)
    } catch (err) {
      setError(getFirebaseErrorMessage(getErrorCode(err)))
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-black/40 transition-opacity duration-300 ${visible ? 'opacity-100' : 'opacity-0'}`}
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Panel — slides up from bottom on mobile, centered modal on desktop */}
      <div
        role="dialog"
        aria-modal="true"
        className={[
          'fixed z-50 w-full bg-white shadow-2xl',
          'bottom-0 left-0 right-0 rounded-t-3xl',
          'transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]',
          visible ? 'translate-y-0' : 'translate-y-full',
          'md:bottom-auto md:left-1/2 md:right-auto md:top-1/2',
          'md:-translate-x-1/2 md:-translate-y-1/2',
          'md:max-w-sm md:rounded-2xl md:transition-none',
        ].join(' ')}
      >
        <div className="px-6 pb-10 pt-6">
          {/* Close button */}
          <div className="mb-5 flex items-center justify-end">
            <button
              type="button"
              onClick={handleClose}
              aria-label="Stäng"
              className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl bg-gray-100 text-gray-500 transition-colors hover:bg-gray-200 hover:text-gray-800"
            >
              <IconX size={18} stroke={2} />
            </button>
          </div>

          {view === 'sign-in' && (
            <>
              <h2 className="mb-6 text-xl font-bold text-gray-900">Logga in</h2>

              <form
                onSubmit={(e) => void handleSignIn(e)}
                className="space-y-4"
                noValidate
              >
                <div>
                  <label
                    htmlFor="signin-email"
                    className="mb-1 block text-sm font-medium text-gray-700"
                  >
                    E-post
                  </label>
                  <input
                    id="signin-email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={loading}
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 focus:border-gray-400 focus:outline-none disabled:opacity-50"
                    placeholder="din@epost.se"
                  />
                </div>

                <div>
                  <label
                    htmlFor="signin-password"
                    className="mb-1 block text-sm font-medium text-gray-700"
                  >
                    Lösenord
                  </label>
                  <input
                    id="signin-password"
                    type="password"
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 focus:border-gray-400 focus:outline-none disabled:opacity-50"
                    placeholder="••••••"
                  />
                </div>

                {error && (
                  <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="flex min-h-[44px] w-full items-center justify-center rounded-xl px-4 py-3 text-sm font-semibold text-gray-900 transition-opacity disabled:opacity-60"
                  style={{ backgroundColor: '#F1E334' }}
                >
                  {loading ? 'Laddar…' : 'Logga in'}
                </button>
              </form>

              <div className="mt-5 space-y-2 text-center text-sm text-gray-500">
                <p>
                  <button
                    type="button"
                    onClick={() => switchView('forgot-password')}
                    className="underline hover:text-gray-800"
                  >
                    Glömt lösenord?
                  </button>
                </p>
                <p>
                  Inget konto?{' '}
                  <button
                    type="button"
                    onClick={() => switchView('sign-up')}
                    className="font-medium text-gray-900 underline hover:text-gray-700"
                  >
                    Skapa konto
                  </button>
                </p>
              </div>
            </>
          )}

          {view === 'sign-up' && (
            <>
              <h2 className="mb-6 text-xl font-bold text-gray-900">
                Skapa konto
              </h2>

              <form
                onSubmit={(e) => void handleSignUp(e)}
                className="space-y-4"
                noValidate
              >
                <div>
                  <label
                    htmlFor="signup-name"
                    className="mb-1 block text-sm font-medium text-gray-700"
                  >
                    Namn
                  </label>
                  <input
                    id="signup-name"
                    type="text"
                    autoComplete="name"
                    required
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    disabled={loading}
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 focus:border-gray-400 focus:outline-none disabled:opacity-50"
                    placeholder="För- och efternamn"
                  />
                </div>

                <div>
                  <label
                    htmlFor="signup-email"
                    className="mb-1 block text-sm font-medium text-gray-700"
                  >
                    E-post
                  </label>
                  <input
                    id="signup-email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={loading}
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 focus:border-gray-400 focus:outline-none disabled:opacity-50"
                    placeholder="din@epost.se"
                  />
                </div>

                <div>
                  <label
                    htmlFor="signup-password"
                    className="mb-1 block text-sm font-medium text-gray-700"
                  >
                    Lösenord
                  </label>
                  <input
                    id="signup-password"
                    type="password"
                    autoComplete="new-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 focus:border-gray-400 focus:outline-none disabled:opacity-50"
                    placeholder="Minst 6 tecken"
                  />
                </div>

                {error && (
                  <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="flex min-h-[44px] w-full items-center justify-center rounded-xl px-4 py-3 text-sm font-semibold text-gray-900 transition-opacity disabled:opacity-60"
                  style={{ backgroundColor: '#F1E334' }}
                >
                  {loading ? 'Laddar…' : 'Skapa konto'}
                </button>
              </form>

              <div className="mt-5 text-center text-sm text-gray-500">
                <p>
                  Har du redan ett konto?{' '}
                  <button
                    type="button"
                    onClick={() => switchView('sign-in')}
                    className="font-medium text-gray-900 underline hover:text-gray-700"
                  >
                    Logga in
                  </button>
                </p>
              </div>
            </>
          )}

          {view === 'forgot-password' && (
            <>
              <h2 className="mb-2 text-xl font-bold text-gray-900">
                Glömt lösenord?
              </h2>
              <p className="mb-6 text-sm text-gray-500">
                Ange din e-postadress så skickar vi en länk för att återställa
                lösenordet.
              </p>

              {resetSent ? (
                <div className="rounded-xl border border-green-100 bg-green-50 px-4 py-4 text-sm text-green-700">
                  Ett e-postmeddelande har skickats. Kontrollera din inkorg.
                </div>
              ) : (
                <form
                  onSubmit={(e) => void handleForgotPassword(e)}
                  className="space-y-4"
                  noValidate
                >
                  <div>
                    <label
                      htmlFor="reset-email"
                      className="mb-1 block text-sm font-medium text-gray-700"
                    >
                      E-post
                    </label>
                    <input
                      id="reset-email"
                      type="email"
                      autoComplete="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={loading}
                      className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 focus:border-gray-400 focus:outline-none disabled:opacity-50"
                      placeholder="din@epost.se"
                    />
                  </div>

                  {error && (
                    <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
                      {error}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="flex min-h-[44px] w-full items-center justify-center rounded-xl px-4 py-3 text-sm font-semibold text-gray-900 transition-opacity disabled:opacity-60"
                    style={{ backgroundColor: '#F1E334' }}
                  >
                    {loading ? 'Laddar…' : 'Skicka återställningslänk'}
                  </button>
                </form>
              )}

              <div className="mt-5 text-center text-sm text-gray-500">
                <p>
                  <button
                    type="button"
                    onClick={() => switchView('sign-in')}
                    className="font-medium text-gray-900 underline hover:text-gray-700"
                  >
                    Tillbaka till inloggning
                  </button>
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  )
}
