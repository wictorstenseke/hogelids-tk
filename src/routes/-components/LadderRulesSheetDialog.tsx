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
              Poolen för nya spelare:
            </span>{' '}
            När du går med hamnar du i poolen tills du spelat din första match.
            Från poolen får du utmana vem som helst — andra i poolen eller
            spelare i tabellen, oavsett position.
          </li>
          <li>
            <span className="font-semibold text-gray-900">
              Vem du får utmana från tabellen:
            </span>{' '}
            När du är i tabellen får du bara utmana spelare som ligger högre i
            listan än du. Motståndaren får högst ligga {MAX_CHALLENGE_DISTANCE}{' '}
            platser ovanför dig. Spelare i tabellen kan inte utmana spelare i
            poolen.
          </li>
          <li>
            <span className="font-semibold text-gray-900">Boka match:</span>{' '}
            Tryck på en spelares rad i tabellen eller poolen när raden är
            klickbar; då öppnas bokning av stegmatch.
          </li>
          <li>
            <span className="font-semibold text-gray-900">
              Resultat och placering i tabellen:
            </span>{' '}
            Rapportera under fliken{' '}
            <strong className="font-semibold text-gray-900">Kommande</strong>.
            Vinst och förlust sparas alltid. Ni byter plats bara om vinnaren
            stod under förloraren och högst {MAX_CHALLENGE_DISTANCE} platser
            ifrån.
          </li>
          <li>
            <span className="font-semibold text-gray-900">
              Första matchen ut ur poolen:
            </span>{' '}
            Om en poolspelare vinner mot någon i tabellen tar de motståndarens
            plats; alla nedanför skuffas ner ett steg. Vid förlust hamnar
            poolspelaren sist. Om två poolspelare möts hamnar vinnaren direkt
            ovanför alla utan vinst, och förloraren placeras sist.
          </li>
        </ul>
      </div>
    </SheetDialogShell>
  )
}
