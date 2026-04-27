import { render, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ReviewCard } from './review-card'

describe('ReviewCard', () => {
  it('shows the stage labels and pre-reveal helper copy', () => {
    const { container } = render(
      <ReviewCard
        front="What is photosynthesis?"
        back="Plants convert light into chemical energy."
        flipped={false}
        modeLabel="Quick 5"
        stepLabel="Card 2 of 5"
      />,
    )

    const frontFace = container.querySelector('[data-face="front"]')
    const backFace = container.querySelector('[data-face="back"]')

    expect(frontFace).not.toBeNull()
    expect(backFace).not.toBeNull()
    expect(frontFace).toHaveAttribute('aria-hidden', 'false')
    expect(backFace).toHaveAttribute('aria-hidden', 'true')
    expect(frontFace).toHaveStyle({ background: 'rgb(255, 241, 204)' })

    expect(within(frontFace as HTMLElement).getByText('Quick 5')).toBeInTheDocument()
    expect(within(frontFace as HTMLElement).getByText('Card 2 of 5')).toBeInTheDocument()
    expect(within(frontFace as HTMLElement).getByText('Question')).toBeInTheDocument()
    expect(within(frontFace as HTMLElement).getByText('Think it through before you flip.')).toBeInTheDocument()
    expect(within(frontFace as HTMLElement).getByText('What is photosynthesis?')).toBeInTheDocument()
    expect(within(backFace as HTMLElement).queryByText('Question')).not.toBeInTheDocument()
  })

  it('switches helper copy after reveal', () => {
    const { container } = render(
      <ReviewCard
        front="What is photosynthesis?"
        back="Plants convert light into chemical energy."
        flipped
        subject="math"
        modeLabel="Quick 5"
        stepLabel="Card 2 of 5"
      />,
    )

    const frontFace = container.querySelector('[data-face="front"]')
    const backFace = container.querySelector('[data-face="back"]')

    expect(frontFace).not.toBeNull()
    expect(backFace).not.toBeNull()
    expect(frontFace).toHaveAttribute('aria-hidden', 'true')
    expect(backFace).toHaveAttribute('aria-hidden', 'false')
    expect(backFace).toHaveStyle({ background: 'rgb(255, 241, 204)' })

    expect(within(backFace as HTMLElement).getByText('Answer')).toBeInTheDocument()
    expect(within(backFace as HTMLElement).getByText('Now rate how easily it came back.')).toBeInTheDocument()
    expect(within(backFace as HTMLElement).getByText('Plants convert light into chemical energy.')).toBeInTheDocument()
    expect(within(frontFace as HTMLElement).queryByText('Answer')).not.toBeInTheDocument()
  })
})
