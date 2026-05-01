'use client'

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ReviewSession } from './review-session'
import type { SprintCard } from '@/lib/queue/types'

const { observeSpy, fetchEasyCardsSpy, getSessionPreviewSpy } = vi.hoisted(() => ({
  observeSpy: vi.fn(),
  fetchEasyCardsSpy: vi.fn(),
  getSessionPreviewSpy: vi.fn(),
}))

const pushSpy = vi.fn()
const refreshSpy = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: pushSpy,
    refresh: refreshSpy,
  }),
}))

vi.mock('./actions', () => ({
  submitRating: vi.fn(async () => ({ ok: true, intervalDays: 1 })),
  finalizeSession: vi.fn(async () => ({ ok: true })),
  getSessionPreview: getSessionPreviewSpy,
}))

vi.mock('@/lib/fatigue/easy-cards', () => ({
  fetchEasyCards: fetchEasyCardsSpy,
}))

vi.mock('@/lib/fatigue/observe', () => ({
  observe: observeSpy,
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

function resetPreviewMock(overrides: Record<string, unknown> = {}) {
  getSessionPreviewSpy.mockReset()
  getSessionPreviewSpy.mockResolvedValue({
    weakTags: ['algebra'],
    dueNowCount: 1,
    hasDueNow: true,
    dueLaterToday: 1,
    dueTomorrow: 0,
    dueThisWeek: 2,
    hasUpcoming: true,
    suggestedMode: 'quick',
    suggestedReason: 'A short cleanup pass is the fastest way to revisit weak concepts.',
    ...overrides,
  })
}

describe('review-session', () => {
  it('reveals a hint before the answer', async () => {
    pushSpy.mockReset()
    refreshSpy.mockReset()
    observeSpy.mockReset()
    observeSpy.mockReturnValue({ action: 'continue' })
    fetchEasyCardsSpy.mockReset()
    fetchEasyCardsSpy.mockResolvedValue([])
    resetPreviewMock()
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
    expect(screen.getByRole('button', { name: 'Try typing it' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Show answer (Space)' })).toBeInTheDocument()
  })

  it('renders the sprint progress as Cuemath block cells', () => {
    pushSpy.mockReset()
    refreshSpy.mockReset()
    observeSpy.mockReset()
    fetchEasyCardsSpy.mockReset()
    fetchEasyCardsSpy.mockResolvedValue([])
    resetPreviewMock()

    render(
      <ReviewSession
        cards={[
          card({ id: 'card-1' }),
          card({ id: 'card-2', front: { text: 'Second prompt' } }),
        ]}
        deckId="deck-1"
        startedAt="2026-04-26T00:00:00.000Z"
        mode="quick"
      />,
    )

    const progress = screen.getByTestId('review-progress-cells')
    expect(progress).toHaveAttribute('aria-label', 'Card 1 of 2')
    expect(progress.querySelectorAll('.cue-progress-cell')).toHaveLength(2)
    expect(progress.querySelector('.cue-progress-current')).toBeInTheDocument()
  })

  it('shows live sprint status as the learner advances', async () => {
    pushSpy.mockReset()
    refreshSpy.mockReset()
    observeSpy.mockReset()
    observeSpy.mockReturnValue({ action: 'continue' })
    fetchEasyCardsSpy.mockReset()
    fetchEasyCardsSpy.mockResolvedValue([])
    resetPreviewMock()
    const user = userEvent.setup()

    render(
      <ReviewSession
        cards={[
          card({ id: 'card-1' }),
          card({ id: 'card-2', front: { text: 'Second prompt' } }),
        ]}
        deckId="deck-1"
        startedAt="2026-04-26T00:00:00.000Z"
        mode="quick"
      />,
    )

    expect(screen.getByTestId('review-sprint-status')).toHaveTextContent('Card 1 / 2')
    expect(screen.getByTestId('review-sprint-status')).toHaveTextContent('50%')
    expect(screen.getByTestId('review-sprint-status')).toHaveTextContent('Main sprint')

    await user.click(screen.getByRole('button', { name: 'Show answer (Space)' }))
    await user.click(screen.getByRole('button', { name: 'Got it (press 3)' }))

    expect(screen.getByTestId('review-sprint-status')).toHaveTextContent('Card 2 / 2')
    expect(screen.getByTestId('review-sprint-status')).toHaveTextContent('100%')
  })

  it('ends the session from escape before the card is flipped', async () => {
    pushSpy.mockReset()
    refreshSpy.mockReset()
    observeSpy.mockReset()
    observeSpy.mockReturnValue({ action: 'continue' })
    fetchEasyCardsSpy.mockReset()
    fetchEasyCardsSpy.mockResolvedValue([])
    resetPreviewMock()
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

    expect(screen.getByText('Nice sprint.').closest('[data-motion-stage="session-complete"]')).toHaveClass(
      'motion-premium-reveal',
    )
    expect(screen.getByText('Nice sprint.')).toBeInTheDocument()
    expect(await screen.findByText('Suggested next: Quick 5')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Start Quick 5' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Start Sprint' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Another Quick 5' })).not.toBeInTheDocument()
  })

  it('offers a weak-card retry pass after a low rating in the main sprint', async () => {
    pushSpy.mockReset()
    refreshSpy.mockReset()
    observeSpy.mockReset()
    observeSpy.mockReturnValue({ action: 'continue' })
    fetchEasyCardsSpy.mockReset()
    fetchEasyCardsSpy.mockResolvedValue([])
    resetPreviewMock()
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

  it('starts a fresh quick session from the done screen', async () => {
    pushSpy.mockReset()
    refreshSpy.mockReset()
    observeSpy.mockReset()
    observeSpy.mockReturnValue({ action: 'continue' })
    fetchEasyCardsSpy.mockReset()
    fetchEasyCardsSpy.mockResolvedValue([])
    resetPreviewMock()
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
    await screen.findByText('Suggested next: Quick 5')
    await user.click(screen.getByRole('button', { name: 'Start Quick 5' }))

    expect(pushSpy).toHaveBeenCalledTimes(1)
    expect(pushSpy.mock.calls[0][0]).toMatch(/^\/review\?deck=deck-1&mode=quick&run=/)
  })

  it('does not inject easy cards during the weak-card retry loop', async () => {
    pushSpy.mockReset()
    refreshSpy.mockReset()
    observeSpy.mockReset()
    observeSpy
      .mockReturnValueOnce({ action: 'continue' })
      .mockReturnValueOnce({ action: 'inject_easy' })
    fetchEasyCardsSpy.mockReset()
    resetPreviewMock()
    fetchEasyCardsSpy.mockResolvedValue([
      card({
        id: 'card-2',
        front: { text: 'Easy check-in' },
        back: { text: 'Momentum' },
      }),
    ])
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
    await user.click(screen.getByRole('button', { name: 'Retry weak cards' }))
    await user.click(screen.getByRole('button', { name: 'Show answer (Space)' }))
    await user.click(screen.getByRole('button', { name: 'Forgot (press 1)' }))

    expect(fetchEasyCardsSpy).not.toHaveBeenCalled()
    expect(await screen.findByText('Nice sprint.')).toBeInTheDocument()
    expect(screen.queryByText('Easy check-in')).not.toBeInTheDocument()
  })

  it('lets the learner type an answer before rating', async () => {
    pushSpy.mockReset()
    refreshSpy.mockReset()
    observeSpy.mockReset()
    observeSpy.mockReturnValue({ action: 'continue' })
    fetchEasyCardsSpy.mockReset()
    fetchEasyCardsSpy.mockResolvedValue([])
    resetPreviewMock()
    const user = userEvent.setup()

    render(
      <ReviewSession
        cards={[card({ back: { text: '2x' } })]}
        deckId="deck-1"
        startedAt="2026-04-26T00:00:00.000Z"
        mode="quick"
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Try typing it' }))
    await user.type(screen.getByPlaceholderText('Type your answer'), '2 x{enter}')

    expect(screen.getByText('Your attempt')).toBeInTheDocument()
    expect(screen.getByText('Nice - that matches. Now rate how well it came back.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Got it (press 3)' })).toBeInTheDocument()
  })

  it('allows skipping the typing challenge without flipping the card', async () => {
    pushSpy.mockReset()
    refreshSpy.mockReset()
    observeSpy.mockReset()
    observeSpy.mockReturnValue({ action: 'continue' })
    fetchEasyCardsSpy.mockReset()
    fetchEasyCardsSpy.mockResolvedValue([])
    resetPreviewMock()
    const user = userEvent.setup()

    render(
      <ReviewSession
        cards={[card()]}
        deckId="deck-1"
        startedAt="2026-04-26T00:00:00.000Z"
        mode="quick"
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Try typing it' }))
    expect(screen.getByTestId('typing-challenge-actions')).toHaveClass('grid-cols-1')
    expect(screen.getByTestId('typing-challenge-actions')).toHaveClass('sm:grid-cols-2')
    await user.click(screen.getByRole('button', { name: 'Skip typing' }))

    expect(screen.getByRole('button', { name: 'Show answer (Space)' })).toBeInTheDocument()
    expect(screen.queryByText('Your attempt')).not.toBeInTheDocument()
  })

  it('does not offer another session when nothing is due right now', async () => {
    pushSpy.mockReset()
    refreshSpy.mockReset()
    observeSpy.mockReset()
    observeSpy.mockReturnValue({ action: 'continue' })
    fetchEasyCardsSpy.mockReset()
    fetchEasyCardsSpy.mockResolvedValue([])
    resetPreviewMock({
      dueNowCount: 0,
      hasDueNow: false,
      dueLaterToday: 2,
      dueTomorrow: 3,
      dueThisWeek: 4,
    })
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

    expect(await screen.findByText('Suggested next: Quick 5')).toBeInTheDocument()
    expect(screen.getByText('Nothing else is due right now. Come back when the next cards unlock.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Start Quick 5' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Start Sprint' })).not.toBeInTheDocument()
  })

  it('uses the library back label for an empty global queue', () => {
    pushSpy.mockReset()
    refreshSpy.mockReset()
    observeSpy.mockReset()
    fetchEasyCardsSpy.mockReset()
    getSessionPreviewSpy.mockReset()

    render(
      <ReviewSession
        cards={[]}
        backHref="/library"
        startedAt="2026-04-26T00:00:00.000Z"
        mode="standard"
      />,
    )

    expect(screen.getByRole('button', { name: 'Back to library' })).toBeInTheDocument()
  })

  it('shows a next-session preview for global review sessions', async () => {
    pushSpy.mockReset()
    refreshSpy.mockReset()
    observeSpy.mockReset()
    observeSpy.mockReturnValue({ action: 'continue' })
    fetchEasyCardsSpy.mockReset()
    fetchEasyCardsSpy.mockResolvedValue([])
    resetPreviewMock()
    const user = userEvent.setup()

    render(
      <ReviewSession
        cards={[card()]}
        backHref="/library"
        startedAt="2026-04-26T00:00:00.000Z"
        mode="quick"
      />,
    )

    await user.keyboard('{Escape}')

    expect(await screen.findByText('Suggested next: Quick 5')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Start Quick 5' })).toBeInTheDocument()
  })
})
