import { useState } from 'react'

interface VerificationBannerProps {
  onResend: () => void
}

export function VerificationBanner({ onResend }: VerificationBannerProps) {
  const [sent, setSent] = useState(false)

  async function handleResend() {
    onResend()
    setSent(true)
    setTimeout(() => setSent(false), 3000)
  }

  return (
    <div
      className="flex items-center justify-center gap-2 px-4 py-3 text-sm text-gray-800"
      style={{ backgroundColor: '#F1E334' }}
      role="alert"
    >
      <span>Din e-postadress är inte verifierad.</span>
      {sent ? (
        <span className="font-semibold">Skickat!</span>
      ) : (
        <button
          type="button"
          onClick={() => void handleResend()}
          className="min-h-[44px] min-w-[44px] font-semibold underline hover:no-underline"
        >
          Skicka igen
        </button>
      )}
    </div>
  )
}
