# Date & Time Picker Improvements Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the native `datetime-local` inputs with a polished desktop experience (react-datepicker calendar + custom scrollable time list) while keeping native inputs on mobile wrapped in a step-through bottom drawer.

**Architecture:** Feature-detect desktop vs mobile via a `useIsDesktop` media-query hook (≥768px). Desktop renders `DatePicker` from react-datepicker + a custom `TimeSelect` dropdown. Mobile renders a `BookingDrawer` bottom sheet that steps through date → start time → end time using native inputs. `BookingForm` owns all state and delegates rendering to the right components.

**Tech Stack:** React 19, react-datepicker v8, date-fns v4, Tailwind CSS v4, Tabler icons. Swedish locale (`sv`). All existing form validation and conflict detection logic is untouched.

---

## File Map

| File                                       | Action | Purpose                                                                                             |
| ------------------------------------------ | ------ | --------------------------------------------------------------------------------------------------- |
| `src/lib/useIsDesktop.ts`                  | Create | Media query hook — `true` when viewport ≥ 768px                                                     |
| `src/routes/-components/TimeSelect.tsx`    | Create | Desktop scrollable time dropdown — 96 slots at 15-min intervals, 8 visible, scrolls to current time |
| `src/routes/-components/BookingDrawer.tsx` | Create | Mobile bottom drawer — steps through date → start time → end time with "Nästa" / "Klar"             |
| `src/routes/-components/BookingForm.tsx`   | Modify | Wire new components based on `useIsDesktop`; state shape unchanged                                  |
| `src/index.css`                            | Modify | react-datepicker CSS overrides to match app design                                                  |

---

### Task 1: Install react-datepicker and date-fns

**Files:**

- Modify: `package.json` (via npm install)

- [ ] **Step 1: Install packages**

```bash
npm install react-datepicker date-fns --legacy-peer-deps
npm install --save-dev @types/react-datepicker --legacy-peer-deps
```

- [ ] **Step 2: Verify build still passes**

```bash
npm run build
```

Expected: clean build, no errors.

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add react-datepicker and date-fns"
```

---

### Task 2: `useIsDesktop` hook

**Files:**

- Create: `src/lib/useIsDesktop.ts`

- [ ] **Step 1: Create the hook**

```typescript
import { useEffect, useState } from 'react'

const DESKTOP_QUERY = '(min-width: 768px)'

