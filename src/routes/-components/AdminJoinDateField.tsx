import { useEffect, useId, useState } from 'react'
import DatePicker, { registerLocale } from 'react-datepicker'
import { sv } from 'date-fns/locale'
import { format } from 'date-fns'
import { IconChevronLeft, IconChevronRight } from '@tabler/icons-react'
import { DateDisplayInput } from './BookingForm'
import { useIsDesktop } from '../../lib/useIsDesktop'
import { SheetDialogShell } from './SheetDialogShell'
import 'react-datepicker/dist/react-datepicker.css'

registerLocale('sv', sv)

function displayDateLabel(value: string): string {
  if (!value) return ''
  const d = new Date(`${value}T12:00:00`)
  const str = d.toLocaleDateString('sv-SE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
  return str.charAt(0).toUpperCase() + str.slice(1)
}

interface AdminJoinDateFieldProps {
  value: string
  onSelect: (yyyyMmDd: string) => void
  disabled?: boolean
  saving?: boolean
  /** Match `BookingForm` / home green cards (`#194b29`) vs white admin rows */
  appearance?: 'green' | 'light'
  /** yyyy-MM-dd lower bound; if set, dates before this are non-selectable. */
  minDate?: string
  /** Title shown in the mobile sheet dialog. Defaults to "Anmälningsstart". */
  sheetTitle?: string
}

export function AdminJoinDateField({
  value,
  onSelect,
  disabled = false,
  saving = false,
  appearance = 'light',
  minDate,
  sheetTitle,
}: AdminJoinDateFieldProps) {
  const isGreen = appearance === 'green'
  const isDesktop = useIsDesktop()
  const sheetTitleId = useId()
  const desktopInputId = useId()
  const [sheetOpen, setSheetOpen] = useState(false)
  /** Mobile sheet: draft until user taps Spara (does not save on day tap). */
  const [mobileSheetDraft, setMobileSheetDraft] = useState<Date | null>(null)

  useEffect(() => {
    if (!isDesktop) return
    const id = requestAnimationFrame(() => setSheetOpen(false))
    return () => cancelAnimationFrame(id)
  }, [isDesktop])

  const selectedDate = value ? new Date(`${value}T12:00:00`) : null
  const minDateValue = minDate ? new Date(`${minDate}T12:00:00`) : undefined

  function handleDesktopDateChange(date: Date | null) {
    if (!date) return
    onSelect(format(date, 'yyyy-MM-dd'))
  }

  function handleMobileSave() {
    if (!mobileSheetDraft) return
    onSelect(format(mobileSheetDraft, 'yyyy-MM-dd'))
    setSheetOpen(false)
  }

  const renderCustomHeader = ({
    date,
    decreaseMonth,
    increaseMonth,
  }: {
    date: Date
    decreaseMonth: () => void
    increaseMonth: () => void
  }) => (
    <div className="flex items-center justify-between px-3 pb-2">
      <button
        type="button"
        onClick={decreaseMonth}
        className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900"
      >
        <IconChevronLeft size={18} stroke={2} />
      </button>
      <span className="font-display text-base font-bold uppercase tracking-wide text-gray-900">
        {date.toLocaleDateString('sv-SE', {
          month: 'long',
          year: 'numeric',
        })}
      </span>
      <button
        type="button"
        onClick={increaseMonth}
        className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900"
      >
        <IconChevronRight size={18} stroke={2} />
      </button>
    </div>
  )

  const mobileTriggerClass = isGreen
    ? 'w-full min-h-[44px] cursor-pointer rounded-lg border border-white/20 bg-white/10 px-3 py-2.5 text-left text-sm text-white transition-colors hover:border-white/40 focus:outline-none focus:ring-2 focus:ring-[#F1E334]/30 disabled:cursor-not-allowed disabled:opacity-40'
    : 'w-full min-h-[44px] cursor-pointer rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-left text-sm text-gray-900 transition-colors hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#F1E334]/40 disabled:cursor-not-allowed disabled:opacity-40'

  return (
    <div className="flex min-w-0 flex-1 items-center gap-2">
      {isDesktop ? (
        <div className="min-w-0 flex-1">
          <DatePicker
            id={desktopInputId}
            selected={selectedDate}
            onChange={(date: Date | null) => handleDesktopDateChange(date)}
            locale="sv"
            dateFormat="EEEE d MMMM"
            placeholderText="Välj datum"
            autoComplete="off"
            disabled={disabled}
            minDate={minDateValue}
            customInput={
              <DateDisplayInput appearance={isGreen ? 'green' : 'light'} />
            }
            renderCustomHeader={renderCustomHeader}
          />
        </div>
      ) : (
        <>
          <button
            type="button"
            disabled={disabled}
            onClick={() => {
              setMobileSheetDraft(selectedDate)
              setSheetOpen(true)
            }}
            className={mobileTriggerClass}
            aria-haspopup="dialog"
            aria-expanded={sheetOpen}
          >
            {value ? (
              <span className={isGreen ? 'text-white' : 'text-gray-900'}>
                {displayDateLabel(value)}
              </span>
            ) : (
              <span className={isGreen ? 'text-white/40' : 'text-gray-400'}>
                Välj datum
              </span>
            )}
          </button>
          {sheetOpen && (
            <SheetDialogShell
              titleId={sheetTitleId}
              title={sheetTitle ?? 'Anmälningsstart'}
              onClose={() => setSheetOpen(false)}
              maxHeightVariant="tall"
              dialogMaxWidth="md"
              footer={
                <button
                  type="button"
                  disabled={disabled || saving || !mobileSheetDraft}
                  onClick={handleMobileSave}
                  className="flex min-h-[44px] w-full items-center justify-center rounded-xl bg-[#F1E334] px-4 py-3 text-sm font-semibold text-gray-900 transition-opacity disabled:opacity-50"
                >
                  {saving ? 'Sparar…' : 'Spara'}
                </button>
              }
            >
              <div className="w-full min-w-0 pb-2 [&_.react-datepicker]:w-full [&_.react-datepicker]:border-0 [&_.react-datepicker]:shadow-none">
                <DatePicker
                  inline
                  selected={mobileSheetDraft}
                  onChange={(date: Date | null) => {
                    if (date) setMobileSheetDraft(date)
                  }}
                  locale="sv"
                  disabled={disabled}
                  minDate={minDateValue}
                  renderCustomHeader={renderCustomHeader}
                />
              </div>
            </SheetDialogShell>
          )}
        </>
      )}
      {saving && (
        <span
          className={
            isGreen
              ? 'h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-white/30 border-t-white'
              : 'h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-gray-300 border-t-gray-700'
          }
          aria-hidden
        />
      )}
    </div>
  )
}
