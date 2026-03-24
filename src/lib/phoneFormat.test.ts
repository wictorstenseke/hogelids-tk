import { describe, expect, it } from 'vitest'
import {
  formatPhoneForDisplay,
  formatPhoneForStorage,
  formatSwedishPhoneDisplay,
  normalizeSwedishPhoneDigits,
  swedishPhoneToCopyPlain,
  swedishPhoneToTelHref,
} from './phoneFormat'

describe('phoneFormat', () => {
  it('normalizes +46 to leading 0', () => {
    expect(normalizeSwedishPhoneDigits('+46768995435')).toBe('0768995435')
    expect(normalizeSwedishPhoneDigits('46768995435')).toBe('0768995435')
  })

  it('formats 10-digit Swedish numbers like contact.ts', () => {
    expect(formatSwedishPhoneDisplay('0768995435')).toBe('076 - 899 54 35')
    expect(formatSwedishPhoneDisplay('0736463715')).toBe('073 - 646 37 15')
  })

  it('formatPhoneForStorage returns display string or digits fallback', () => {
    expect(formatPhoneForStorage('0768995435')).toBe('076 - 899 54 35')
    expect(formatPhoneForStorage('076 - 899 54 35')).toBe('076 - 899 54 35')
    expect(formatPhoneForStorage('')).toBeNull()
    expect(formatPhoneForStorage('   ')).toBeNull()
  })

  it('formatPhoneForDisplay upgrades legacy raw digits', () => {
    expect(formatPhoneForDisplay('0768995435')).toBe('076 - 899 54 35')
    expect(formatPhoneForDisplay('076 - 899 54 35')).toBe('076 - 899 54 35')
    expect(formatPhoneForDisplay(null)).toBe('')
  })

  it('tel href uses +46 for Swedish mobile', () => {
    expect(swedishPhoneToTelHref('076 - 899 54 35')).toBe('tel:+46768995435')
  })

  it('copy plain strips to local digits', () => {
    expect(swedishPhoneToCopyPlain('076 - 899 54 35')).toBe('0768995435')
  })
})
