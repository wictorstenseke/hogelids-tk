import { AdminJoinDateField } from './AdminJoinDateField'

interface AdminTournamentStartDateFieldProps {
  value: string
  onSelect: (yyyyMmDd: string) => void
  disabled?: boolean
  saving?: boolean
  appearance?: 'green' | 'light'
  /** yyyy-MM-dd lower bound mirroring the join-open date. */
  minDate?: string
  /** Inline error rendered below the field; null/undefined when valid. */
  errorMessage?: string | null
}

/**
 * Tournament-start date input for the admin ladder card. Wraps
 * AdminJoinDateField, forwards a min-date constraint, swaps the
 * mobile sheet title, and renders an inline Swedish error.
 */
export function AdminTournamentStartDateField({
  value,
  onSelect,
  disabled,
  saving,
  appearance,
  minDate,
  errorMessage,
}: AdminTournamentStartDateFieldProps) {
  return (
    <div className="flex w-full flex-col gap-1">
      <AdminJoinDateField
        value={value}
        onSelect={onSelect}
        disabled={disabled}
        saving={saving}
        appearance={appearance}
        minDate={minDate}
        sheetTitle="Stegen startar"
      />
      {errorMessage ? (
        <p
          className={`text-xs ${
            appearance === 'green' ? 'text-red-300' : 'text-red-600'
          }`}
        >
          {errorMessage}
        </p>
      ) : null}
    </div>
  )
}
