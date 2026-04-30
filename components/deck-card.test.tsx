import { render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { DeckCard } from './deck-card'

vi.mock('next/link', () => ({
  default: ({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}))

vi.mock('@/lib/db/client', () => ({
  createClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          order: () => ({
            limit: () => ({
              maybeSingle: async () => ({ data: null }),
            }),
          }),
        }),
      }),
    }),
  }),
}))

vi.mock('@/app/(app)/library/actions', () => ({
  deleteDeckFromLibrary: vi.fn(),
  retryIngest: vi.fn(),
}))

describe('DeckCard', () => {
  it('shows the latest failed ingest summary and a details link', () => {
    render(
      <DeckCard
        id="deck-1"
        title="Optics"
        subjectFamily="science"
        status="failed"
        cardCount={0}
        initialJob={{
          stage: 'extracting',
          progress_pct: 15,
          error: 'PDF had no extractable text',
        }}
      />,
    )

    expect(screen.getByText('Generation failed')).toBeInTheDocument()
    expect(
      screen.getByText('This PDF looks image-only or scanned, and OCR could not read it clearly.'),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'View details' })).toHaveAttribute('href', '/deck/deck-1')
  })

  it('surfaces state badges and study metadata for ready decks', () => {
    render(
      <DeckCard
        id="deck-2"
        title="Biology Systems"
        subjectFamily="science"
        status="ready"
        cardCount={35}
        tags={['biology', 'systems']}
        tier="SharpMind"
        masteryPct={82}
        dueCount={4}
      />,
    )

    expect(screen.getByText('Biology Systems')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Biology Systems/ })).toHaveClass('cue-deck-card-link')
    expect(screen.getByTestId('deck-card-deck-2')).toHaveAttribute('data-motion', 'deck-card')
    const progressPanel = screen.getByTestId('deck-progress-panel')
    expect(progressPanel).toHaveTextContent('Mastery')
    expect(progressPanel).toHaveTextContent('82%')
    expect(within(progressPanel).getByText('4 due')).toBeInTheDocument()
    expect(screen.getByText('Science')).toBeInTheDocument()
    expect(screen.getByText('SharpMind')).toBeInTheDocument()
    expect(screen.getAllByText('4 due').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('4 due now')).toBeInTheDocument()
    expect(screen.getByText('82% mastered')).toBeInTheDocument()
    expect(screen.getByText('biology')).toBeInTheDocument()
  })
})
