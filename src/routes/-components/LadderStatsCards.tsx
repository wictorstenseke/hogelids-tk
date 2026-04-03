import type { LadderParticipant } from '../../services/LadderService'
import { getStatsLeaders } from '../../lib/ladder'

export function LadderStatsCards({
  participants,
}: {
  participants: LadderParticipant[]
}) {
  const leaders = getStatsLeaders(participants)
  if (!leaders) return null

  return (
    <section className="grid grid-cols-3 gap-2">
      {leaders.map((leader) => (
        <div
          key={leader.label}
          className="rounded-2xl bg-[#194b29] px-3 py-3 text-center"
        >
          <p className="text-[10px] font-semibold uppercase tracking-wider text-white/60">
            {leader.label}
          </p>
          <p className="mt-1 truncate text-sm font-bold text-white">
            {leader.playerName}
          </p>
          <p className="mt-0.5 text-xs text-[#F1E334]">
            {leader.value} {leader.valueSuffix}
          </p>
        </div>
      ))}
    </section>
  )
}
