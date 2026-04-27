import { describe, expect, it } from 'vitest'
import { resolveNewCardCaps } from './new-card-caps'

describe('queue/new-card-caps', () => {
  it('falls back to the existing conservative cap when no explicit limit is set', () => {
    expect(resolveNewCardCaps({ dailyGoalCards: 20, dailyNewCardsLimit: null })).toEqual({
      global: 10,
      perDeck: 5,
    })
  })

  it('uses the explicit daily new-card limit when provided', () => {
    expect(resolveNewCardCaps({ dailyGoalCards: 20, dailyNewCardsLimit: 6 })).toEqual({
      global: 6,
      perDeck: 5,
    })
  })

  it('clamps extreme values into a sane range', () => {
    expect(resolveNewCardCaps({ dailyGoalCards: 40, dailyNewCardsLimit: 50 })).toEqual({
      global: 20,
      perDeck: 5,
    })
    expect(resolveNewCardCaps({ dailyGoalCards: 1, dailyNewCardsLimit: 0 })).toEqual({
      global: 1,
      perDeck: 1,
    })
  })
})
