import { useState } from 'react'
import {
  IconAlertCircle,
  IconArrowUpRight,
  IconCheck,
  IconCopy,
} from '@tabler/icons-react'
import { MEMBERSHIP_FEE_SEK, MEMBERSHIP_SWISH_NUMBER } from '../../data/club'
import { copyTextToClipboard } from '../../lib/copyToClipboard'
import { DESKTOP_QUERY, useIsDesktop } from '../../lib/useIsDesktop'
import { SheetDialogShell } from './SheetDialogShell'

const TITLE_ID = 'membership-swish-dialog-title'

// NOTE: swish:// and the Android intent URL must be verified on physical devices.
// The exact deep-link path Swish honors may change between app versions.
function openSwishApp() {
  const isAndroid = /android/i.test(navigator.userAgent)
  if (isAndroid) {
    // intent:// lets Chrome on Android fall back to Play Store if the app is missing.
    window.location.assign(
      'intent://payment#Intent;scheme=swish;package=se.bankgirot.swish;' +
        'S.browser_fallback_url=https%3A%2F%2Fplay.google.com%2Fstore%2Fapps%2Fdetails%3Fid%3Dse.bankgirot.swish;end'
    )
  } else {
    window.location.assign('swish://')
  }
}

interface MembershipSwishDialogProps {
  onClose: () => void
}

function formatSwishDisplay(digits: string): string {
  const d = digits.replace(/\D/g, '')
  if (d.length === 10) {
    return `${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6, 8)} ${d.slice(8)}`
  }
  return digits
}

type Phase = 'copy' | 'confirming' | 'openSwish' | 'error'

export function MembershipSwishDialog({ onClose }: MembershipSwishDialogProps) {
  const [phase, setPhase] = useState<Phase>('copy')
  const isDesktop = useIsDesktop()

  const swishDigits = MEMBERSHIP_SWISH_NUMBER.replace(/\D/g, '')
  const hasSwish = swishDigits.length > 0

  async function handleCopy() {
    if (!hasSwish) return
    const ok = await copyTextToClipboard(swishDigits)
    if (ok) {
      setPhase('confirming')
      setTimeout(() => {
        setPhase(
          window.matchMedia(DESKTOP_QUERY).matches ? 'copy' : 'openSwish'
        )
      }, 450)
    } else {
      setPhase('error')
      setTimeout(() => setPhase('copy'), 2000)
    }
  }

  const swishQrSrc = `${import.meta.env.BASE_URL}htk-swish.png`

  return (
    <SheetDialogShell
      titleId={TITLE_ID}
      title="Medlemskap & Swish"
      onClose={onClose}
      scrollBody
      maxHeightVariant="swish"
      dialogMaxWidth="lg"
    >
      <div className="space-y-4 text-sm text-gray-700">
        <p>
          Medlemsavgiften är <strong>{MEMBERSHIP_FEE_SEK} kr per år</strong>.
          Skanna QR-koden i Swish eller ange numret nedan som mottagare.
        </p>

        {hasSwish ? (
          <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-4">
            <div className="mx-auto max-w-[min(280px,100%)]">
              <img
                src={swishQrSrc}
                alt="Swish QR-kod för medlemsavgift till Högelids Tennisklubb"
                width={280}
                height={280}
                className="h-auto w-full rounded-lg bg-white p-2 shadow-sm"
                decoding="async"
              />
            </div>
            <div
              className="mt-4 flex items-center gap-3 rounded-lg bg-gray-100 px-3 py-3 sm:gap-4 sm:px-4"
              aria-live="polite"
            >
              <div className="min-w-0 flex-1 space-y-0.5">
                <p className="text-xs font-semibold leading-tight tracking-wider text-gray-500">
                  Swish (Högelids Tennisklubb)
                </p>
                <p className="min-w-0 select-text text-base font-bold text-gray-900">
                  {formatSwishDisplay(swishDigits)}
                </p>
              </div>

              {phase === 'openSwish' && !isDesktop ? (
                <button
                  type="button"
                  onClick={openSwishApp}
                  title="Öppna Swish-appen"
                  aria-label="Öppna Swish-appen"
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-[#d4c92e] bg-[#F1E334] px-3 py-2.5 text-sm font-semibold text-gray-900 transition-colors hover:bg-[#e8da22] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d4c92e] min-h-[44px]"
                >
                  Öppna Swish
                  <IconArrowUpRight aria-hidden size={17} stroke={2} />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => void handleCopy()}
                  title={
                    phase === 'confirming'
                      ? 'Kopierat!'
                      : phase === 'error'
                        ? 'Kunde inte kopiera'
                        : 'Kopiera nummer'
                  }
                  aria-label={
                    phase === 'confirming'
                      ? 'Kopierat!'
                      : phase === 'error'
                        ? 'Kunde inte kopiera'
                        : 'Kopiera Swish-nummer'
                  }
                  className={`inline-flex shrink-0 items-center justify-center rounded-xl border p-2.5 transition-colors duration-100 ease-out focus-visible:outline-2 focus-visible:outline-offset-2 min-h-[44px] min-w-[44px] sm:min-h-10 sm:min-w-10 ${
                    phase === 'confirming'
                      ? 'border-green-200 bg-green-50 text-green-700 focus-visible:outline-green-600'
                      : phase === 'error'
                        ? 'border-red-200 bg-red-50 text-red-700 focus-visible:outline-red-600'
                        : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-100 hover:text-gray-900 focus-visible:outline-gray-900'
                  }`}
                >
                  {phase === 'confirming' ? (
                    <IconCheck aria-hidden size={22} stroke={1.75} />
                  ) : phase === 'error' ? (
                    <IconAlertCircle aria-hidden size={22} stroke={1.75} />
                  ) : (
                    <IconCopy aria-hidden size={22} stroke={1.75} />
                  )}
                </button>
              )}
            </div>
          </div>
        ) : (
          <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-950">
            Swish-nummer för medlemsavgift läggs in här snart. Kontakta
            styrelsen om du vill betala innan det är publicerat.
          </p>
        )}
      </div>
    </SheetDialogShell>
  )
}
