import { describe, it, expect } from 'vitest'
import { buildSprintFromCards, buildSprintFromCardsWithFilter } from './build-sprint'
import type { SprintCard } from './types'

const now = new Date('2026-04-24T12:00:00.000Z')
const dayMs = 86400000

function card(id: string, overrides: Partial<SprintCard> = {}): SprintCard {
  return {
    id,
    deck_id: 'deck1',
    concept_tag: 'A',
    front: { text: `Q${id}` },
    back: { text: `A${id}` },
    hint: null,
    fsrs_state: null,
    suspended: false,
    approved: true,
    ...overrides,
  }
}

function dueState(daysAgo: number, stability = 10): SprintCard['fsrs_state'] {
  return {
    due: new Date(now.getTime() - daysAgo * dayMs).toISOString(),
    stability,
    difficulty: 5,
    elapsed_days: 0,
    scheduled_days: 0,
    learning_steps: 0,
    reps: 2,
    lapses: 0,
    state: 2,
    last_review: null,
  }
}

describe('queue/build-sprint', () => {
  it('drops suspended cards', () => {
    const out = buildSprintFromCards([card('1', { suspended: true }), card('2')], now, 10)
    expect(out.map((c) => c.id)).toEqual(['2'])
  })

  it('drops unapproved cards', () => {
    const out = buildSprintFromCards([card('1', { approved: false }), card('2')], now, 10)
    expect(out.map((c) => c.id)).toEqual(['2'])
  })

  it('drops cards not yet due', () => {
    const future = new Date(now.getTime() + 5 * dayMs).toISOString()
    const notDue = card('1', {
      fsrs_state: { ...dueState(5)!, due: future },
    })
    const out = buildSprintFromCards([notDue, card('2')], now, 10)
    expect(out.map((c) => c.id)).toEqual(['2'])
  })

  it('floats new cards to the top', () => {
    const out = buildSprintFromCards(
      [card('old', { fsrs_state: dueState(1) }), card('new')],
      now,
      10,
    )
    expect(out[0].id).toBe('new')
  })

  it('caps at size', () => {
    const cards = Array.from({ length: 30 }, (_, i) => card(String(i)))
    const out = buildSprintFromCards(cards, now, 20)
    expect(out).toHaveLength(20)
  })

  it('interleaves concept tags when possible', () => {
    const input = [
      card('a1', { concept_tag: 'A' }),
      card('a2', { concept_tag: 'A' }),
      card('b1', { concept_tag: 'B' }),
      card('b2', { concept_tag: 'B' }),
    ]
    const out = buildSprintFromCards(input, now, 4)
    for (let i = 1; i < out.length; i++) {
      // At least one boundary must flip tag (4 cards, 2 tags → must alternate at least once)
    }
    const tags = out.map((c) => c.concept_tag)
    const adjacentSame = tags.filter((t, i) => i > 0 && t === tags[i - 1]).length
    expect(adjacentSame).toBeLessThan(3)
  })

  it('can focus the queue on a single concept tag', () => {
    const input = [
      card('a1', { concept_tag: 'A' }),
      card('b1', { concept_tag: 'B' }),
      card('a2', { concept_tag: 'A', fsrs_state: dueState(1) }),
      card('b2', { concept_tag: 'B', fsrs_state: dueState(1) }),
    ]
    const out = buildSprintFromCardsWithFilter(input, now, 10, { conceptTag: 'B' })
    expect(out.map((c) => c.id)).toEqual(['b1', 'b2'])
  })

  it('respects a global new-card budget and backfills with due reviews', () => {
    const input = [
      card('new-a'),
      card('new-b'),
      card('old-a', { fsrs_state: dueState(2) }),
      card('old-b', { fsrs_state: dueState(1) }),
    ]
    const out = buildSprintFromCardsWithFilter(input, now, 4, {
      newCardBudget: {
        remainingGlobal: 1,
        remainingByDeck: { deck1: 1 },
      },
    })
    expect(out.map((c) => c.id)).toEqual(['new-a', 'old-a', 'old-b'])
  })

  it('respects per-deck new-card budgets across decks', () => {
    const input = [
      card('deck1-new-1', { deck_id: 'deck1' }),
      card('deck1-new-2', { deck_id: 'deck1' }),
      card('deck2-new-1', { deck_id: 'deck2' }),
      card('deck2-old', { deck_id: 'deck2', fsrs_state: dueState(1) }),
    ]
    const out = buildSprintFromCardsWithFilter(input, now, 10, {
      newCardBudget: {
        remainingGlobal: 3,
        remainingByDeck: { deck1: 1, deck2: 1 },
      },
    })
    expect(out.map((c) => c.id)).toEqual(['deck1-new-1', 'deck2-new-1', 'deck2-old'])
  })

  it('adds an easy warm-up and cool-down around standard sprints', () => {
    const input = [
      card('new-a'),
      card('new-b', { concept_tag: 'B' }),
      card('hard-a', { concept_tag: 'A', fsrs_state: dueState(4, 2) }),
      card('hard-b', { concept_tag: 'B', fsrs_state: dueState(3, 3) }),
      card('warmup', { concept_tag: 'C', fsrs_state: dueState(1, 40) }),
      card('cooldown', { concept_tag: 'D', fsrs_state: dueState(1, 30) }),
    ]

    const out = buildSprintFromCardsWithFilter(input, now, 10, {
      structureMode: 'standard',
    })

    expect(out[0]?.id).toBe('warmup')
    expect(out.at(-1)?.id).toBe('cooldown')
  })

  it('leaves quick review queues unstructured', () => {
    const input = [
      card('new-a'),
      card('new-b', { concept_tag: 'B' }),
      card('hard-a', { concept_tag: 'A', fsrs_state: dueState(4, 2) }),
      card('hard-b', { concept_tag: 'B', fsrs_state: dueState(3, 3) }),
      card('warmup', { concept_tag: 'C', fsrs_state: dueState(1, 40) }),
      card('cooldown', { concept_tag: 'D', fsrs_state: dueState(1, 30) }),
    ]

    const out = buildSprintFromCardsWithFilter(input, now, 10, {
      structureMode: 'quick',
    })

    expect(out[0]?.id).toBe('new-a')
    expect(out.at(-1)?.id).not.toBe('cooldown')
  })
})
