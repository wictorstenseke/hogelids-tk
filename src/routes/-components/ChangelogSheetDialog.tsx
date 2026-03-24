import { CHANGELOG } from '../../data/changelog'
import { SheetDialogShell } from './SheetDialogShell'

const TITLE_ID = 'changelog-dialog-title'

interface ChangelogSheetDialogProps {
  onClose: () => void
}

export function ChangelogSheetDialog({ onClose }: ChangelogSheetDialogProps) {
  return (
    <SheetDialogShell
      titleId={TITLE_ID}
      title="Senaste uppdateringar"
      onClose={onClose}
    >
      <ul className="space-y-3 pb-1 text-sm">
        {CHANGELOG.map((entry, index) => (
          <li
            key={`${entry.date}-${index}`}
            className="flex gap-3 border-b border-gray-100 pb-3 last:border-b-0 last:pb-0"
          >
            <span className="w-32 shrink-0 tabular-nums text-gray-400">
              {entry.date}
            </span>
            <span className="whitespace-pre-line leading-snug text-gray-700">
              {entry.description}
            </span>
          </li>
        ))}
      </ul>
    </SheetDialogShell>
  )
}
