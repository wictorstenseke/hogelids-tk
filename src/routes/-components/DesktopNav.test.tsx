import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { DesktopNav } from './DesktopNav'

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
    render(<DesktopNav isAdmin={false} ladderEnabled={false} />)
    expect(screen.getByRole('button', { name: /hem/i })).toBeInTheDocument()
  })

  it('renders Stegen button when ladderEnabled is true', () => {
    render(<DesktopNav isAdmin={false} ladderEnabled={true} />)
    expect(screen.getByRole('button', { name: /stegen/i })).toBeInTheDocument()
  })

  it('renders Admin button when isAdmin is true', () => {
    render(<DesktopNav isAdmin={true} ladderEnabled={false} />)
    expect(screen.getByRole('button', { name: /admin/i })).toBeInTheDocument()
  })

  it('does not render Admin when isAdmin is false', () => {
    render(<DesktopNav isAdmin={false} ladderEnabled={true} />)
    expect(
      screen.queryByRole('button', { name: /admin/i })
    ).not.toBeInTheDocument()
  })

  it('does not render Stegen when ladderEnabled is false', () => {
    render(<DesktopNav isAdmin={true} ladderEnabled={false} />)
    expect(
      screen.queryByRole('button', { name: /stegen/i })
    ).not.toBeInTheDocument()
  })
})
