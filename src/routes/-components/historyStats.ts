import type { BookingWithId } from '../../services/BookingService'

export interface Stats {
  totalBookings: number
  byYearByMonth: Record<number, Record<number, number>>
}

export function computeStats(
  bookings: BookingWithId[],
  selectedYears: number[]
): Stats {
  if (selectedYears.length === 0) {
    return { totalBookings: 0, byYearByMonth: {} }
  }

  const selectedYearsSet = new Set(selectedYears)
  const byYearByMonth: Record<number, Record<number, number>> = {}
  let totalBookings = 0

  for (const booking of bookings) {
    const date = booking.startTime.toDate()
    const year = date.getFullYear()
    if (!selectedYearsSet.has(year)) continue

    const month = date.getMonth() // 0-11

    if (!byYearByMonth[year]) {
      byYearByMonth[year] = {}
    }
    byYearByMonth[year][month] = (byYearByMonth[year][month] ?? 0) + 1
    totalBookings++
  }

  return { totalBookings, byYearByMonth }
}
