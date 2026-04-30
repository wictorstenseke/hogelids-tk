import {
  describe,
  it,
  expect,
  vi,
  beforeEach,
  afterEach,
  type Mock,
} from 'vitest'
import { Timestamp } from 'firebase/firestore'
import {
  loadHistoryArchive,
  getArchivedBookingsByYear,
  HISTORY_ARCHIVE_QUERY_KEY,
  HISTORY_ARCHIVE_PATH,
} from './HistoryArchiveService'
import { buildArchive, archivedToBooking } from '../lib/historyArchive'
import type { BookingWithId } from './BookingService'

function mkBooking(id: string, year: number): BookingWithId {
  const end = new Date(year, 5, 1, 10, 0, 0)
  return {
    id,
    type: 'member',
    ownerEmail: 'a@b.c',
    ownerUid: null,
    ownerDisplayName: 'A',
    startTime: Timestamp.fromDate(end),
    endTime: Timestamp.fromDate(end),
    createdAt: Timestamp.fromDate(end),
  }
}

describe('loadHistoryArchive', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('fetches the archive, parses JSON, and revives Timestamps', async () => {
    const archive = buildArchive([mkBooking('x', 2024)], 2026)
    ;(fetch as unknown as Mock).mockResolvedValueOnce(
      new Response(JSON.stringify(archive), { status: 200 })
    )
    const loaded = await loadHistoryArchive()
    expect(fetch).toHaveBeenCalledWith(HISTORY_ARCHIVE_PATH, expect.anything())
    expect(loaded.bookings).toHaveLength(1)
    expect(loaded.bookings[0].endTime).toBeInstanceOf(Timestamp)
    expect(loaded.bookings[0].endTime.toDate().getFullYear()).toBe(2024)
  })

  it('throws when the archive request fails', async () => {
    ;(fetch as unknown as Mock).mockResolvedValueOnce(
      new Response('Not Found', { status: 404 })
    )
    await expect(loadHistoryArchive()).rejects.toThrow(/history archive/i)
  })

  it('exposes a stable query key', () => {
    expect(HISTORY_ARCHIVE_QUERY_KEY).toEqual(['history-archive'])
  })
})

describe('getArchivedBookingsByYear', () => {
  it('returns only bookings whose endTime year matches', async () => {
    const archive = buildArchive(
      [mkBooking('a', 2023), mkBooking('b', 2024), mkBooking('c', 2024)],
      2026
    )
    const loaded = {
      ...archive,
      bookings: archive.bookings.map(archivedToBooking),
      completedLadders: [],
    }
    const got2024 = getArchivedBookingsByYear(loaded, 2024)
    expect(got2024.map((b) => b.id).sort()).toEqual(['b', 'c'])
    expect(got2024[0].endTime).toBeInstanceOf(Timestamp)
  })

  it('returns empty array for years outside the archive', () => {
    const archive = buildArchive([mkBooking('a', 2023)], 2026)
    const loaded = {
      ...archive,
      bookings: archive.bookings.map(archivedToBooking),
      completedLadders: [],
    }
    expect(getArchivedBookingsByYear(loaded, 2026)).toEqual([])
    expect(getArchivedBookingsByYear(loaded, 1999)).toEqual([])
  })
})
