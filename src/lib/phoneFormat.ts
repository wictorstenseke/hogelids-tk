/**
 * Swedish phone display aligned with `data/contact.ts` (e.g. `076 - 899 54 35`).
 * Storage uses the same string so UI stays consistent; tel/copy use digits / +46.
 */

/** Digits only, Swedish local form (leading 0). Handles +46 / 0046 / 46 prefixes. */
export function normalizeSwedishPhoneDigits(input: string): string {
  let s = input.trim().replace(/\s/g, '').replace(/-/g, '')
  if (s.startsWith('+46')) {
    s = '0' + s.slice(3)
  } else if (s.startsWith('0046')) {
    s = '0' + s.slice(4)
  } else if (s.startsWith('46') && s.length >= 11) {
    s = '0' + s.slice(2)
  }
  return s.replace(/\D/g, '')
}

/** `0XX - XXX XX XX` when 10 digits starting with 0. */
export function formatSwedishPhoneDisplay(digits: string): string | null {
  const d = normalizeSwedishPhoneDigits(digits)
  if (d.length === 10 && d.startsWith('0')) {
    return `${d.slice(0, 3)} - ${d.slice(3, 6)} ${d.slice(6, 8)} ${d.slice(8, 10)}`
  }
  return null
}

/**
 * Value to persist on profile / pass to APIs: formatted Swedish mobile when valid,
 * otherwise digits-only fallback, or null if empty.
 */
export function formatPhoneForStorage(input: string): string | null {
  const raw = input.trim()
  if (!raw) return null
  const d = normalizeSwedishPhoneDigits(raw)
  if (d.length === 0) return null
  const display = formatSwedishPhoneDisplay(d)
  if (display) return display
  return d
}

/** Normalize stored or legacy values for inputs and labels. */
export function formatPhoneForDisplay(
  input: string | null | undefined
): string {
  if (input == null || !String(input).trim()) return ''
  const display = formatSwedishPhoneDisplay(String(input))
  if (display) return display
  return String(input).trim()
}

/** `tel:` href — prefers +46 for Swedish 10-digit numbers (same as contact.ts). */
export function swedishPhoneToTelHref(phone: string): string {
  const d = normalizeSwedishPhoneDigits(phone)
  if (d.length === 10 && d.startsWith('0')) {
    return `tel:+46${d.slice(1)}`
  }
  if (d.length > 0) return `tel:${d}`
  return ''
}

/** Plain digits for copy (no spaces), Swedish local 0… form when applicable. */
export function swedishPhoneToCopyPlain(phone: string): string {
  return normalizeSwedishPhoneDigits(phone)
}
