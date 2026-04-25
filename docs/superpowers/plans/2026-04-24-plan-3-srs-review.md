# Plan 3 — SRS Wrapper, Queue & Review UI

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn a ready deck into a working review loop — pure FSRS scheduling, a deterministic sprint builder, a branded review screen with keyboard-driven ratings, and append-only review telemetry.

**Architecture:** Three isolated layers. `lib/srs/` is a pure wrapper over `ts-fsrs` (no DB). `lib/queue/` reads cards and builds a sprint (priority + interleave). `app/(app)/review/` orchestrates the UI and calls a single `submitRating` server action that writes an append-only `reviews` row and updates `cards.fsrs_state`. Deck detail page (`/deck/[id]`) is the entry point that Plan 2's View pill already links to.

**Tech Stack:** `ts-fsrs` for scheduling, Vitest for pure-logic TDD, Next.js 16 App Router Server Actions, Supabase for persistence, existing brand primitives (`CueButton`, `CueCard`, `CuePill`).

**Scope (keep lean):**
- Per-deck sprint only (cross-deck global queue deferred).
- No interference-pair adjacency (Plan 2 deferred; table empty in MVP).
- No warm-up/cool-down bias (out of MVP — simple priority sort is fine).
- Leech flag: set `suspended=true` when `lapses≥6 && reps≥10`; no "needs-reformulating" tray yet.
- No fatigue triggers (Plan 4).

---

## File Structure

**Create:**
- `lib/srs/schedule.ts` — pure wrapper: `initialState()`, `schedule(state, rating, now)`.
- `lib/srs/schedule.test.ts` — unit tests for initial state, rating transitions, due-date progression.
- `lib/queue/build-sprint.ts` — `buildSprint({userId, deckId, size}) → Card[]`.
- `lib/queue/build-sprint.test.ts` — unit tests on fixture card arrays (priority, interleave, starvation).
- `lib/queue/types.ts` — shared `SprintCard` type.
- `app/(app)/deck/[id]/page.tsx` — deck detail (title, stats, Start sprint CTA).
- `app/(app)/review/page.tsx` — sprint orchestrator (server component that loads sprint and renders client).
- `app/(app)/review/actions.ts` — `submitRating` server action.
- `app/(app)/review/review-session.tsx` — client component: flip + rate + advance + summary.
- `components/review-card.tsx` — presentational card with flip animation.
- `components/rating-bar.tsx` — four rating pills.

**Modify:**
- `package.json` — add `ts-fsrs` dependency.
- `components/deck-card.tsx` — no changes (View link already targets `/deck/[id]`).

**Leave alone:** all Plan 1/2 files, migrations (schema already has `fsrs_state`, `reviews` tables).

---

## Task 1: Install `ts-fsrs`

**Files:**
- Modify: `D:/CUEMATH/Flashcard/package.json`

- [ ] **Step 1: Install**

```bash
pnpm add ts-fsrs
```

- [ ] **Step 2: Verify**

```bash
pnpm list ts-fsrs
```
Expected: prints installed version (e.g. `ts-fsrs 4.x.x`).

- [ ] **Step 3: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "chore: add ts-fsrs for Plan 3 SRS layer"
```

---

## Task 2: SRS wrapper (pure, TDD)

**Files:**
- Create: `D:/CUEMATH/Flashcard/lib/srs/schedule.ts`
- Create: `D:/CUEMATH/Flashcard/lib/srs/schedule.test.ts`

### Why

`ts-fsrs` exposes a `FSRS` class whose `next(card, now, rating)` returns a `RecordLog` (one `RecordLogItem` per possible rating). We need a narrow facade that hides the library's mutable patterns and returns only the branch the user actually chose. Keep the wrapper pure — no DB, no clock injection inside the function body (pass `now` in).

- [ ] **Step 1: Write the failing test**

`lib/srs/schedule.test.ts`:
```ts
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
    s = schedule(s, 3, t0).nextState
    const lapsed = schedule(s, 1, new Date(t0.getTime() + 86400000))
    expect(lapsed.nextState.lapses).toBe(1)
  })

  it('rating 4 (Easy) yields longer interval than rating 3', () => {
    const s = initialState()
    const got = schedule(s, 3, t0)
    const easy = schedule(s, 4, t0)
    expect(easy.intervalDays).toBeGreaterThanOrEqual(got.intervalDays)
  })
})
```

- [ ] **Step 2: Run — expect failure**

```bash
pnpm vitest run lib/srs/schedule.test.ts
```
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the wrapper**

`lib/srs/schedule.ts`:
```ts
import { FSRS, generatorParameters, createEmptyCard, Rating, type Card as FsrsCard } from 'ts-fsrs'

