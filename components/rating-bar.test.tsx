import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { RatingBar } from './rating-bar'

describe('RatingBar', () => {
  it('shows the review prompt and expressive rating copy', () => {
    render(<RatingBar disabled={false} onRate={vi.fn()} />)

    expect(screen.getByText('Recall check')).toBeInTheDocument()
    expect(screen.getByText('How did that feel?')).toBeInTheDocument()

    expect(screen.getByRole('button', { name: 'Forgot (press 1)' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Forgot (press 1)' })).toHaveClass('motion-premium-choice')
    expect(screen.getByRole('button', { name: 'Tough (press 2)' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Got it (press 3)' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Easy (press 4)' })).toBeInTheDocument()

    expect(screen.getByText('Blanked completely')).toBeInTheDocument()
    expect(screen.getByText('Got there slowly')).toBeInTheDocument()
    expect(screen.getByText('Solid recall')).toBeInTheDocument()
    expect(screen.getByText('Instant and clean')).toBeInTheDocument()
  })

  it('keeps the same rating contract for every control', async () => {
    const user = userEvent.setup()
    const onRate = vi.fn()

    render(<RatingBar disabled={false} onRate={onRate} />)

    await user.click(screen.getByRole('button', { name: 'Forgot (press 1)' }))
    await user.click(screen.getByRole('button', { name: 'Tough (press 2)' }))
    await user.click(screen.getByRole('button', { name: 'Got it (press 3)' }))
    await user.click(screen.getByRole('button', { name: 'Easy (press 4)' }))

    expect(onRate).toHaveBeenNthCalledWith(1, 1)
    expect(onRate).toHaveBeenNthCalledWith(2, 2)
    expect(onRate).toHaveBeenNthCalledWith(3, 3)
    expect(onRate).toHaveBeenNthCalledWith(4, 4)
  })
})
