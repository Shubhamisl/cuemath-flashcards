import { FSRS, generatorParameters, createEmptyCard, Rating, type Card as FsrsCard, type Grade } from 'ts-fsrs'

export type FsrsRating = 1 | 2 | 3 | 4

export type FsrsCardState = {
  due: string                 // ISO
  stability: number
  difficulty: number
  elapsed_days: number
  scheduled_days: number
  learning_steps: number
  reps: number
  lapses: number
  state: number               // 0 New | 1 Learning | 2 Review | 3 Relearning
  last_review: string | null  // ISO or null
}

export type ScheduleResult = {
  nextState: FsrsCardState
  dueDate: Date
  intervalDays: number
}

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

function fromFsrs(c: FsrsCard): FsrsCardState {
  return {
    due: c.due.toISOString(),
    stability: c.stability,
    difficulty: c.difficulty,
    elapsed_days: c.elapsed_days,
    scheduled_days: c.scheduled_days,
    learning_steps: (c as FsrsCard & { learning_steps?: number }).learning_steps ?? 0,
    reps: c.reps,
    lapses: c.lapses,
    state: c.state,
    last_review: c.last_review ? c.last_review.toISOString() : null,
  }
}

export function initialState(): FsrsCardState {
  return fromFsrs(createEmptyCard(new Date(0)))
}

export function schedule(state: FsrsCardState, rating: FsrsRating, now: Date): ScheduleResult {
  const ratingMap: Record<FsrsRating, Grade> = {
    1: Rating.Again,
    2: Rating.Hard,
    3: Rating.Good,
    4: Rating.Easy,
  }
  const record = fsrs.next(toFsrs(state), now, ratingMap[rating])
  const next = fromFsrs(record.card)
  const dueDate = new Date(next.due)
  const intervalDays = Math.max(
    0,
    Math.round((dueDate.getTime() - now.getTime()) / 86400000),
  )
  return { nextState: next, dueDate, intervalDays }
}
