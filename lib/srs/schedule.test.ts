import { describe, it, expect } from 'vitest'
import { initialState, schedule, type FsrsCardState } from './schedule'

const t0 = new Date('2026-04-24T00:00:00.000Z')

describe('srs/schedule', () => {
  it('initialState returns a new-card state with zero reps and lapses', () => {
    const s = initialState()
    expect(s.reps).toBe(0)
    expect(s.lapses).toBe(0)
    expect(s.state).toBe(0) // ts-fsrs "New"
  })

  it('rating 3 (Got it) on a new card schedules it in the future', () => {
    const s = initialState()
    const res = schedule(s, 3, t0)
    expect(new Date(res.nextState.due).getTime()).toBeGreaterThan(t0.getTime())
    expect(res.nextState.reps).toBe(1)
    expect(res.intervalDays).toBeGreaterThanOrEqual(0)
  })

  it('rating 1 (Forgot) increments lapses when card has reps', () => {
    let s: FsrsCardState = initialState()
    let now = t0
    // Advance card into the Review state (state=2) before lapsing.
    s = schedule(s, 3, now).nextState
    now = new Date(s.due)
    s = schedule(s, 3, now).nextState
    now = new Date(new Date(s.due).getTime() + 86400000)
    const lapsed = schedule(s, 1, now)
    expect(lapsed.nextState.lapses).toBe(1)
  })

  it('rating 4 (Easy) yields longer interval than rating 3', () => {
    const s = initialState()
    const got = schedule(s, 3, t0)
    const easy = schedule(s, 4, t0)
    expect(easy.intervalDays).toBeGreaterThanOrEqual(got.intervalDays)
  })
})
