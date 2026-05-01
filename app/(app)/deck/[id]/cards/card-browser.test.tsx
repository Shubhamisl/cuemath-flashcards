import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { CardBrowser, type CardRow } from './card-browser'

const { refreshSpy } = vi.hoisted(() => ({
  refreshSpy: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    refresh: refreshSpy,
  }),
}))

vi.mock('./actions', () => ({
  approveAllCards: vi.fn(),
  deleteCard: vi.fn(),
  setCardApproved: vi.fn(),
  updateCard: vi.fn(),
}))

const cards: CardRow[] = [
  {
    id: 'card-1',
    format: 'qa',
    front: { text: 'What is the slope-intercept form?' },
    back: { text: 'y = mx + b' },
    concept_tag: 'linear equations',
    suspended: false,
    approved: false,
    updated_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 'card-2',
    format: 'worked_example',
    front: { text: 'Solve 2x + 4 = 10.' },
    back: { text: 'Subtract 4, then divide by 2, so x = 3.' },
    concept_tag: 'equations',
    suspended: false,
    approved: true,
    updated_at: '2026-01-02T00:00:00Z',
  },
]

describe('CardBrowser', () => {
  it('renders a high-contrast management toolbar and scan-friendly card rows', () => {
    render(<CardBrowser deckId="deck-1" deckStatus="draft" initialCards={cards} />)

    expect(screen.getByTestId('card-browser-toolbar')).toHaveClass('border-2')
    expect(screen.getByTestId('card-browser-toolbar')).toHaveClass('flex-col')
    expect(screen.getByTestId('card-browser-toolbar')).toHaveClass('sm:flex-row')
    expect(screen.getByTestId('card-row-card-1')).toHaveClass('border-2')
    expect(screen.getByTestId('card-row-card-1')).toHaveClass('hover:-translate-y-0.5')
    expect(screen.getByTestId('card-row-card-1')).toHaveTextContent('Card 01')
    expect(screen.getByTestId('card-meta-card-1')).toHaveClass('flex-wrap')
    expect(screen.getByRole('button', { name: 'Approve all pending cards' })).toBeInTheDocument()
  })
})
