import { render, screen } from '@testing-library/react'
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
      screen.getByText('This PDF looks image-only or scanned. Try a text-based PDF or run OCR first.'),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'View details' })).toHaveAttribute('href', '/deck/deck-1')
  })
})
