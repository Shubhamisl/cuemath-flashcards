import { describe, it, expect } from 'vitest'
import { computeDeckStats, type StatCard } from './deck-stats'

const now = new Date('2026-04-24T12:00:00.000Z')
const dayMs = 86400000

function c(overrides: Partial<StatCard>): StatCard {
  return { fsrs_state: null, suspended: false, ...overrides }
}

function state(stability: number, dueOffsetDays: number) {
  return {
    due: new Date(now.getTime() + dueOffsetDays * dayMs).toISOString(),
    stability,
  }
}

describe('progress/deck-stats', () => {
  it('empty deck → Curious, 0% mastery, 0 due, 0 active', () => {
    expect(computeDeckStats([], now)).toEqual({
      tier: 'Curious',
      masteryPct: 0,
      dueCount: 0,
      activeCount: 0,
    })
  })

  it('all new cards → Curious, 0% mastery, dueCount=active=total', () => {
    const cards = [c({}), c({}), c({})]
    const s = computeDeckStats(cards, now)
    expect(s.tier).toBe('Curious')
    expect(s.masteryPct).toBe(0)
    expect(s.dueCount).toBe(3)
    expect(s.activeCount).toBe(3)
  })

  it('suspended cards excluded from active count', () => {
    const cards = [c({ suspended: true }), c({})]
    expect(computeDeckStats(cards, now).activeCount).toBe(1)
  })

  it('mastery is continuous: each card contributes min(stability,30)/30, averaged', () => {
    const cards = [
      c({ fsrs_state: state(60, 5) }),   // capped 30 → 1.0
      c({ fsrs_state: state(10, 5) }),   // 10/30 ≈ 0.333
      c({ fsrs_state: state(45, -1) }),  // capped 30 → 1.0
      c({ fsrs_state: state(5, -2) }),   // 5/30 ≈ 0.167
    ]
    // (1 + 10/30 + 1 + 5/30) / 4 = 0.6249... → 62%
    expect(computeDeckStats(cards, now).masteryPct).toBe(62)
  })

  it('fresh card with stability 3d nudges mastery above 0', () => {
    const s = computeDeckStats([c({ fsrs_state: state(3, 1) })], now)
    // 3/30 = 0.1 → 10%
    expect(s.masteryPct).toBe(10)
  })

  it('tier boundaries follow spec', () => {
    const mk = (st: number) => c({ fsrs_state: state(st, -1) })
    expect(computeDeckStats([mk(5)], now).tier).toBe('Curious')
    expect(computeDeckStats([mk(10)], now).tier).toBe('Practicing')
    expect(computeDeckStats([mk(30)], now).tier).toBe('Confident')
    expect(computeDeckStats([mk(90)], now).tier).toBe('SharpMind')
  })

  it('dueCount counts cards with null state OR due ≤ now, active only', () => {
    const cards = [
      c({}),                                        // new → due
      c({ fsrs_state: state(10, -1) }),             // overdue
      c({ fsrs_state: state(10, 5) }),              // future
      c({ fsrs_state: state(10, -1), suspended: true }), // overdue but suspended
    ]
    expect(computeDeckStats(cards, now).dueCount).toBe(2)
  })
})
