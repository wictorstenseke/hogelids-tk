/** Shared yellow booking CTAs (home column, challenge dialog, mobile drawer). */
const BOOKING_PRIMARY_INTERACTIVE =
  'bg-[#F1E334] text-gray-900 shadow-sm transition-[colors,transform,box-shadow] hover:bg-[#e8dc40] hover:shadow-md active:scale-[0.99] active:bg-[#ddd03a] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-[#F1E334] disabled:hover:shadow-sm'

/** Desktop + mobile “Boka bana(n)” on `BookingForm` */
export const BOOKING_PRIMARY_BUTTON_CLASS = [
  'flex w-full min-h-[44px] cursor-pointer items-center justify-center rounded-xl px-4 py-3 text-sm font-semibold',
  BOOKING_PRIMARY_INTERACTIVE,
].join(' ')

/** Larger CTAs inside `BookingDrawer` (Nästa / Klar / Boka banan) */
export const BOOKING_DRAWER_PRIMARY_BUTTON_CLASS = [
  'mt-6 flex w-full min-h-[52px] cursor-pointer items-center justify-center rounded-xl px-4 text-base font-semibold',
  BOOKING_PRIMARY_INTERACTIVE,
].join(' ')
