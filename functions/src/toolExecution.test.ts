import { describe, expect, it } from 'vitest'
import { executeReadTool } from './toolExecution'

function timestamp(date: string) {
  return { toDate: () => new Date(date) }
}

function doc(id: string, data: Record<string, unknown>) {
  return { id, data: () => data }
}

function dbWithBookings(docs: Array<{ id: string; data: () => unknown }>) {
  const query = {
    where: () => query,
    orderBy: () => query,
    get: async () => ({ docs }),
  }

  return {
    collection: () => query,
  }
}

describe('executeReadTool booking lists', () => {
  it('excludes completed ladder matches from my upcoming bookings', async () => {
    const db = dbWithBookings([
      doc('planned-ladder', {
        type: 'member',
        ownerUid: 'uid-a',
        startTime: timestamp('2026-06-03T10:00:00Z'),
        endTime: timestamp('2026-06-03T11:00:00Z'),
        ladderId: 'ladder-1',
        playerAId: 'uid-a',
        playerBId: 'uid-b',
        playerAName: 'Anna',
        playerBName: 'Bo',
        ladderStatus: 'planned',
      }),
      doc('completed-ladder', {
        type: 'member',
        ownerUid: 'uid-a',
        startTime: timestamp('2026-06-04T10:00:00Z'),
        endTime: timestamp('2026-06-04T11:00:00Z'),
        ladderId: 'ladder-1',
        playerAId: 'uid-a',
        playerBId: 'uid-c',
        playerAName: 'Anna',
        playerBName: 'Cilla',
        ladderStatus: 'completed',
      }),
    ])

    const result = await executeReadTool(
      db as never,
      'uid-a',
      'list_my_bookings',
      {}
    )

    expect(result.success).toBe(true)
    expect(
      (
        result.data as {
          bookings: Array<{ id: string }>
        }
      ).bookings.map((booking) => booking.id)
    ).toEqual(['planned-ladder'])
  })
})
