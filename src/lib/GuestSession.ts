const KEY_EMAIL = 'htk_guest_email'
const KEY_NAME = 'htk_guest_name'
const KEY_BOOKING_COUNT = 'htk_booking_count'

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

export function shouldShowNudge(): boolean {
  const count = getBookingCount()
  return count > 0 && count % 2 === 0
}
