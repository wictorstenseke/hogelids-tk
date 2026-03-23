import type { AppSettings } from '../services/AppSettingsService'

/**
 * Returns whether new ladder sign-ups are allowed at `now` given the optional
 * open date in app settings (start of the chosen calendar day).
 */
export function isLadderJoinOpenNow(
  settings: Pick<AppSettings, 'ladderJoinOpensAt'>,
  now: Date
): boolean {
  const { ladderJoinOpensAt } = settings
  if (ladderJoinOpensAt == null) return true
  return now.getTime() >= ladderJoinOpensAt.toMillis()
}
