import { CONTACT_ENTRIES, CONTACT_INTRO } from '../../data/contact'
import { SheetDialogShell } from './SheetDialogShell'

const TITLE_ID = 'contact-dialog-title'

interface ContactSheetDialogProps {
  onClose: () => void
}

export function ContactSheetDialog({ onClose }: ContactSheetDialogProps) {
  return (
    <SheetDialogShell titleId={TITLE_ID} title="Kontakt" onClose={onClose}>
      <div className="space-y-5 pb-1 text-sm text-gray-700">
        <p className="leading-snug">{CONTACT_INTRO}</p>
        <ul className="space-y-4">
          {CONTACT_ENTRIES.map((entry) => (
            <li key={entry.role}>
              <h3 className="mb-1 text-sm font-semibold text-gray-900">
                {entry.role}:
              </h3>
              <p>
                {entry.name}:{' '}
                <a
                  href={entry.telHref}
                  className="text-gray-900 underline-offset-2 transition-colors hover:underline"
                >
                  {entry.phoneDisplay}
                </a>
              </p>
            </li>
          ))}
        </ul>
      </div>
    </SheetDialogShell>
  )
}
