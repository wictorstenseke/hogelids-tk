import {
  IconAlertCircle,
  IconCheck,
  IconCopy,
  IconPhoneCall,
} from '@tabler/icons-react'
import { useId, useState } from 'react'
import { copyTextToClipboard } from '../../lib/copyToClipboard'
import {
  formatPhoneForDisplay,
  normalizeSwedishPhoneDigits,
  swedishPhoneToCopyPlain,
  swedishPhoneToTelHref,
} from '../../lib/phoneFormat'
import { SheetDialogShell } from './SheetDialogShell'

type CopyPhase = 'idle' | 'confirming' | 'error'

export function ParticipantPhoneSheetDialog({
  displayName,
  phone,
}: {
  displayName: string
  phone: string
}) {
  const [open, setOpen] = useState(false)
  const [copyPhase, setCopyPhase] = useState<CopyPhase>('idle')
  const titleId = useId()

  const digits = normalizeSwedishPhoneDigits(phone)
  if (!digits) return null
  const telHref = swedishPhoneToTelHref(phone)
  const display = formatPhoneForDisplay(phone)

  function handleCloseSheet() {
    setCopyPhase('idle')
    setOpen(false)
  }

  async function handleCopy() {
    const ok = await copyTextToClipboard(swedishPhoneToCopyPlain(phone))
    if (ok) {
      setCopyPhase('confirming')
      setTimeout(() => setCopyPhase('idle'), 2000)
    } else {
      setCopyPhase('error')
      setTimeout(() => setCopyPhase('idle'), 2000)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          setCopyPhase('idle')
          setOpen(true)
        }}
        aria-haspopup="dialog"
        aria-label={`Telefonnummer för ${displayName}`}
        className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-lg text-white/70 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/40"
      >
        <IconPhoneCall size={18} stroke={1.75} aria-hidden />
      </button>

      {open ? (
        <SheetDialogShell
          titleId={titleId}
          title="Spelarnummer"
          description="Tryck på numret för att ringa. Kopiera med ikonen bredvid."
          onClose={handleCloseSheet}
          scrollBody={false}
        >
          <div
            className="flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 sm:gap-4 sm:px-4"
            aria-live="polite"
          >
            <div className="flex min-w-0 flex-1 flex-col gap-2 justify-center">
              <p className="min-w-0 text-xs font-semibold uppercase leading-none tracking-wide text-gray-600">
                {displayName}
              </p>
              <a
                href={telHref}
                className="min-w-0 select-text text-xl font-semibold leading-tight tracking-tight text-[#164a2a] underline-offset-2 hover:underline sm:text-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                {display}
              </a>
            </div>
            <button
              type="button"
              onClick={() => void handleCopy()}
              title={
                copyPhase === 'confirming'
                  ? 'Kopierat!'
                  : copyPhase === 'error'
                    ? 'Kunde inte kopiera'
                    : 'Kopiera nummer'
              }
              aria-label={
                copyPhase === 'confirming'
                  ? 'Kopierat!'
                  : copyPhase === 'error'
                    ? 'Kunde inte kopiera'
                    : 'Kopiera telefonnummer'
              }
              className={`inline-flex shrink-0 items-center justify-center rounded-xl border p-2.5 transition-colors duration-100 ease-out focus-visible:outline-2 focus-visible:outline-offset-2 min-h-[44px] min-w-[44px] sm:min-h-10 sm:min-w-10 ${
                copyPhase === 'confirming'
                  ? 'border-green-200 bg-green-50 text-green-700 focus-visible:outline-green-600'
                  : copyPhase === 'error'
                    ? 'border-red-200 bg-red-50 text-red-700 focus-visible:outline-red-600'
                    : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-100 hover:text-gray-900 focus-visible:outline-gray-900'
              }`}
            >
              {copyPhase === 'confirming' ? (
                <IconCheck aria-hidden size={22} stroke={1.75} />
              ) : copyPhase === 'error' ? (
                <IconAlertCircle aria-hidden size={22} stroke={1.75} />
              ) : (
                <IconCopy aria-hidden size={22} stroke={1.75} />
              )}
            </button>
          </div>
        </SheetDialogShell>
      ) : null}
    </>
  )
}
