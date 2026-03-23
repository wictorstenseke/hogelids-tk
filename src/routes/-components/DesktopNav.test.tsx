import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { DesktopNav, AdminNavButton } from './DesktopNav'

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => vi.fn(),
  useRouterState: ({
    select,
  }: {
    select: (s: { location: { pathname: string } }) => string
  }) => select({ location: { pathname: '/' } }),
}))

describe('DesktopNav', () => {
  it('always renders Hem', () => {
    render(<DesktopNav ladderEnabled={false} />)
    expect(screen.getByRole('button', { name: /hem/i })).toBeInTheDocument()
  })

  it('renders Stegen button when ladderEnabled is true', () => {
    render(<DesktopNav ladderEnabled={true} />)
    expect(screen.getByRole('button', { name: /stegen/i })).toBeInTheDocument()
  })

  it('does not render Stegen when ladderEnabled is false', () => {
    render(<DesktopNav ladderEnabled={false} />)
    expect(
      screen.queryByRole('button', { name: /stegen/i })
    ).not.toBeInTheDocument()
  })

  it('does not render Admin (Admin lives in header next to profile)', () => {
    render(<DesktopNav ladderEnabled={true} />)
    expect(
      screen.queryByRole('button', { name: /admin/i })
    ).not.toBeInTheDocument()
  })
})

describe('AdminNavButton', () => {
  it('renders Admin button', () => {
    render(<AdminNavButton />)
    expect(screen.getByRole('button', { name: /admin/i })).toBeInTheDocument()
  })
})
