import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HomePage } from './HomePage'

describe('HomePage', () => {
  it('renders the get started heading', () => {
    render(<HomePage />)
    expect(
      screen.getByRole('heading', { name: /get started/i })
    ).toBeInTheDocument()
  })

  it('increments count when button is clicked', async () => {
    const user = userEvent.setup()
    render(<HomePage />)
    const button = screen.getByRole('button', { name: /count is 0/i })
    await user.click(button)
    expect(
      screen.getByRole('button', { name: /count is 1/i })
    ).toBeInTheDocument()
  })
})
