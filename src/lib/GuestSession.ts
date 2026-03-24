const KEY_EMAIL = 'htk_guest_email'
const KEY_NAME = 'htk_guest_name'
const KEY_BOOKING_COUNT = 'htk_booking_count'
const KEY_JOIN_WELCOME_BANNER_DISMISSED_LADDER =
  'htk_join_welcome_banner_dismissed_ladder_id'

export function getEmail(): string | null {
  return localStorage.getItem(KEY_EMAIL)
}

export function setEmail(email: string): void {
  localStorage.setItem(KEY_EMAIL, email)
}

export function getName(): string | null {
  return localStorage.getItem(KEY_NAME)
}

export function setName(name: string): void {
  localStorage.setItem(KEY_NAME, name)
}

export function getBookingCount(): number {
  const raw = localStorage.getItem(KEY_BOOKING_COUNT)
  if (raw === null) return 0
  const parsed = parseInt(raw, 10)
  return isNaN(parsed) ? 0 : parsed
}

export function incrementBookingCount(): void {
  const next = getBookingCount() + 1
  localStorage.setItem(KEY_BOOKING_COUNT, String(next))
}

/** Ladder id for which the Stegen “Välkommen” join banner was dismissed (per device). */
export function getJoinWelcomeBannerDismissedLadderId(): string | null {
  return localStorage.getItem(KEY_JOIN_WELCOME_BANNER_DISMISSED_LADDER)
}

export function dismissJoinWelcomeBannerForLadder(ladderId: string): void {
  localStorage.setItem(KEY_JOIN_WELCOME_BANNER_DISMISSED_LADDER, ladderId)
}
