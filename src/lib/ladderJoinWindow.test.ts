import { Timestamp } from 'firebase/firestore'
import { describe, expect, it } from 'vitest'
import { isLadderJoinOpenNow } from './ladderJoinWindow'

describe('isLadderJoinOpenNow', () => {
  it('returns true when ladderJoinOpensAt is null', () => {
    expect(
      isLadderJoinOpenNow(
        { ladderJoinOpensAt: null },
        new Date('2025-06-15T12:00:00')
      )
    ).toBe(true)
  })

  it('returns false when now is before ladderJoinOpensAt', () => {
    const opens = Timestamp.fromDate(new Date('2025-06-20T00:00:00'))
    expect(
      isLadderJoinOpenNow(
        { ladderJoinOpensAt: opens },
        new Date('2025-06-15T12:00:00')
      )
    ).toBe(false)
  })

  it('returns true when now is at or after ladderJoinOpensAt', () => {
    const opens = Timestamp.fromDate(new Date('2025-06-20T00:00:00'))
    expect(
      isLadderJoinOpenNow(
        { ladderJoinOpensAt: opens },
        new Date('2025-06-20T00:00:00')
      )
    ).toBe(true)
    expect(
      isLadderJoinOpenNow(
        { ladderJoinOpensAt: opens },
        new Date('2025-07-01T00:00:00')
      )
    ).toBe(true)
  })
})
