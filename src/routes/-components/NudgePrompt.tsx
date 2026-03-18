interface NudgePromptProps {
  onDismiss: () => void
}

const MEMBER_ADVANTAGES = [
  'Avboka från vilken enhet som helst',
  'Se vem som har bokat varje tid',
  'Ditt namn visas på dina bokningar',
  'Tillgång till klubbens turneringar',
]

export function NudgePrompt({ onDismiss }: NudgePromptProps) {
  return (
    <div className="mt-6 rounded-xl border border-gray-200 bg-gray-50 px-4 py-4">
      <p className="mb-3 text-sm font-semibold text-gray-800">
        Bli medlem för att få fler fördelar:
      </p>
      <ul className="mb-4 space-y-1">
        {MEMBER_ADVANTAGES.map((advantage) => (
          <li
            key={advantage}
            className="flex items-start gap-2 text-sm text-gray-700"
          >
            <span className="mt-0.5 shrink-0 text-xs text-gray-400">•</span>
            {advantage}
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={onDismiss}
        className="text-sm text-gray-500 underline underline-offset-2 hover:text-gray-700"
      >
        Nej tack
      </button>
    </div>
  )
}
