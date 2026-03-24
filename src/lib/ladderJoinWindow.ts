import type { Ladder } from '../services/LadderService'

/**
 * Returns whether new ladder sign-ups are allowed at `now` given the optional
 * open date on the ladder document (start of the chosen calendar day).
 */
export function isLadderJoinOpenNow(
  ladder: Pick<Ladder, 'joinOpensAt'>,
  now: Date
): boolean {
  const { joinOpensAt } = ladder
  if (joinOpensAt == null) return true
  return now.getTime() >= joinOpensAt.toMillis()
}
