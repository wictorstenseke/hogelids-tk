import { addDays } from 'date-fns'

/** Start must be at or after 22:00 (same calendar day) for overnight. */
export const OVERNIGHT_START_MIN_MINUTES = 22 * 60

/** End clock must be strictly before 06:00 to count as “next morning”. */
export const OVERNIGHT_END_MAX_MINUTES = 6 * 60

function timeStringToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number)
  if (!Number.isFinite(h) || !Number.isFinite(m)) return NaN
  return h * 60 + m
}

/**
 * Builds wall-clock booking `start` / `end` from one selected calendar day + HH:mm times.
 *
 * Same-day bookings: when parsed on `dateYmd`, `end` must be after `start`.
 *
 * Overnight: only when start is 22:00+ and end is before 06:00 (next calendar morning);
 * then `end` is moved forward one day.
 */
export function resolveBookingInterval(
  dateYmd: string,
  startHHmm: string,
  endHHmm: string
): { start: Date; end: Date } | null {
  const start = new Date(`${dateYmd}T${startHHmm}`)
  let end = new Date(`${dateYmd}T${endHHmm}`)
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return null

  if (end > start) {
    return { start, end }
  }

  const startM = timeStringToMinutes(startHHmm)
  const endM = timeStringToMinutes(endHHmm)
  if (isNaN(startM) || isNaN(endM)) return null

  const qualifiesOvernight =
    startM >= OVERNIGHT_START_MIN_MINUTES && endM < OVERNIGHT_END_MAX_MINUTES

  if (!qualifiesOvernight) return null

  end = addDays(end, 1)
  if (end > start) return { start, end }
  return null
}
