'use client'

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ReviewSession } from './review-session'
import type { SprintCard } from '@/lib/queue/types'

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}))

vi.mock('./actions', () => ({
  submitRating: vi.fn(async () => ({ ok: true, intervalDays: 1 })),
  finalizeSession: vi.fn(async () => ({ ok: true })),
}))

vi.mock('@/lib/fatigue/easy-cards', () => ({
  fetchEasyCards: vi.fn(async () => []),
}))

vi.mock('@/lib/fatigue/observe', () => ({
  observe: vi.fn(() => ({ action: 'continue' })),
}))

function card(overrides: Partial<SprintCard> = {}): SprintCard {
  return {
    id: 'card-1',
    deck_id: 'deck-1',
    concept_tag: 'algebra',
    front: { text: 'What is the derivative of x^2?' },
    back: { text: '2x' },
    hint: 'Starts with 2 - 2 characters',
    fsrs_state: null,
    suspended: false,
    approved: true,
    ...overrides,
  }
}

describe('review-session', () => {
  it('reveals a hint before the answer', async () => {
    const user = userEvent.setup()

    render(
      <ReviewSession
        cards={[card()]}
        deckId="deck-1"
        startedAt="2026-04-26T00:00:00.000Z"
        mode="quick"
      />,
    )

    expect(screen.queryByText('Hint')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Got it/i })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Reveal hint (H)' }))

    expect(screen.getByText('Hint')).toBeInTheDocument()
    expect(screen.getByText('Starts with 2 - 2 characters')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Got it/i })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Show answer (Space)' })).toBeInTheDocument()
  })

  it('ends the session from escape before the card is flipped', async () => {
    const user = userEvent.setup()

    render(
      <ReviewSession
        cards={[card()]}
        deckId="deck-1"
        startedAt="2026-04-26T00:00:00.000Z"
        mode="quick"
      />,
    )

    await user.keyboard('{Escape}')

    expect(screen.getByText('Nice sprint.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Another Quick 5' })).toBeInTheDocument()
  })

  it('offers a weak-card retry pass after a low rating in the main sprint', async () => {
    const user = userEvent.setup()

    render(
      <ReviewSession
        cards={[card()]}
        deckId="deck-1"
        startedAt="2026-04-26T00:00:00.000Z"
        mode="quick"
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Show answer (Space)' }))
    await user.click(screen.getByRole('button', { name: 'Forgot (press 1)' }))

    expect(screen.getByText('Revisit the tricky ones?')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Retry weak cards' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Retry weak cards' }))

    expect(screen.getByRole('button', { name: 'Show answer (Space)' })).toBeInTheDocument()
    expect(screen.getByText('What is the derivative of x^2?')).toBeInTheDocument()
  })
})
