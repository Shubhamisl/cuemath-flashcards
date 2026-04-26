import { describe, expect, it } from 'vitest'
import { filterAndSortDecks, type LibraryDeck } from './library-view'

const baseDecks: LibraryDeck[] = [
  {
    id: 'ready-low',
    title: 'Algebra Warmups',
    subjectFamily: 'math',
    status: 'ready',
    cardCount: 20,
    tier: 'Curious',
    masteryPct: 12,
    dueCount: 5,
  },
  {
    id: 'ready-high',
    title: 'Biology Systems',
    subjectFamily: 'science',
    status: 'ready',
    cardCount: 35,
    tier: 'SharpMind',
    masteryPct: 82,
    dueCount: 1,
  },
  {
    id: 'draft',
    title: 'Essay terms',
    subjectFamily: 'language',
    status: 'draft',
    cardCount: 10,
    tier: 'Practicing',
    masteryPct: 0,
    dueCount: 0,
  },
  {
    id: 'archived',
    title: 'Old Geometry',
    subjectFamily: 'math',
    status: 'archived',
    cardCount: 12,
    tier: 'Confident',
    masteryPct: 64,
    dueCount: 2,
  },
]

describe('library-view', () => {
  it('hides archived decks by default', () => {
    const visible = filterAndSortDecks(baseDecks, {
      query: '',
      sort: 'created',
      subject: 'all',
      status: 'active',
      mastery: 'all',
    })

    expect(visible.map((deck) => deck.id)).toEqual(['ready-low', 'ready-high', 'draft'])
  })

  it('shows archived decks when explicitly filtered', () => {
    const visible = filterAndSortDecks(baseDecks, {
      query: '',
      sort: 'created',
      subject: 'all',
      status: 'archived',
      mastery: 'all',
    })

    expect(visible.map((deck) => deck.id)).toEqual(['archived'])
  })

  it('composes search, subject, status, and mastery filters', () => {
    const visible = filterAndSortDecks(baseDecks, {
      query: 'bio',
      sort: 'created',
      subject: 'science',
      status: 'ready',
      mastery: 'SharpMind',
    })

    expect(visible.map((deck) => deck.id)).toEqual(['ready-high'])
  })

  it('sorts by due count and then title fallback', () => {
    const visible = filterAndSortDecks(
      [
        { ...baseDecks[1], title: 'Zed Biology', dueCount: 4 },
        { ...baseDecks[0], title: 'Alpha Algebra', dueCount: 4 },
      ],
      {
        query: '',
        sort: 'due',
        subject: 'all',
        status: 'active',
        mastery: 'all',
      },
    )

    expect(visible.map((deck) => deck.title)).toEqual(['Alpha Algebra', 'Zed Biology'])
  })
})
