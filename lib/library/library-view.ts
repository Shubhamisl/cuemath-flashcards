import type { subjectFamily } from '@/lib/brand/tokens'
import type { Tier } from '@/lib/progress/deck-stats'

export type LibraryStatusFilter =
  | 'active'
  | 'ready'
  | 'draft'
  | 'failed'
  | 'ingesting'
  | 'archived'

export type LibrarySort = 'created' | 'title' | 'due' | 'mastery'
export type LibraryMasteryFilter = 'all' | Tier

export type LibraryDeck = {
  id: string
  title: string
  subjectFamily: subjectFamily
  status: string
  cardCount: number
  tags: string[]
  tier?: Tier
  masteryPct?: number
  dueCount?: number
}

export function filterAndSortDecks(
  decks: LibraryDeck[],
  filters: {
    query: string
    sort: LibrarySort
    subject: 'all' | subjectFamily
    status: LibraryStatusFilter
    mastery: LibraryMasteryFilter
  },
): LibraryDeck[] {
  const query = filters.query.trim().toLowerCase()

  let visible = decks.filter((deck) => {
    if (
      query &&
      !deck.title.toLowerCase().includes(query) &&
      !deck.tags.some((tag) => tag.toLowerCase().includes(query))
    ) {
      return false
    }
    if (filters.subject !== 'all' && deck.subjectFamily !== filters.subject) return false
    if (filters.status === 'active' && deck.status === 'archived') return false
    if (filters.status !== 'active' && deck.status !== filters.status) return false
    if (filters.mastery !== 'all' && deck.tier !== filters.mastery) return false
    return true
  })

  if (filters.sort === 'title') {
    visible = visible.sort((a, b) => a.title.localeCompare(b.title))
  } else if (filters.sort === 'due') {
    visible = visible.sort((a, b) => {
      const dueDiff = (b.dueCount ?? 0) - (a.dueCount ?? 0)
      if (dueDiff !== 0) return dueDiff
      return a.title.localeCompare(b.title)
    })
  } else if (filters.sort === 'mastery') {
    visible = visible.sort((a, b) => {
      const masteryDiff = (a.masteryPct ?? 0) - (b.masteryPct ?? 0)
      if (masteryDiff !== 0) return masteryDiff
      return a.title.localeCompare(b.title)
    })
  }

  return visible
}
