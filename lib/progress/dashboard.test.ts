import { describe, expect, it } from 'vitest'
import { computeProgressDashboard } from './dashboard'

const now = new Date('2026-04-26T12:00:00.000Z')
const dayMs = 86400000

function due(offsetDays: number) {
  return new Date(now.getTime() + offsetDays * dayMs).toISOString()
}

describe('progress/dashboard', () => {
  it('handles an account with no reviews', () => {
    const dashboard = computeProgressDashboard({
      now,
      cards: [],
      decks: [],
      sessions: [],
    })

    expect(dashboard.summary).toEqual({
      totalCards: 0,
      activeCards: 0,
      dueNowCount: 0,
      masteryPct: 0,
      retentionPct: null,
      streak: 0,
      cardsReviewed7d: 0,
      sessions7d: 0,
      avgResponseMs: null,
    })
    expect(dashboard.weeklySummary).toEqual({
      cardsReviewed: 0,
      sessions: 0,
      retentionPct: null,
      avgResponseMs: null,
      activeDays: 0,
      strongestDayLabel: null,
      cardsDeltaVsPreviousWeek: null,
    })
    expect(dashboard.activity).toHaveLength(7)
    expect(dashboard.heatmap).toHaveLength(84)
    expect(dashboard.weakConcepts).toEqual([])
    expect(dashboard.recentSessions).toEqual([])
  })

  it('summarizes an account with one review session', () => {
    const dashboard = computeProgressDashboard({
      now,
      decks: [
        { id: 'deck-1', title: 'Algebra', status: 'ready', subject_family: 'math', card_count: 2 },
      ],
      cards: [
        {
          deck_id: 'deck-1',
          concept_tag: 'algebra',
          approved: true,
          suspended: false,
          fsrs_state: { due: due(-1), stability: 8, lapses: 1 },
        },
        {
          deck_id: 'deck-1',
          concept_tag: 'algebra',
          approved: true,
          suspended: false,
          fsrs_state: null,
        },
      ],
      sessions: [
        {
          id: 'session-1',
          started_at: '2026-04-26T09:00:00.000Z',
          cards_reviewed: 8,
          mean_accuracy: 0.75,
          mean_response_ms: 4200,
          mode: 'quick',
        },
      ],
    })

    expect(dashboard.summary.streak).toBe(1)
    expect(dashboard.summary.cardsReviewed7d).toBe(8)
    expect(dashboard.summary.retentionPct).toBe(75)
    expect(dashboard.summary.dueNowCount).toBe(2)
    expect(dashboard.weeklySummary.cardsReviewed).toBe(8)
    expect(dashboard.weeklySummary.sessions).toBe(1)
    expect(dashboard.weeklySummary.retentionPct).toBe(75)
    expect(dashboard.weeklySummary.strongestDayLabel).toBe('Sun')
    expect(dashboard.weakConcepts).toEqual([
      { tag: 'algebra', lapses: 1, dueNowCount: 1 },
    ])
    expect(dashboard.recentSessions[0]?.modeLabel).toBe('Quick 5')
    expect(dashboard.deckSnapshots[0]?.title).toBe('Algebra')
  })

  it('aggregates many sessions and sorts weak concepts and deck snapshots', () => {
    const dashboard = computeProgressDashboard({
      now,
      decks: [
        { id: 'deck-1', title: 'Geometry', status: 'ready', subject_family: 'math', card_count: 2 },
        { id: 'deck-2', title: 'Biology', status: 'ready', subject_family: 'science', card_count: 2 },
      ],
      cards: [
        {
          deck_id: 'deck-1',
          concept_tag: 'angles',
          approved: true,
          suspended: false,
          fsrs_state: { due: due(-2), stability: 6, lapses: 3 },
        },
        {
          deck_id: 'deck-1',
          concept_tag: 'angles',
          approved: true,
          suspended: false,
          fsrs_state: { due: due(4), stability: 16, lapses: 1 },
        },
        {
          deck_id: 'deck-2',
          concept_tag: 'cells',
          approved: true,
          suspended: false,
          fsrs_state: { due: due(-1), stability: 20, lapses: 4 },
        },
        {
          deck_id: 'deck-2',
          concept_tag: 'cells',
          approved: true,
          suspended: false,
          fsrs_state: { due: due(2), stability: 24, lapses: 0 },
        },
      ],
      sessions: [
        {
          id: 'session-1',
          started_at: '2026-04-26T09:00:00.000Z',
          cards_reviewed: 10,
          mean_accuracy: 0.8,
          mean_response_ms: 3500,
          mode: 'standard',
        },
        {
          id: 'session-2',
          started_at: '2026-04-25T09:00:00.000Z',
          cards_reviewed: 5,
          mean_accuracy: 0.6,
          mean_response_ms: 5200,
          mode: 'quick',
        },
        {
          id: 'session-3',
          started_at: '2026-04-21T09:00:00.000Z',
          cards_reviewed: 12,
          mean_accuracy: 0.9,
          mean_response_ms: 2800,
          mode: 'standard',
        },
      ],
    })

    expect(dashboard.summary.streak).toBe(2)
    expect(dashboard.summary.sessions7d).toBe(3)
    expect(dashboard.summary.cardsReviewed7d).toBe(27)
    expect(dashboard.summary.retentionPct).toBe(81)
    expect(dashboard.summary.avgResponseMs).toBe(3504)
    expect(dashboard.weeklySummary.cardsReviewed).toBe(27)
    expect(dashboard.weeklySummary.sessions).toBe(3)
    expect(dashboard.weeklySummary.retentionPct).toBe(81)
    expect(dashboard.weeklySummary.cardsDeltaVsPreviousWeek).toBeNull()
    expect(dashboard.weeklySummary.activeDays).toBe(3)
    expect(dashboard.weakConcepts.map((item) => item.tag)).toEqual(['angles', 'cells'])
    expect(dashboard.deckSnapshots.map((deck) => deck.title)).toEqual(['Geometry', 'Biology'])
    expect(dashboard.activity.at(-1)?.cardsReviewed).toBe(10)
    expect(dashboard.heatmap.at(-1)?.cardsReviewed).toBe(10)
  })
})
