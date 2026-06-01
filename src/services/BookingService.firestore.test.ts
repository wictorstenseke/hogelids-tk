import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Timestamp } from 'firebase/firestore'

const {
  mockAddDoc,
  mockCollection,
  mockDoc,
  mockGetDocs,
  mockOrderBy,
  mockQuery,
  mockRunTransaction,
  mockTransactionGet,
  mockTransactionSet,
  mockWhere,
} = vi.hoisted(() => {
  const mockTransactionGet = vi.fn()
  const mockTransactionSet = vi.fn()
  return {
    mockAddDoc: vi.fn(),
    mockCollection: vi.fn((...args: unknown[]) => args),
    mockDoc: vi.fn((...args: unknown[]) => ({
      path: args.slice(1).join('/'),
    })),
    mockGetDocs: vi.fn(),
    mockOrderBy: vi.fn((...args: unknown[]) => ({ type: 'orderBy', args })),
    mockQuery: vi.fn((...args: unknown[]) => args),
    mockRunTransaction: vi.fn(
      async (_db: unknown, fn: (tx: unknown) => unknown) =>
        fn({ get: mockTransactionGet, set: mockTransactionSet })
    ),
    mockTransactionGet,
    mockTransactionSet,
    mockWhere: vi.fn((...args: unknown[]) => ({ type: 'where', args })),
  }
})

vi.mock('../lib/firebase', () => ({ db: {} }))
vi.mock('firebase/firestore', async () => {
  const actual =
    await vi.importActual<typeof import('firebase/firestore')>(
      'firebase/firestore'
    )
  return {
    ...actual,
    addDoc: mockAddDoc,
    collection: mockCollection,
    doc: mockDoc,
    getDocs: mockGetDocs,
    orderBy: mockOrderBy,
    query: mockQuery,
    runTransaction: mockRunTransaction,
    where: mockWhere,
    Timestamp: actual.Timestamp,
  }
})

import {
  createGuestBooking,
  getBookingsOverlapping,
  getUpcomingBookings,
} from './BookingService'

function emptySnapshot() {
  return { docs: [], empty: true }
}

beforeEach(() => {
  vi.clearAllMocks()
  mockGetDocs.mockResolvedValue(emptySnapshot())
  mockAddDoc.mockResolvedValue({ id: 'booking-1' })
  mockDoc.mockImplementation((...args: unknown[]) => ({
    path: args.slice(1).join('/'),
  }))
  mockTransactionGet.mockResolvedValue({ exists: () => false })
  mockTransactionSet.mockResolvedValue(undefined)
})

describe('getUpcomingBookings', () => {
  it('queries by endTime so in-progress bookings stay visible', async () => {
    await getUpcomingBookings()

    expect(mockWhere).toHaveBeenCalledWith(
      'endTime',
      '>=',
      expect.any(Timestamp)
    )
    expect(mockWhere).toHaveBeenCalledWith(
      'endTime',
      '<',
      expect.any(Timestamp)
    )
    expect(mockOrderBy).toHaveBeenCalledWith('endTime', 'asc')
  })

  it('excludes completed ladder matches even when their booking time is still ahead', async () => {
    const now = new Date('2026-06-01T10:00:00')
    vi.useFakeTimers()
    vi.setSystemTime(now)

    mockGetDocs.mockResolvedValue({
      docs: [
        {
          id: 'regular-booking',
          data: () => ({
            type: 'member',
            ownerEmail: 'anna@example.com',
            ownerUid: 'anna',
            ownerDisplayName: 'Anna',
            startTime: Timestamp.fromDate(new Date('2026-06-02T10:00:00')),
            endTime: Timestamp.fromDate(new Date('2026-06-02T11:00:00')),
            createdAt: Timestamp.fromDate(now),
          }),
        },
        {
          id: 'planned-ladder',
          data: () => ({
            type: 'member',
            ownerEmail: 'bo@example.com',
            ownerUid: 'bo',
            ownerDisplayName: 'Bo',
            startTime: Timestamp.fromDate(new Date('2026-06-03T10:00:00')),
            endTime: Timestamp.fromDate(new Date('2026-06-03T11:00:00')),
            createdAt: Timestamp.fromDate(now),
            ladderId: 'ladder-1',
            playerAId: 'bo',
            playerBId: 'cilla',
            playerAName: 'Bo',
            playerBName: 'Cilla',
            ladderStatus: 'planned',
          }),
        },
        {
          id: 'completed-ladder',
          data: () => ({
            type: 'member',
            ownerEmail: 'dan@example.com',
            ownerUid: 'dan',
            ownerDisplayName: 'Dan',
            startTime: Timestamp.fromDate(new Date('2026-06-04T10:00:00')),
            endTime: Timestamp.fromDate(new Date('2026-06-04T11:00:00')),
            createdAt: Timestamp.fromDate(now),
            ladderId: 'ladder-1',
            playerAId: 'dan',
            playerBId: 'eva',
            playerAName: 'Dan',
            playerBName: 'Eva',
            ladderStatus: 'completed',
            winnerId: 'dan',
          }),
        },
      ],
      empty: false,
    })

    try {
      const bookings = await getUpcomingBookings()

      expect(bookings.map((booking) => booking.id)).toEqual([
        'regular-booking',
        'planned-ladder',
      ])
    } finally {
      vi.useRealTimers()
    }
  })
})