export function useIsDesktop(): boolean {
  const [isDesktop, setIsDesktop] = useState(
    () => window.matchMedia(DESKTOP_QUERY).matches
  )

  useEffect(() => {
    const mq = window.matchMedia(DESKTOP_QUERY)
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  return isDesktop
}
```

- [ ] **Step 2: Build check**

```bash
npm run build
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/useIsDesktop.ts
git commit -m "feat: useIsDesktop media query hook"
```

---

### Task 3: `TimeSelect` — desktop scrollable time dropdown

**Files:**

- Create: `src/routes/-components/TimeSelect.tsx`

The component renders a styled button showing the selected time (or placeholder). On click, a dropdown list opens with all 96 time slots (00:00–23:45 at 15-min intervals). On open, the list scrolls so the nearest current time slot is centered. 8 items are visible at once. The selected slot is highlighted yellow.

- [ ] **Step 1: Create `TimeSelect.tsx`**

```typescript
import { useEffect, useRef, useState } from 'react'

const ITEM_HEIGHT = 40
const VISIBLE_ITEMS = 8

function generateTimeSlots(): string[] {
  const slots: string[] = []
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 15) {
      slots.push(
        `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
      )
    }
  }
  return slots
}

const TIME_SLOTS = generateTimeSlots()

function getNearestSlotIndex(): number {
  const now = new Date()
  const totalMins = now.getHours() * 60 + now.getMinutes()
  return Math.round(totalMins / 15) % TIME_SLOTS.length
}

interface TimeSelectProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}

export function TimeSelect({
  value,
  onChange,
  placeholder = 'Välj tid',
  className = '',
}: TimeSelectProps) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLUListElement>(null)

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  // Scroll to selected or current time when opening
  useEffect(() => {
    if (!open || !listRef.current) return
    const targetIndex = value
      ? TIME_SLOTS.indexOf(value)
      : getNearestSlotIndex()
    if (targetIndex >= 0) {
      listRef.current.scrollTop =
        targetIndex * ITEM_HEIGHT - Math.floor(VISIBLE_ITEMS / 2) * ITEM_HEIGHT
    }
  }, [open, value])

  function handleSelect(slot: string) {
    onChange(slot)
    setOpen(false)
  }

  const baseInputClass =
    'w-full min-h-[44px] rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-left text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-[#F1E334]/30'

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`${baseInputClass} ${
          open
            ? 'border-[#F1E334] ring-2 ring-[#F1E334]/30'
            : 'text-gray-900 hover:border-gray-300'
        }`}
      >
        {value ? (
          <span className="text-gray-900">{value}</span>
        ) : (
          <span className="text-gray-400">{placeholder}</span>
        )}
      </button>

      {open && (
        <ul
          ref={listRef}
          className="absolute z-50 mt-1 w-full overflow-y-auto rounded-xl border border-gray-100 bg-white shadow-lg"
          style={{ height: VISIBLE_ITEMS * ITEM_HEIGHT }}
        >
          {TIME_SLOTS.map((slot) => (
            <li key={slot}>
              <button
                type="button"
                onClick={() => handleSelect(slot)}
                className={`w-full px-4 text-left text-sm transition-colors ${
                  slot === value
                    ? 'bg-[#F1E334] font-semibold text-gray-900'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
                style={{ height: ITEM_HEIGHT }}
              >
                {slot}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Build check**

```bash
npm run build
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/routes/-components/TimeSelect.tsx
git commit -m "feat: TimeSelect — scrollable 15-min time dropdown for desktop"
```

---

### Task 4: `BookingDrawer` — mobile step-through bottom drawer

**Files:**

- Create: `src/routes/-components/BookingDrawer.tsx`

Three steps shown one at a time inside a bottom drawer:

1. **Datum** — native `input[type="date"]` + "Nästa" button
2. **Starttid** — native `input[type="time"]` with `step="900"` + "Nästa" button
3. **Sluttid** — native `input[type="time"]` prefilled +2h + "Klar" button

The drawer slides up on open and slides down on close (same animation pattern as `ProfileModal`). The header shows which step the user is on and a summary of already-selected values.

- [ ] **Step 1: Create `BookingDrawer.tsx`**

```typescript
import { useEffect, useRef, useState } from 'react'
import { IconX } from '@tabler/icons-react'

type Step = 'date' | 'start' | 'end'

interface BookingDrawerProps {
  dateValue: string
  startTimeValue: string
  endTimeValue: string
  onDateChange: (v: string) => void
  onStartTimeChange: (v: string) => void
  onEndTimeChange: (v: string) => void
  onClose: () => void
  initialStep?: Step
}

function formatDateLabel(dateValue: string): string {
  if (!dateValue) return ''
  const d = new Date(`${dateValue}T12:00:00`)
  return d.toLocaleDateString('sv-SE', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })
}

const STEP_LABELS: Record<Step, string> = {
  date: 'Datum',
  start: 'Starttid',
  end: 'Sluttid',
}

export function BookingDrawer({
  dateValue,
  startTimeValue,
  endTimeValue,
  onDateChange,
  onStartTimeChange,
  onEndTimeChange,
  onClose,
  initialStep = 'date',
}: BookingDrawerProps) {
  const [step, setStep] = useState<Step>(initialStep)
  const [visible, setVisible] = useState(false)

  const dragStartY = useRef<number | null>(null)
  const [dragOffset, setDragOffset] = useState(0)

  useEffect(() => {
    const id = requestAnimationFrame(() => setVisible(true))
    document.body.style.overflow = 'hidden'
    return () => {
      cancelAnimationFrame(id)
      document.body.style.overflow = ''
    }
  }, [])

  function handleClose() {
    setVisible(false)
    setTimeout(onClose, 280)
  }

  function onTouchStart(e: React.TouchEvent) {
    dragStartY.current = e.touches[0]?.clientY ?? null
  }

  function onTouchMove(e: React.TouchEvent) {
    if (dragStartY.current === null) return
    setDragOffset(Math.max(0, (e.touches[0]?.clientY ?? 0) - dragStartY.current))
  }

  function onTouchEnd() {
    if (dragOffset > 100) {
      handleClose()
    } else {
      setDragOffset(0)
    }
    dragStartY.current = null
  }

  function handleNext() {
    if (step === 'date') setStep('start')
    else if (step === 'start') setStep('end')
    else handleClose()
  }

  const canAdvance =
    (step === 'date' && !!dateValue) ||
    (step === 'start' && !!startTimeValue) ||
    (step === 'end' && !!endTimeValue)

  const nextLabel = step === 'end' ? 'Klar' : 'Nästa'

  const panelStyle =
    dragOffset > 0
      ? { transform: `translateY(${dragOffset}px)`, transition: 'none' }
      : undefined

  const inputClass =
    'w-full min-h-[52px] rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-base text-gray-900 focus:border-[#F1E334] focus:outline-none focus:ring-2 focus:ring-[#F1E334]/30'

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-black/40 transition-opacity duration-300 ${visible ? 'opacity-100' : 'opacity-0'}`}
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Drawer panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={STEP_LABELS[step]}
        style={panelStyle}
        className={`fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl bg-white shadow-2xl transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          visible ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        {/* Drag handle */}
        <div
          className="flex flex-col items-center pb-1 pt-3"
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          <div className="h-1 w-10 rounded-full bg-gray-300" />
        </div>

        <div className="px-5 pb-10 pt-3">
          {/* Header */}
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="font-display text-[20px] font-bold uppercase tracking-wide text-gray-900">
                {STEP_LABELS[step]}
              </h2>
              {/* Summary of already-set values */}
              {step !== 'date' && dateValue && (
                <p className="mt-0.5 text-xs text-gray-500">
                  {formatDateLabel(dateValue)}
                  {step === 'end' && startTimeValue && ` · ${startTimeValue}`}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={handleClose}
              aria-label="Stäng"
              className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl bg-gray-100 text-gray-500 transition-colors hover:bg-gray-200 hover:text-gray-800"
            >
              <IconX size={18} stroke={2} />
            </button>
          </div>

          {/* Step content */}
          {step === 'date' && (
            <div>
              <label
                htmlFor="drawer-date"
                className="mb-2 block text-sm font-medium text-gray-700"
              >
                Välj datum
              </label>
              <input
                id="drawer-date"
                type="date"
                value={dateValue}
                onChange={(e) => onDateChange(e.target.value)}
                autoFocus
                className={inputClass}
              />
            </div>
          )}

          {step === 'start' && (
            <div>
              <label
                htmlFor="drawer-start"
                className="mb-2 block text-sm font-medium text-gray-700"
              >
                Välj starttid
              </label>
              <input
                id="drawer-start"
                type="time"
                step="900"
                value={startTimeValue}
                onChange={(e) => onStartTimeChange(e.target.value)}
                autoFocus
                className={inputClass}
              />
            </div>
          )}

          {step === 'end' && (
            <div>
              <label
                htmlFor="drawer-end"
                className="mb-2 block text-sm font-medium text-gray-700"
              >
                Välj sluttid
              </label>
              <input
                id="drawer-end"
                type="time"
                step="900"
                value={endTimeValue}
                onChange={(e) => onEndTimeChange(e.target.value)}
                autoFocus
                className={inputClass}
              />
            </div>
          )}

          {/* Next / Done button */}
          <button
            type="button"
            onClick={handleNext}
            disabled={!canAdvance}
            className="mt-6 flex w-full min-h-[52px] cursor-pointer items-center justify-center rounded-xl text-sm font-semibold text-gray-900 transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
            style={{ backgroundColor: '#F1E334' }}
          >
            {nextLabel}
          </button>
        </div>
      </div>
    </>
  )
}
```

- [ ] **Step 2: Build check**

```bash
npm run build
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/routes/-components/BookingDrawer.tsx
git commit -m "feat: BookingDrawer — mobile step-through date/time bottom drawer"
```

---

### Task 5: react-datepicker CSS overrides

**Files:**

- Modify: `src/index.css`

Add overrides after the existing rules to make react-datepicker match the app's visual style (white background, yellow accent, Barlow font, rounded corners).

- [ ] **Step 1: Add overrides to `src/index.css`**

Append to the end of the file:

```css
/* react-datepicker overrides */
.react-datepicker-wrapper {
  display: block;
  width: 100%;
}

.react-datepicker__input-container input {
  width: 100%;
  min-height: 44px;
  border-radius: 0.5rem;
  border: 1px solid #e5e7eb;
  background-color: #f9fafb;
  padding: 0.625rem 0.75rem;
  font-size: 0.875rem;
  color: #111827;
  font-family: 'Barlow', system-ui, sans-serif;
  outline: none;
  transition:
    border-color 0.15s,
    box-shadow 0.15s;
}

.react-datepicker__input-container input:focus {
  border-color: #f1e334;
  box-shadow: 0 0 0 3px rgba(241, 227, 52, 0.3);
}

.react-datepicker {
  font-family: 'Barlow', system-ui, sans-serif !important;
  border: 1px solid #e5e7eb !important;
  border-radius: 0.75rem !important;
  box-shadow:
    0 10px 15px -3px rgba(0, 0, 0, 0.1),
    0 4px 6px -4px rgba(0, 0, 0, 0.1) !important;
  overflow: hidden;
}

.react-datepicker__header {
  background-color: #fff !important;
  border-bottom: 1px solid #f3f4f6 !important;
  padding-top: 0.75rem !important;
}

.react-datepicker__current-month {
  font-family: 'Barlow Condensed', system-ui, sans-serif !important;
  font-weight: 700 !important;
  font-size: 1rem !important;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #111827 !important;
}

.react-datepicker__day-name {
  color: #6b7280 !important;
  font-weight: 600;
  font-size: 0.7rem;
  text-transform: uppercase;
}

.react-datepicker__day {
  border-radius: 0.5rem !important;
  color: #374151 !important;
}

.react-datepicker__day:hover {
  background-color: #fdf9c4 !important;
}

.react-datepicker__day--selected,
.react-datepicker__day--keyboard-selected {
  background-color: #f1e334 !important;
  color: #111827 !important;
  font-weight: 700;
}

.react-datepicker__day--today {
  font-weight: 700;
  color: #2a7d44 !important;
}

.react-datepicker__day--disabled {
  color: #d1d5db !important;
}

.react-datepicker__navigation-icon::before {
  border-color: #6b7280 !important;
}

.react-datepicker__navigation:hover .react-datepicker__navigation-icon::before {
  border-color: #111827 !important;
}
```

- [ ] **Step 2: Build check**

```bash
npm run build
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/index.css
git commit -m "style: react-datepicker overrides to match app design"
```

---

### Task 6: Update `BookingForm` — wire everything together

**Files:**

- Modify: `src/routes/-components/BookingForm.tsx`

Replace the date and time `<input>` elements with the new components based on `useIsDesktop`. The `addHours` helper and all form state/validation logic remain unchanged.

On **desktop** (useIsDesktop = true):

- Date field: `DatePicker` from react-datepicker
- Start time field: `TimeSelect`
- End time field: `TimeSelect` (shown after start is set)

On **mobile** (useIsDesktop = false):

- Date and time fields replaced by a summary row showing selected values
- Tapping the summary row opens `BookingDrawer`
- `BookingDrawer` triggers `onStartTimeChange` which also auto-sets end time (+2h)

- [ ] **Step 1: Rewrite `BookingForm.tsx`**

```typescript
import { useState } from 'react'
import DatePicker, { registerLocale } from 'react-datepicker'
import { sv } from 'date-fns/locale'
import { format } from 'date-fns'
import 'react-datepicker/dist/react-datepicker.css'
import * as GuestSession from '../../lib/GuestSession'
import {
  hasConflict,
  createGuestBooking,
  createMemberBooking,
  type BookingWithId,
} from '../../services/BookingService'
import type { AuthUser } from '../../lib/useAuth'
import { useIsDesktop } from '../../lib/useIsDesktop'
import { TimeSelect } from './TimeSelect'
import { BookingDrawer } from './BookingDrawer'

registerLocale('sv', sv)

interface BookingFormProps {
  existingBookings: BookingWithId[]
  onSuccess: (startTime: Date, endTime: Date) => void
  user: AuthUser | null
}

function padTwo(n: number): string {
  return String(n).padStart(2, '0')
}

function addHours(timeValue: string, hours: number): string {
  const [h, m] = timeValue.split(':').map(Number)
  const totalMinutes = (h * 60 + (m ?? 0) + hours * 60) % (24 * 60)
  return `${padTwo(Math.floor(totalMinutes / 60))}:${padTwo(totalMinutes % 60)}`
}

function formatDateLabel(dateValue: string): string {
  if (!dateValue) return ''
  const d = new Date(`${dateValue}T12:00:00`)
  const str = d.toLocaleDateString('sv-SE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
  return str.charAt(0).toUpperCase() + str.slice(1)
}

export function BookingForm({
  existingBookings,
  onSuccess,
  user,
}: BookingFormProps) {
  const isDesktop = useIsDesktop()
  const [email, setEmail] = useState(GuestSession.getEmail() ?? '')
  const [dateValue, setDateValue] = useState('')
  const [startTimeValue, setStartTimeValue] = useState('')
  const [endTimeValue, setEndTimeValue] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)

  const startDate =
    dateValue && startTimeValue
      ? new Date(`${dateValue}T${startTimeValue}`)
      : null
  const endDate =
    dateValue && endTimeValue
      ? new Date(`${dateValue}T${endTimeValue}`)
      : null

  const conflictDetected = (() => {
    if (!startDate || !endDate) return false
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) return false
    if (endDate <= startDate) return false
    return hasConflict(existingBookings, startDate, endDate)
  })()

  function handleStartTimeChange(val: string) {
    setStartTimeValue(val)
    if (val) setEndTimeValue(addHours(val, 2))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitError(null)

    const effectiveEmail = user ? user.email : email.trim()

    if (!effectiveEmail || !dateValue || !startTimeValue || !endTimeValue) {
      setSubmitError('Fyll i alla fält innan du bokar.')
      return
    }

    const start = new Date(`${dateValue}T${startTimeValue}`)
    const end = new Date(`${dateValue}T${endTimeValue}`)

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      setSubmitError('Ogiltigt datum eller tid.')
      return
    }

    if (end <= start) {
      setSubmitError('Sluttiden måste vara efter starttiden.')
      return
    }

    if (hasConflict(existingBookings, start, end)) {
      setSubmitError('Det finns redan en bokning som överlappar med vald tid.')
      return
    }

    setIsSubmitting(true)
    try {
      if (user) {
        await createMemberBooking(
          user.uid,
          user.email,
          user.displayName,
          start,
          end
        )
      } else {
        await createGuestBooking(effectiveEmail, effectiveEmail, start, end)
        GuestSession.setEmail(effectiveEmail)
        GuestSession.incrementBookingCount()
      }
      onSuccess(start, end)
    } catch (err) {
      setSubmitError(
        err instanceof Error
          ? err.message
          : 'Något gick fel. Försök igen senare.'
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  const inputClass =
    'w-full min-h-[44px] rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-900 focus:border-[#F1E334] focus:outline-none focus:ring-2 focus:ring-[#F1E334]/30'

  // Mobile summary row — tap to open drawer
  const mobileSummaryEmpty = !dateValue && !startTimeValue
  const mobileSummary = mobileSummaryEmpty
    ? 'Välj datum och tid'
    : [
        dateValue ? formatDateLabel(dateValue) : null,
        startTimeValue && endTimeValue
          ? `${startTimeValue}–${endTimeValue}`
          : startTimeValue || null,
      ]
        .filter(Boolean)
        .join(' · ')

  return (
    <section className="rounded-xl bg-white px-4 py-5 shadow-sm border border-gray-100 overflow-hidden">
      <h2 className="font-display mb-4 text-[20px] font-bold uppercase tracking-wide text-gray-900">
        Ny bokning
      </h2>
      <form onSubmit={handleSubmit} noValidate className="space-y-4 w-full min-w-0">
        {/* Email — guests only */}
        {!user && (
          <div className="min-w-0">
            <label
              htmlFor="booking-email"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              E-post
            </label>
            <input
              id="booking-email"
              type="email"
              autoComplete="email"
              inputMode="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="din@epost.se"
              className={inputClass}
            />
          </div>
        )}

        {/* ── DESKTOP: DatePicker + TimeSelect ── */}
        {isDesktop && (
          <>
            <div className="min-w-0">
              <label
                htmlFor="booking-date-desktop"
                className="mb-1 block text-sm font-medium text-gray-700"
              >
                Datum
              </label>
              <DatePicker
                id="booking-date-desktop"
                selected={dateValue ? new Date(`${dateValue}T12:00:00`) : null}
                onChange={(date) => {
                  if (date) setDateValue(format(date, 'yyyy-MM-dd'))
                }}
                locale="sv"
                dateFormat="yyyy-MM-dd"
                placeholderText="Välj datum"
                autoComplete="off"
              />
            </div>

            <div className="min-w-0">
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Starttid
              </label>
              <TimeSelect
                value={startTimeValue}
                onChange={handleStartTimeChange}
                placeholder="Välj starttid"
              />
            </div>

            {startTimeValue && (
              <div className="min-w-0">
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Sluttid
                </label>
                <TimeSelect
                  value={endTimeValue}
                  onChange={setEndTimeValue}
                  placeholder="Välj sluttid"
                />
              </div>
            )}
          </>
        )}

        {/* ── MOBILE: summary row → opens BookingDrawer ── */}
        {!isDesktop && (
          <div className="min-w-0">
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Datum och tid
            </label>
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              className={`w-full min-h-[44px] rounded-lg border bg-gray-50 px-3 py-2.5 text-left text-sm transition-colors ${
                mobileSummaryEmpty
                  ? 'border-gray-200 text-gray-400'
                  : 'border-gray-200 text-gray-900'
              }`}
            >
              {mobileSummary}
            </button>
          </div>
        )}

        {/* Inline conflict error */}
        {conflictDetected && (
          <p className="text-sm text-red-600">
            Det finns redan en bokning som överlappar med vald tid.
          </p>
        )}

        {/* Submit error */}
        {submitError && (
          <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
            {submitError}
          </div>
        )}

        {/* Submit button */}
        <button
          type="submit"
          disabled={isSubmitting || conflictDetected}
          className="flex w-full min-h-[44px] cursor-pointer items-center justify-center rounded-xl px-4 py-3 text-sm font-semibold text-gray-900 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ backgroundColor: '#F1E334' }}
        >
          {isSubmitting ? 'Bokar…' : 'Boka bana'}
        </button>
      </form>

      {/* Mobile booking drawer */}
      {drawerOpen && (
        <BookingDrawer
          dateValue={dateValue}
          startTimeValue={startTimeValue}
          endTimeValue={endTimeValue}
          onDateChange={setDateValue}
          onStartTimeChange={handleStartTimeChange}
          onEndTimeChange={setEndTimeValue}
          onClose={() => setDrawerOpen(false)}
        />
      )}
    </section>
  )
}
```

- [ ] **Step 2: Build check**

```bash
npm run build
```

Expected: no TypeScript errors, clean build.

- [ ] **Step 3: Lint check**

```bash
npm run lint
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/routes/-components/BookingForm.tsx src/lib/useIsDesktop.ts
git commit -m "feat: responsive date/time pickers — desktop calendar+scroll, mobile drawer"
```

---

### Task 7: Final checks and cleanup

- [ ] **Step 1: Run full suite**

```bash
npm run format && npm run lint:fix && npm run build && npm run test:run
```

Expected: 0 errors, all tests pass.

- [ ] **Step 2: Commit any formatting changes**

```bash
git add -A
git status
# only commit if there are changes
git commit -m "fix: format and lint cleanup"
```

- [ ] **Step 3: Finish branch**

Use `superpowers:finishing-a-development-branch`.
