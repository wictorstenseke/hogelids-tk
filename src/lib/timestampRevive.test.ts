import { describe, it, expect } from 'vitest'
import { Timestamp } from 'firebase/firestore'
import { reviveTimestamps } from './timestampRevive'

describe('reviveTimestamps', () => {
  it('revives a {seconds, nanoseconds} object into a Timestamp', () => {
    const input = { seconds: 1700000000, nanoseconds: 500000000 }
    const result = reviveTimestamps('endTime', input)
    expect(result).toBeInstanceOf(Timestamp)
    expect((result as Timestamp).seconds).toBe(1700000000)
    expect((result as Timestamp).nanoseconds).toBe(500000000)
  })

  it('passes non-timestamp values through unchanged', () => {
    expect(reviveTimestamps('id', 'abc123')).toBe('abc123')
    expect(reviveTimestamps('count', 5)).toBe(5)
    expect(reviveTimestamps('flag', null)).toBe(null)
    expect(reviveTimestamps('obj', { foo: 'bar' })).toEqual({ foo: 'bar' })
  })

  it('round-trips a Timestamp through JSON.stringify + JSON.parse', () => {
    const original = Timestamp.fromMillis(1700000000_000)
    const json = JSON.stringify({ ts: original })
    const parsed = JSON.parse(json, reviveTimestamps) as { ts: Timestamp }
    expect(parsed.ts).toBeInstanceOf(Timestamp)
    expect(parsed.ts.toMillis()).toBe(original.toMillis())
  })
})
