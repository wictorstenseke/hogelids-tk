import type { Ladder } from '../services/LadderService'
import type { AppSettings } from '../services/AppSettingsService'

/**
 * Returns whether ladder challenge bookings are currently allowed.
 * Composes the global bookingEnabled toggle with the per-ladder
 * tournamentStartsAt gate. tournamentStartsAt = null means no date gate.
 */
export function isLadderChallengeOpenNow(
  ladder: Pick<Ladder, 'tournamentStartsAt'>,
  settings: Pick<AppSettings, 'bookingEnabled'>,
  now: Date
): boolean {
  if (!settings.bookingEnabled) return false
  const { tournamentStartsAt } = ladder
  if (tournamentStartsAt == null) return true
  return now.getTime() >= tournamentStartsAt.toMillis()
}
