import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import DeckPage from './page'

const { redirectSpy, notFoundSpy, fromSpy, getUserSpy } = vi.hoisted(() => ({
  redirectSpy: vi.fn((href: string) => {
    throw new Error(`redirect:${href}`)
  }),
  notFoundSpy: vi.fn(() => {
    throw new Error('not-found')
  }),
  fromSpy: vi.fn(),
  getUserSpy: vi.fn(),
}))

vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    className,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} className={className} {...props}>
      {children}
    </a>
  ),
}))

vi.mock('next/navigation', () => ({
  redirect: redirectSpy,
  notFound: notFoundSpy,
}))

vi.mock('@/lib/db/server', () => ({
  createClient: async () => ({
    auth: {
      getUser: getUserSpy,
    },
    from: fromSpy,
  }),
}))

vi.mock('@/components/mastery-ring', () => ({
  MasteryRing: ({ pct }: { pct: number }) => <div data-testid="mastery-ring">{pct}</div>,
}))

vi.mock('./rename-deck-form', () => ({
  RenameDeckForm: ({ initialTitle }: { initialTitle: string }) => <h1>{initialTitle}</h1>,
}))

vi.mock('./deck-tags-form', () => ({
  DeckTagsForm: ({ initialTags }: { initialTags: string[] }) => (
    <div>{initialTags.map((tag) => tag).join(', ')}</div>
  ),
}))

vi.mock('./review-ready-button', () => ({
  ReviewReadyButton: ({ disabled }: { disabled: boolean }) => (
    <button type="button" disabled={disabled}>
      Mark deck ready
    </button>
  ),
}))

vi.mock('./archive-deck-button', () => ({
  ArchiveDeckButton: () => <button type="button">Archive deck</button>,
}))

vi.mock('./delete-deck-button', () => ({
  DeleteDeckButton: () => <button type="button">Delete deck</button>,
}))

function queryWith(data: unknown) {
  return {
    select() {
      return this
    },
    eq() {
      return this
    },
    order() {
      return this
    },
    limit() {
      return this
    },
    single: vi.fn().mockResolvedValue({ data }),
    maybeSingle: vi.fn().mockResolvedValue({ data }),
    then(resolve: (value: { data: unknown }) => void) {
      resolve({ data })
    },
  }
}

describe('deck detail page', () => {
  it('presents a branded hero shell with a mobile-safe action dock', async () => {
    getUserSpy.mockResolvedValue({
      data: {
        user: { id: 'user-1' },
      },
    })
    fromSpy.mockImplementation((table: string) => {
      if (table === 'profiles') return queryWith({ onboarded_at: '2026-01-01' })
      if (table === 'decks') {
        return queryWith({
          id: 'deck-1',
          title: 'Algebra Sprint',
          subject_family: 'math',
          card_count: 3,
          status: 'draft',
          tags: ['linear equations', 'revision'],
        })
      }
      if (table === 'cards') {
        return queryWith([
          {
            fsrs_state: null,
            suspended: false,
            approved: true,
            concept_tag: 'linear equations',
          },
          {
            fsrs_state: null,
            suspended: false,
            approved: false,
            concept_tag: 'slope',
          },
        ])
      }
      return queryWith(null)
    })

    render(
      await DeckPage({
        params: Promise.resolve({ id: 'deck-1' }),
        searchParams: Promise.resolve({}),
      }),
    )

    expect(screen.getByTestId('deck-detail-hero')).toHaveClass('border-2')
    expect(screen.getByTestId('deck-detail-hero')).toHaveClass('bg-cue-yellow/20')
    expect(screen.getByTestId('deck-action-dock')).toHaveClass('grid-cols-1')
    expect(screen.getByTestId('deck-action-dock')).toHaveClass('sm:grid-cols-2')
    expect(screen.getByTestId('deck-stats-grid')).toHaveClass('grid-cols-1')
    expect(screen.getByTestId('deck-stats-grid')).toHaveClass('sm:grid-cols-3')
    expect(screen.getByRole('link', { name: /Review generated cards/i })).toHaveAttribute(
      'href',
      '/deck/deck-1/cards',
    )
  })
})
