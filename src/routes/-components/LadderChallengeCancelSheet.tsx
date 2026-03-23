import { ConfirmSheetDialog } from './ConfirmSheetDialog'

/** Shared copy + sheet for avbryta stege-bokning + utmaning (Home + Stegen). */
export const LADDER_CHALLENGE_CANCEL_TITLE_ID =
  'cancel-ladder-challenge-sheet-title'

export function LadderChallengeCancelSheet({
  open,
  onCancel,
  onConfirm,
}: {
  open: boolean
  onCancel: () => void
  onConfirm: () => void
}) {
  if (!open) return null

  return (
    <ConfirmSheetDialog
      titleId={LADDER_CHALLENGE_CANCEL_TITLE_ID}
      title="Ta bort stegmatchen?"
      description={
        <div className="space-y-3">
          <p>
            Du håller på att ta bort en match i stegen. Det innebär att följande
            raderas permanent:
          </p>
          <ul className="list-disc space-y-1 pl-5 marker:text-gray-600">
            <li>Utmaningen i stegen</li>
            <li>Bokning av banan</li>
          </ul>
          <p>Vill du fortsätta?</p>
        </div>
      }
      cancelLabel="Tillbaka"
      confirmLabel="Ta bort utmaning"
      confirmDanger
      onCancel={onCancel}
      onConfirm={onConfirm}
    />
  )
}
