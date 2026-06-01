import {
  QueryClient,
  QueryClientProvider,
  useQuery,
} from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import {
  BOOKINGS_QUERY_KEY,
  type BookingWithId,
} from '../../services/BookingService'
import { BookingForm } from './BookingForm'

const { mockCreateGuestBooking } = vi.hoisted(() => ({
  mockCreateGuestBooking: vi.fn(),
}))

vi.mock('../../lib/firebase', () => ({ db: {} }))

vi.mock('react-datepicker', () => ({
  default: ({
    id,
    selected,
    onChange,
    placeholderText,
  }: {
    id?: string
    selected: Date | null
    onChange: (date: Date | null) => void
    placeholderText?: string
  }) => (
    <input
      id={id}
      type="date"
      value={selected ? selected.toISOString().slice(0, 10) : ''}
      placeholder={placeholderText}
      onChange={(event) =>
        onChange(
          event.target.value ? new Date(`${event.target.value}T12:00:00`) : null
        )
      }
    />
  ),
  registerLocale: vi.fn(),
}))

vi.mock('./TimeSelect', () => ({
  TimeSelect: ({
    value,
    onChange,
    placeholder,
  }: {
    value: string
    onChange: (value: string) => void
    placeholder?: string
  }) => (
    <input
      aria-label={placeholder}
      value={value}
      onChange={(event) => onChange(event.target.value)}
    />
  ),
}))

vi.mock('../../lib/useIsDesktop', () => ({
  useIsDesktop: vi.fn(() => true),
}))

vi.mock('../../lib/ToastContext', () => ({
  useToast: vi.fn(() => ({ addToast: vi.fn() })),
}))

vi.mock('../../services/BookingService', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('../../services/BookingService')>()
  return {
    ...actual,
    createGuestBooking: mockCreateGuestBooking,
  }
})

vi.mock('../../services/LadderService', () => ({
  createLadderMatch: vi.fn(),
}))

vi.mock('../../services/UserService', () => ({
  USERS_QUERY_KEY: ['users'],
  listAllUsers: vi.fn(),
}))

beforeEach(() => {
  vi.clearAllMocks()
})

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

function BookingHarness() {
  const bookingsQuery = useQuery({
    queryKey: BOOKINGS_QUERY_KEY,
    queryFn: async () => [] as BookingWithId[],
    initialData: [] as BookingWithId[],
    staleTime: Infinity,
  })

  return (
    <BookingForm
      existingBookings={bookingsQuery.data}
      onSuccess={vi.fn()}
      user={null}
    />
  )
}

function renderWithQueryClient(ui: React.ReactElement) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })

  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>)
}

describe('BookingForm', () => {
  it('does not show an overlap warning from its own optimistic booking while submitting', async () => {
    const pendingBooking = deferred<string>()
    mockCreateGuestBooking.mockReturnValue(pendingBooking.promise)

    renderWithQueryClient(<BookingHarness />)

    const user = userEvent.setup()
    await user.type(screen.getByLabelText('E-post'), 'guest@example.com')
    fireEvent.change(screen.getByLabelText('Datum'), {
      target: { value: '2026-06-10' },
    })
    fireEvent.change(screen.getByLabelText('Välj starttid'), {
      target: { value: '10:00' },
    })

    await user.click(screen.getByRole('button', { name: 'Boka bana' }))

    await waitFor(() => {
      expect(mockCreateGuestBooking).toHaveBeenCalled()
    })
    expect(screen.getByRole('button', { name: 'Bokar…' })).toBeDisabled()
    expect(
      screen.queryByText(/överlappar med vald tid/i)
    ).not.toBeInTheDocument()
  })
})