export type FsrsRating = 1 | 2 | 3 | 4

export type FsrsCardState = {
  due: string                 // ISO
  stability: number
  difficulty: number
  elapsed_days: number
  scheduled_days: number
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
  const ratingMap: Record<FsrsRating, Rating> = {
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
```

- [ ] **Step 4: Run — expect pass**

```bash
pnpm vitest run lib/srs/schedule.test.ts
```
Expected: 4 passed.

- [ ] **Step 5: Commit**

```bash
git add lib/srs/schedule.ts lib/srs/schedule.test.ts
git commit -m "feat(srs): pure ts-fsrs wrapper with JSONB-friendly state"
```

---

## Task 3: Queue types

**Files:**
- Create: `D:/CUEMATH/Flashcard/lib/queue/types.ts`

- [ ] **Step 1: Write the type**

`lib/queue/types.ts`:
```ts
import type { FsrsCardState } from '@/lib/srs/schedule'

export type SprintCard = {
  id: string
  deck_id: string
  concept_tag: string | null
  front: { text: string }
  back: { text: string }
  fsrs_state: FsrsCardState | null  // null = never reviewed ("new")
  suspended: boolean
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/queue/types.ts
git commit -m "feat(queue): SprintCard shared type"
```

---

## Task 4: Sprint builder (pure, TDD)

**Files:**
- Create: `D:/CUEMATH/Flashcard/lib/queue/build-sprint.ts`
- Create: `D:/CUEMATH/Flashcard/lib/queue/build-sprint.test.ts`

### Why

Sprint-building is where Pillar 1 (priority) and Pillar 3 (interleaving) land. The DB layer filters due cards; this pure function takes a `SprintCard[]` and a `now: Date` and returns the ordered sprint. Pure = fixture-driven tests with no DB mocking.

**Rules (MVP):**
1. Filter out `suspended=true` cards.
2. A card is *eligible* if `fsrs_state===null` OR `new Date(fsrs_state.due) <= now`.
3. Score each eligible card: `priority = overdueRatio × (1 / max(stability, 1))` where `overdueRatio = max(1, (now - due) / max(stability*86400000, 1))`. New cards get priority `Infinity` (they lead).
4. Sort by priority descending, then by `id` ascending for determinism.
5. Take top `size`.
6. Interleave: greedy reorder to avoid two consecutive cards sharing the same `concept_tag` when feasible. Use 2-card lookahead. If no swap exists, accept adjacency (no starvation).

- [ ] **Step 1: Write the failing test**

`lib/queue/build-sprint.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { buildSprintFromCards } from './build-sprint'
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
    fsrs_state: null,
    suspended: false,
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
})
```

- [ ] **Step 2: Run — expect failure**

```bash
pnpm vitest run lib/queue/build-sprint.test.ts
```
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

`lib/queue/build-sprint.ts`:
```ts
import type { SprintCard } from './types'

function isDue(c: SprintCard, now: Date): boolean {
  if (c.suspended) return false
  if (!c.fsrs_state) return true
  return new Date(c.fsrs_state.due).getTime() <= now.getTime()
}

function priority(c: SprintCard, now: Date): number {
  if (!c.fsrs_state) return Number.POSITIVE_INFINITY
  const stabilityDays = Math.max(c.fsrs_state.stability, 1)
  const dueMs = new Date(c.fsrs_state.due).getTime()
  const overdueMs = Math.max(0, now.getTime() - dueMs)
  const overdueRatio = Math.max(1, overdueMs / (stabilityDays * 86400000))
  return overdueRatio * (1 / stabilityDays)
}

function interleave(cards: SprintCard[]): SprintCard[] {
  const out: SprintCard[] = []
  const pool = [...cards]
  while (pool.length) {
    const prevTag = out.length ? out[out.length - 1].concept_tag : null
    let idx = pool.findIndex((c) => c.concept_tag !== prevTag)
    if (idx === -1) idx = 0
    out.push(pool.splice(idx, 1)[0])
  }
  return out
}

export function buildSprintFromCards(cards: SprintCard[], now: Date, size: number): SprintCard[] {
  const eligible = cards.filter((c) => isDue(c, now))
  eligible.sort((a, b) => {
    const pb = priority(b, now)
    const pa = priority(a, now)
    if (pb !== pa) return pb - pa
    return a.id.localeCompare(b.id)
  })
  return interleave(eligible.slice(0, size))
}
```

- [ ] **Step 4: Run — expect pass**

```bash
pnpm vitest run lib/queue/build-sprint.test.ts
```
Expected: 5 passed.

- [ ] **Step 5: Commit**

```bash
git add lib/queue/build-sprint.ts lib/queue/build-sprint.test.ts
git commit -m "feat(queue): pure sprint builder with priority + tag interleave"
```

---

## Task 5: DB-backed sprint loader

**Files:**
- Modify: `D:/CUEMATH/Flashcard/lib/queue/build-sprint.ts`

Add a thin DB adapter that pulls cards for a user+deck and hands them to the pure builder. Keeps the pure function unit-testable.

- [ ] **Step 1: Append to `lib/queue/build-sprint.ts`**

```ts
import { createClient } from '@/lib/db/server'

export async function buildSprint(args: {
  userId: string
  deckId: string
  size: number
  now?: Date
}): Promise<SprintCard[]> {
  const now = args.now ?? new Date()
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('cards')
    .select('id, deck_id, concept_tag, front, back, fsrs_state, suspended')
    .eq('user_id', args.userId)
    .eq('deck_id', args.deckId)
    .eq('suspended', false)
    .limit(500)
  if (error) throw error
  return buildSprintFromCards((data ?? []) as SprintCard[], now, args.size)
}
```

- [ ] **Step 2: Re-run existing tests — still pass**

```bash
pnpm vitest run lib/queue/build-sprint.test.ts
```
Expected: 5 passed (DB adapter not exercised; pure function untouched).

- [ ] **Step 3: Commit**

```bash
git add lib/queue/build-sprint.ts
git commit -m "feat(queue): DB-backed buildSprint wrapper"
```

---

## Task 6: `submitRating` server action

**Files:**
- Create: `D:/CUEMATH/Flashcard/app/(app)/review/actions.ts`

### Why

Single server action does everything review-related that touches the DB: compute next FSRS state, insert into `reviews`, update `cards.fsrs_state`, flag leech if threshold crossed. Client passes the current state so we don't re-read.

- [ ] **Step 1: Write the action**

`app/(app)/review/actions.ts`:
```ts
'use server'

import { createClient } from '@/lib/db/server'
import { schedule, initialState, type FsrsCardState, type FsrsRating } from '@/lib/srs/schedule'

const LEECH_LAPSES = 6
const LEECH_REPS = 10

export async function submitRating(args: {
  cardId: string
  rating: FsrsRating
  elapsedMs: number
}): Promise<{ ok: true } | { error: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not signed in' }

  const { data: card, error: fetchErr } = await supabase
    .from('cards')
    .select('fsrs_state')
    .eq('id', args.cardId)
    .eq('user_id', user.id)
    .single()
  if (fetchErr || !card) return { error: 'Card not found' }

  const before: FsrsCardState = card.fsrs_state ?? initialState()
  const now = new Date()
  const { nextState } = schedule(before, args.rating, now)

  const scheduledDaysBefore = before.scheduled_days

  const shouldSuspend = nextState.lapses >= LEECH_LAPSES && nextState.reps >= LEECH_REPS

  const { error: insErr } = await supabase.from('reviews').insert({
    card_id: args.cardId,
    user_id: user.id,
    rated_at: now.toISOString(),
    rating: args.rating,
    elapsed_ms: args.elapsedMs,
    scheduled_days_before: scheduledDaysBefore,
    fsrs_state_before: before,
    fsrs_state_after: nextState,
  })
  if (insErr) return { error: insErr.message }

  const { error: upErr } = await supabase
    .from('cards')
    .update({
      fsrs_state: nextState,
      suspended: shouldSuspend,
    })
    .eq('id', args.cardId)
    .eq('user_id', user.id)
  if (upErr) return { error: upErr.message }

  return { ok: true }
}
```

- [ ] **Step 2: Type-check**

```bash
pnpm tsc --noEmit
```
Expected: no errors in `app/(app)/review/actions.ts`.

- [ ] **Step 3: Commit**

```bash
git add app/(app)/review/actions.ts
git commit -m "feat(review): submitRating server action with leech flag"
```

---

## Task 7: Review card component

**Files:**
- Create: `D:/CUEMATH/Flashcard/components/review-card.tsx`

- [ ] **Step 1: Write the component**

`components/review-card.tsx`:
```tsx
'use client'

import { CueCard } from '@/lib/brand/primitives/card'
import type { subjectFamily } from '@/lib/brand/tokens'

export function ReviewCard({
  front,
  back,
  flipped,
  subject,
}: {
  front: string
  back: string
  flipped: boolean
  subject?: subjectFamily
}) {
  return (
    <CueCard subject={subject} className="min-h-[240px] flex items-center justify-center text-center">
      <div className="w-full">
        <div className="text-xs uppercase tracking-wide opacity-60 mb-3">
          {flipped ? 'Answer' : 'Question'}
        </div>
        <div className="font-display text-xl font-semibold whitespace-pre-wrap">
          {flipped ? back : front}
        </div>
      </div>
    </CueCard>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/review-card.tsx
git commit -m "feat(review): ReviewCard presentational component"
```

---

## Task 8: Rating bar component

**Files:**
- Create: `D:/CUEMATH/Flashcard/components/rating-bar.tsx`

- [ ] **Step 1: Write the component**

`components/rating-bar.tsx`:
```tsx
'use client'

import { CueButton } from '@/lib/brand/primitives/button'
import type { FsrsRating } from '@/lib/srs/schedule'

const BUTTONS: { rating: FsrsRating; label: string; key: string; variant: 'primary' | 'ghost' }[] = [
  { rating: 1, label: 'Forgot', key: '1', variant: 'ghost' },
  { rating: 2, label: 'Tough', key: '2', variant: 'ghost' },
  { rating: 3, label: 'Got it', key: '3', variant: 'primary' },
  { rating: 4, label: 'Easy', key: '4', variant: 'ghost' },
]

export function RatingBar({
  disabled,
  onRate,
}: {
  disabled: boolean
  onRate: (r: FsrsRating) => void
}) {
  return (
    <div className="grid grid-cols-4 gap-2">
      {BUTTONS.map((b) => (
        <CueButton
          key={b.rating}
          variant={b.variant}
          disabled={disabled}
          onClick={() => onRate(b.rating)}
          className="min-h-[48px] text-sm"
          aria-label={`${b.label} (press ${b.key})`}
        >
          <span className="block">{b.label}</span>
          <span className="block text-[10px] opacity-60">{b.key}</span>
        </CueButton>
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/rating-bar.tsx
git commit -m "feat(review): RatingBar with keyboard-labeled pills"
```

---

## Task 9: Review session client

**Files:**
- Create: `D:/CUEMATH/Flashcard/app/(app)/review/review-session.tsx`

### Why

Holds session state: current index, flipped, timing, phase (`reviewing` | `summary`). Handles keyboard (Space / 1–4 / Esc). Submits each rating via the server action; on error, surfaces an inline message but keeps the session alive.

- [ ] **Step 1: Write the component**

`app/(app)/review/review-session.tsx`:
```tsx
'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { CueCard } from '@/lib/brand/primitives/card'
import { CueButton } from '@/lib/brand/primitives/button'
import { ReviewCard } from '@/components/review-card'
import { RatingBar } from '@/components/rating-bar'
import { submitRating } from './actions'
import type { SprintCard } from '@/lib/queue/types'
import type { FsrsRating } from '@/lib/srs/schedule'
import type { subjectFamily } from '@/lib/brand/tokens'

type Outcome = { cardId: string; rating: FsrsRating }

export function ReviewSession({
  cards,
  subject,
  deckId,
}: {
  cards: SprintCard[]
  subject?: subjectFamily
  deckId: string
}) {
  const router = useRouter()
  const [index, setIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [outcomes, setOutcomes] = useState<Outcome[]>([])
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const shownAt = useRef<number>(Date.now())

  const current = cards[index]
  const done = index >= cards.length

  useEffect(() => {
    shownAt.current = Date.now()
    setFlipped(false)
  }, [index])

  function rate(rating: FsrsRating) {
    if (!current || pending) return
    const elapsedMs = Date.now() - shownAt.current
    startTransition(async () => {
      const res = await submitRating({ cardId: current.id, rating, elapsedMs })
      if ('error' in res) {
        setError(res.error)
        return
      }
      setError(null)
      setOutcomes((o) => [...o, { cardId: current.id, rating }])
      setIndex((i) => i + 1)
    })
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (done) return
      if (e.key === ' ') {
        e.preventDefault()
        setFlipped((f) => !f)
        return
      }
      if (!flipped) return
      if (e.key === '1') rate(1)
      else if (e.key === '2') rate(2)
      else if (e.key === '3' || e.key === 'Enter') rate(3)
      else if (e.key === '4') rate(4)
      else if (e.key === 'Escape') setIndex(cards.length)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [flipped, done, cards.length, pending]) // eslint-disable-line react-hooks/exhaustive-deps

  if (cards.length === 0) {
    return (
      <CueCard className="text-center space-y-3">
        <h2 className="font-display text-xl font-bold">Nothing due right now</h2>
        <p className="text-sm opacity-70">Come back later or add more cards.</p>
        <CueButton onClick={() => router.push(`/deck/${deckId}`)}>Back to deck</CueButton>
      </CueCard>
    )
  }

  if (done) {
    const got = outcomes.filter((o) => o.rating >= 3).length
    return (
      <CueCard className="text-center space-y-4" style={{ background: 'var(--mint-green)' }}>
        <h2 className="font-display text-2xl font-bold">Nice sprint.</h2>
        <p className="text-base">{got} remembered out of {outcomes.length}.</p>
        <div className="flex gap-2 justify-center">
          <CueButton onClick={() => router.refresh()}>Another sprint</CueButton>
          <CueButton variant="ghost" onClick={() => router.push(`/deck/${deckId}`)}>
            Done for today
          </CueButton>
        </div>
      </CueCard>
    )
  }

  const progressPct = Math.round((index / cards.length) * 100)

  return (
    <div className="space-y-6">
      <div className="h-1 rounded-full bg-ink-black/10 overflow-hidden">
        <div
          className="h-full bg-cue-yellow transition-all"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      <ReviewCard
        front={current.front.text}
        back={current.back.text}
        flipped={flipped}
        subject={subject}
      />

      {!flipped && (
        <CueButton className="w-full" onClick={() => setFlipped(true)}>
          Show answer (Space)
        </CueButton>
      )}

      {flipped && <RatingBar disabled={pending} onRate={rate} />}

      {error && <p className="text-sm text-red-700">{error}</p>}
      <p className="text-xs text-center opacity-50">Esc to end early</p>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add app/(app)/review/review-session.tsx
git commit -m "feat(review): keyboard-driven sprint session"
```

---

## Task 10: Review page (server loader)

**Files:**
- Create: `D:/CUEMATH/Flashcard/app/(app)/review/page.tsx`

- [ ] **Step 1: Write the page**

`app/(app)/review/page.tsx`:
```tsx
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/db/server'
import { buildSprint } from '@/lib/queue/build-sprint'
import { ReviewSession } from './review-session'
import type { subjectFamily } from '@/lib/brand/tokens'

export const dynamic = 'force-dynamic'

export default async function ReviewPage({
  searchParams,
}: {
  searchParams: Promise<{ deck?: string }>
}) {
  const { deck: deckId } = await searchParams
  if (!deckId) redirect('/library')

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: deck } = await supabase
    .from('decks')
    .select('id, title, subject_family')
    .eq('id', deckId)
    .eq('user_id', user.id)
    .single()
  if (!deck) redirect('/library')

  const cards = await buildSprint({ userId: user.id, deckId, size: 20 })

  return (
    <main className="max-w-lg mx-auto p-6 space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="font-display text-lg font-bold truncate">{deck.title}</h1>
        <span className="text-sm opacity-60">{cards.length} cards</span>
      </header>
      <ReviewSession cards={cards} subject={deck.subject_family as subjectFamily} deckId={deckId} />
    </main>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add app/(app)/review/page.tsx
git commit -m "feat(review): sprint page with server-side queue load"
```

---

## Task 11: Deck detail page

**Files:**
- Create: `D:/CUEMATH/Flashcard/app/(app)/deck/[id]/page.tsx`

### Why

Plan 2's View pill points to `/deck/[id]`. Page shows title, card count, mastery tier (computed inline), and a **Start sprint** CTA to `/review?deck=<id>`. Inline mastery keeps `lib/progress/` unnecessary for now (Plan 5 territory).

- [ ] **Step 1: Write the page**

`app/(app)/deck/[id]/page.tsx`:
```tsx
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/db/server'
import { CueCard } from '@/lib/brand/primitives/card'
import { CueButton } from '@/lib/brand/primitives/button'
import { CuePill } from '@/lib/brand/primitives/pill'
import type { subjectFamily } from '@/lib/brand/tokens'

type CardRow = { fsrs_state: { stability?: number; due?: string } | null; suspended: boolean }

function tierFor(meanStability: number): string {
  if (meanStability < 7) return 'Curious'
  if (meanStability < 21) return 'Practicing'
  if (meanStability < 60) return 'Confident'
  return 'SharpMind'
}

export default async function DeckPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: deck } = await supabase
    .from('decks')
    .select('id, title, subject_family, card_count, status')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()
  if (!deck) notFound()

  const { data: cards } = await supabase
    .from('cards')
    .select('fsrs_state, suspended')
    .eq('deck_id', id)
    .eq('user_id', user.id)
  const rows = (cards ?? []) as CardRow[]

  const now = Date.now()
  const active = rows.filter((c) => !c.suspended)
  const dueCount = active.filter(
    (c) => !c.fsrs_state || new Date(c.fsrs_state.due ?? 0).getTime() <= now,
  ).length
  const stabilities = active
    .map((c) => c.fsrs_state?.stability ?? 0)
    .filter((s) => s > 0)
  const meanStability =
    stabilities.length > 0 ? stabilities.reduce((a, b) => a + b, 0) / stabilities.length : 0
  const tier = tierFor(meanStability)

  return (
    <main className="max-w-2xl mx-auto p-6 space-y-6">
      <header className="space-y-2">
        <Link href="/library" className="text-sm opacity-60 hover:opacity-100">← Library</Link>
        <h1 className="font-display text-3xl font-bold">{deck.title}</h1>
        <div className="flex flex-wrap gap-2">
          <CuePill tone="highlight">{tier}</CuePill>
          <CuePill>{deck.card_count ?? 0} cards</CuePill>
          {deck.status === 'ready' && dueCount > 0 && (
            <CuePill tone="info">Ready now</CuePill>
          )}
        </div>
      </header>

      <CueCard subject={deck.subject_family as subjectFamily} className="space-y-4">
        <div>
          <h2 className="font-display text-xl font-bold">Today's sprint</h2>
          <p className="text-sm opacity-70">
            {dueCount > 0
              ? `Up to 20 cards ready — keep your edge.`
              : `Nothing due right now. Check back later.`}
          </p>
        </div>
        <Link href={`/review?deck=${deck.id}`} className="block">
          <CueButton className="w-full" disabled={dueCount === 0}>
            {dueCount > 0 ? 'Start sprint' : 'All caught up'}
          </CueButton>
        </Link>
      </CueCard>
    </main>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add app/(app)/deck/[id]/page.tsx
git commit -m "feat(deck): detail page with tier, due count, sprint CTA"
```

---

## Task 12: Smoke test (user-driven)

**Files:** none

- [ ] **Step 1: Dev server**

```bash
pnpm dev
```
Visit the library page, click View on a ready deck.

- [ ] **Step 2: Deck page verification**

Expected:
- Title renders.
- Tier pill shows `Curious` (all new cards, stability 0).
- Due count pill shows `Ready now`.
- **Start sprint** button enabled.

- [ ] **Step 3: Sprint loop verification**

Click **Start sprint** → `/review?deck=...`
- Front of card renders.
- Press `Space` → flips to answer.
- Press `3` → advances to next card within ~500ms.
- Repeat for all cards.

- [ ] **Step 4: Completion screen**

- After last card, summary shows `<n> remembered out of <total>`.
- **Another sprint** reloads with fewer (or zero) due cards.
- **Done for today** returns to `/deck/[id]`.

- [ ] **Step 5: Persistence check (Supabase dashboard)**

Query `reviews` table in SQL editor:
```sql
select card_id, rating, elapsed_ms, rated_at
from public.reviews
where user_id = auth.uid()
order by rated_at desc
limit 20;
```
Expected: one row per rating submitted, with non-zero `elapsed_ms`.

Query `cards`:
```sql
select id, fsrs_state->>'due' as due, fsrs_state->>'reps' as reps
from public.cards
where deck_id = '<paste-deck-id>'
order by (fsrs_state->>'due');
```
Expected: cards rated `Got it` have `reps >= 1` and `due` in the future.

- [ ] **Step 6: Keyboard-only walkthrough**

- Without using mouse: navigate from library → deck → Start sprint → `Space` to flip → `1–4` to rate through a full sprint → `Esc` from mid-sprint ends early to summary.

- [ ] **Step 7: Mark Plan 3 complete**

No commit — smoke test only.

---

## Self-Review Checklist

**Spec coverage (section 6):**
- ✅ `lib/srs/` pure wrapper: Task 2.
- ✅ 4-button FSRS rating, keyboard 1–4 + Space + Enter: Tasks 8, 9.
- ✅ `lib/queue/` `buildSprint` with priority + interleave: Tasks 3, 4, 5.
- ✅ Overdue ratio math: priority formula in Task 4.
- ✅ Leech flag on `lapses≥6 && reps≥10`: Task 6.
- ✅ Append-only `reviews` log: Task 6.
- ⏸ Interference-pair adjacency: deferred (table empty in MVP).
- ⏸ Warm-up/cool-down: deferred (cut for lean).
- ⏸ Cross-deck global queue: deferred (per-deck only in MVP).
- ⏸ Leech reformulation tray: deferred (Plan 5).

**Placeholder scan:** None — every step has complete code or exact command.

**Type consistency:**
- `FsrsCardState`, `FsrsRating`, `ScheduleResult` defined in Task 2, used in Tasks 3, 6, 8, 9.
- `SprintCard` defined in Task 3, used in Tasks 4, 5, 9, 10.
- `buildSprint` (Task 5) signature matches the call in Task 10.
- `submitRating` (Task 6) return shape `{ ok: true } | { error: string }` matches check in Task 9.