describe('getBookingsOverlapping', () => {
  it('uses slot start against endTime and filters candidates by startTime in memory', async () => {
    const start = new Date('2026-06-01T10:00:00')
    const end = new Date('2026-06-01T12:00:00')

    await getBookingsOverlapping(start, end)

    expect(mockWhere).toHaveBeenCalledWith(
      'endTime',
      '>',
      Timestamp.fromDate(start)
    )
    expect(mockWhere).toHaveBeenCalledWith(
      'endTime',
      '<',
      expect.any(Timestamp)
    )
    expect(mockOrderBy).toHaveBeenCalledWith('endTime', 'asc')
  })
})

describe('createGuestBooking', () => {
  it('creates booking inside a transaction with deterministic slot locks', async () => {
    const id = await createGuestBooking(
      'guest@example.com',
      'guest@example.com',
      new Date('2026-06-01T10:00:00'),
      new Date('2026-06-01T11:00:00')
    )

    expect(id).toMatch(/^booking-/)
    expect(mockRunTransaction).toHaveBeenCalledTimes(1)
    expect(mockTransactionGet).toHaveBeenCalled()
    expect(mockTransactionSet).toHaveBeenCalledWith(
      expect.objectContaining({ path: expect.stringMatching(/^bookings\//) }),
      expect.objectContaining({
        type: 'guest',
        slotLocks: [
          {
            date: '2026-06-01',
            slots: ['10:00', '10:15', '10:30', '10:45'],
          },
        ],
      })
    )
    expect(mockTransactionSet).toHaveBeenCalledWith(
      expect.objectContaining({ path: 'bookingSlotDays/2026-06-01' }),
      expect.objectContaining({
        slots: expect.objectContaining({
          '10:00': expect.any(String),
          '10:15': expect.any(String),
          '10:30': expect.any(String),
          '10:45': expect.any(String),
        }),
      }),
      { merge: true }
    )
  })

  it('reuses slot locks owned by a completed ladder match', async () => {
    mockTransactionGet.mockImplementation(async (ref: { path?: string }) => {
      if (ref.path === 'bookingSlotDays/2026-06-01') {
        return {
          exists: () => true,
          data: () => ({
            slots: {
              '10:00': 'completed-ladder',
              '10:15': 'completed-ladder',
              '10:30': 'completed-ladder',
              '10:45': 'completed-ladder',
            },
          }),
        }
      }
      if (ref.path === 'bookings/completed-ladder') {
        return {
          exists: () => true,
          data: () => ({
            ladderId: 'ladder-1',
            ladderStatus: 'completed',
          }),
        }
      }
      return { exists: () => false }
    })

    await expect(
      createGuestBooking(
        'guest@example.com',
        'guest@example.com',
        new Date('2026-06-01T10:00:00'),
        new Date('2026-06-01T11:00:00')
      )
    ).resolves.toMatch(/^booking-/)
  })
})
