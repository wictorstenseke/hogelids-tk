import { MAX_CHALLENGE_DISTANCE } from '../../lib/ladder'
import { SheetDialogShell } from './SheetDialogShell'

const TITLE_ID = 'ladder-rules-dialog-title'

interface LadderRulesSheetDialogProps {
  onClose: () => void
}

export function LadderRulesSheetDialog({
  onClose,
}: LadderRulesSheetDialogProps) {
  return (
    <SheetDialogShell titleId={TITLE_ID} title="Regler" onClose={onClose}>
      <div className="space-y-4 pb-1 text-sm text-gray-700">
        <p className="leading-snug">
          Stegen är en rankinglista: du klättrar genom att vinna mot spelare som
          ligger före dig i listan.
        </p>
        <ul className="list-disc space-y-3 pl-5 marker:text-gray-300">
          <li>
            <span className="font-semibold text-gray-900">
              Vem du får utmana:
            </span>{' '}
            Du får bara utmana spelare som ligger högre i listan än du.
            Motståndaren får högst ligga {MAX_CHALLENGE_DISTANCE} platser
            ovanför dig.
          </li>
          <li>
            <span className="font-semibold text-gray-900">Boka match:</span>{' '}
            Tryck på en spelares rad i tabellen när raden är klickbar; då öppnas
            bokning av stegmatch.
          </li>
          <li>
            <span className="font-semibold text-gray-900">
              Resultat och placering:
            </span>{' '}
            Rapportera under fliken{' '}
            <strong className="font-semibold text-gray-900">Kommande</strong>.
            Vinst och förlust sparas alltid. Ni byter plats bara om vinnaren
            stod under förloraren och högst {MAX_CHALLENGE_DISTANCE} platser
            ifrån — då byter ni plats med varandra.
          </li>
        </ul>
      </div>
    </SheetDialogShell>
  )
}
