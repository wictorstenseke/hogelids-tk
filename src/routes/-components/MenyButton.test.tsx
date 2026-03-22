import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MenyButton } from './MenyButton'

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => vi.fn(),
}))

describe('MenyButton', () => {
  it('returns null when no items are visible', () => {
    const { container } = render(
      <MenyButton isAdmin={false} ladderEnabled={false} />
    )
    expect(container.firstChild).toBeNull()
  })

  it('renders both Stegen and Admin when both are enabled', async () => {
    const user = userEvent.setup()
    render(<MenyButton isAdmin={true} ladderEnabled={true} />)
    await user.click(screen.getByRole('button', { name: /meny/i }))
    expect(screen.getByText('Stegen')).toBeInTheDocument()
    expect(screen.getByText('Admin')).toBeInTheDocument()
  })

  it('renders "Meny" button when ladderEnabled is true', () => {
    render(<MenyButton isAdmin={false} ladderEnabled={true} />)
    expect(screen.getByRole('button', { name: /meny/i })).toBeInTheDocument()
  })

  it('renders "Meny" button when isAdmin is true', () => {
    render(<MenyButton isAdmin={true} ladderEnabled={false} />)
    expect(screen.getByRole('button', { name: /meny/i })).toBeInTheDocument()
  })

  it('shows Stegen in dropdown when ladderEnabled is true', async () => {
    const user = userEvent.setup()
    render(<MenyButton isAdmin={false} ladderEnabled={true} />)
    await user.click(screen.getByRole('button', { name: /meny/i }))
    expect(screen.getByText('Stegen')).toBeInTheDocument()
  })

  it('shows Admin in dropdown when isAdmin is true', async () => {
    const user = userEvent.setup()
    render(<MenyButton isAdmin={true} ladderEnabled={false} />)
    await user.click(screen.getByRole('button', { name: /meny/i }))
    expect(screen.getByText('Admin')).toBeInTheDocument()
  })

  it('does not show Admin when isAdmin is false', async () => {
    const user = userEvent.setup()
    render(<MenyButton isAdmin={false} ladderEnabled={true} />)
    await user.click(screen.getByRole('button', { name: /meny/i }))
    expect(screen.queryByText('Admin')).not.toBeInTheDocument()
  })

  it('has aria-haspopup and aria-expanded attributes on trigger', () => {
    render(<MenyButton isAdmin={true} ladderEnabled={false} />)
    const btn = screen.getByRole('button', { name: /meny/i })
    expect(btn).toHaveAttribute('aria-haspopup', 'menu')
    expect(btn).toHaveAttribute('aria-expanded', 'false')
  })

  it('sets aria-expanded true when open', async () => {
    const user = userEvent.setup()
    render(<MenyButton isAdmin={true} ladderEnabled={false} />)
    const btn = screen.getByRole('button', { name: /meny/i })
    await user.click(btn)
    expect(btn).toHaveAttribute('aria-expanded', 'true')
  })
})
