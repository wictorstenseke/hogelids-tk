import {
  ABOUT_CLUB_HISTORY_PARAGRAPHS,
  ABOUT_CLUB_RULES_ITEMS,
} from '../../data/aboutClub'
import { SheetDialogShell } from './SheetDialogShell'

const TITLE_ID = 'about-club-dialog-title'

/** In-sheet section titles (under dialog h2) */
const sectionHeadingClass = 'mb-2 text-sm font-semibold text-gray-900'

interface AboutClubSheetDialogProps {
  onClose: () => void
}

export function AboutClubSheetDialog({ onClose }: AboutClubSheetDialogProps) {
  return (
    <SheetDialogShell
      titleId={TITLE_ID}
      title="Om klubben"
      onClose={onClose}
      maxHeightVariant="tall"
    >
      <div className="space-y-6 pb-1 text-sm text-gray-700">
        <section>
          <h3 className={sectionHeadingClass}>Förhållningsregler</h3>
          <ul className="list-disc space-y-2 pl-5 marker:text-gray-400">
            {ABOUT_CLUB_RULES_ITEMS.map((line) => (
              <li key={line} className="leading-snug">
                {line}
              </li>
            ))}
          </ul>
        </section>

        <section className="border-t border-gray-100 pt-6">
          <h3 className={sectionHeadingClass}>Om Högelids Tennisklubb</h3>
          <div className="space-y-3 leading-snug">
            {ABOUT_CLUB_HISTORY_PARAGRAPHS.map((p) => (
              <p key={p}>{p}</p>
            ))}
          </div>
        </section>
      </div>
    </SheetDialogShell>
  )
}
