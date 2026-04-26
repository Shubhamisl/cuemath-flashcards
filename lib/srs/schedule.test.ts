import { describe, it, expect } from 'vitest'
import { FSRS, generatorParameters, Rating, type Card as FsrsCard } from 'ts-fsrs'
import { initialState, schedule, type FsrsCardState } from './schedule'

const t0 = new Date('2026-04-24T00:00:00.000Z')
const msPerDay = 86400000
const fsrs = new FSRS(generatorParameters())

function toFsrs(state: FsrsCardState): FsrsCard {
  return {
    due: new Date(state.due),
    stability: state.stability,
    difficulty: state.difficulty,
    elapsed_days: state.elapsed_days,
    scheduled_days: state.scheduled_days,
    learning_steps: state.learning_steps,
    reps: state.reps,
    lapses: state.lapses,
    state: state.state,
    last_review: state.last_review ? new Date(state.last_review) : undefined,
  } as FsrsCard
}

function fromFsrs(card: FsrsCard): FsrsCardState {
  return {
    due: card.due.toISOString(),
    stability: card.stability,
    difficulty: card.difficulty,
    elapsed_days: card.elapsed_days,
    scheduled_days: card.scheduled_days,
    learning_steps: (card as FsrsCard & { learning_steps?: number }).learning_steps ?? 0,
    reps: card.reps,
    lapses: card.lapses,
    state: card.state,
    last_review: card.last_review ? card.last_review.toISOString() : null,
  }
}

function hashString(input: string): number {
  let hash = 0
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash * 31 + input.charCodeAt(i)) >>> 0
  }
  return hash
}

function intervalDaysFromDue(due: string | Date, now: Date): number {
  const dueDate = typeof due === 'string' ? new Date(due) : due
  return Math.max(0, Math.round((dueDate.getTime() - now.getTime()) / msPerDay))
}

function expectedFuzzedInterval(state: FsrsCardState, now: Date): number {
  const baseIntervalDays = intervalDaysFromDue(state.due, now)
  const windowDays = Math.min(3, Math.max(1, Math.round(baseIntervalDays * 0.15)))
  const seed = [
    state.due,
    state.stability.toFixed(4),
    state.difficulty.toFixed(4),
    String(state.reps),
    String(state.lapses),
    String(state.scheduled_days),
  ].join('|')
  const offset = (hashString(seed) % (windowDays * 2 + 1)) - windowDays
  return Math.max(1, baseIntervalDays + offset)
}

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

  it('adds a deterministic fuzz window for mature review cards', () => {
    const matureState: FsrsCardState = {
      due: '2026-04-24T00:00:00.000Z',
      stability: 28,
      difficulty: 5.2,
      elapsed_days: 14,
      scheduled_days: 14,
      learning_steps: 0,
      reps: 9,
      lapses: 1,
      state: 2,
      last_review: '2026-04-10T00:00:00.000Z',
    }

    const rawRecord = fsrs.next(toFsrs(matureState), t0, Rating.Good)
    const rawNext = fromFsrs(rawRecord.card)
    const rawIntervalDays = intervalDaysFromDue(rawNext.due, t0)
    const expectedIntervalDays = expectedFuzzedInterval(rawNext, t0)

    expect(rawNext.state).toBe(2)
    expect(rawIntervalDays).toBeGreaterThanOrEqual(7)
    expect(rawNext.stability).toBeGreaterThanOrEqual(14)
    expect(expectedIntervalDays).not.toBe(rawIntervalDays)

    const res = schedule(matureState, 3, t0)

    expect(res.intervalDays).toBe(expectedIntervalDays)
    expect(res.nextState.scheduled_days).toBe(expectedIntervalDays)
    expect(res.dueDate.toISOString()).toBe(
      new Date(t0.getTime() + expectedIntervalDays * msPerDay).toISOString(),
    )
  })

  it('leaves short-interval review cards on the raw FSRS schedule', () => {
    const shortIntervalState: FsrsCardState = {
      due: '2026-04-24T00:00:00.000Z',
      stability: 5,
      difficulty: 5.5,
      elapsed_days: 2,
      scheduled_days: 2,
      learning_steps: 0,
      reps: 3,
      lapses: 0,
      state: 2,
      last_review: '2026-04-22T00:00:00.000Z',
    }

    const rawRecord = fsrs.next(toFsrs(shortIntervalState), t0, Rating.Good)
    const rawNext = fromFsrs(rawRecord.card)

    const res = schedule(shortIntervalState, 3, t0)

    expect(res.nextState.due).toBe(rawNext.due)
    expect(res.nextState.scheduled_days).toBe(rawNext.scheduled_days)
    expect(res.intervalDays).toBe(intervalDaysFromDue(rawNext.due, t0))
  })
})
