# Plan 4 — Progress Projections & Fatigue-Aware Review

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn raw FSRS state into user-facing progress (mastery ring, SharpMind tier) on the library and deck pages, and make the review session fatigue-aware (inject-easy after accuracy drops, break prompt on slowdowns, hard sprint cap, session summary written to DB).

**Architecture:** Two pure modules, `lib/progress/` and `lib/fatigue/`, both DB-ignorant and TDD-first. Thin DB adapters where needed. UI consumes pure functions. `review-session.tsx` grows an effort-sensing hook that emits telemetry events and reacts to action outputs.

**Tech Stack:** Pure TypeScript + Vitest for `progress/` and `fatigue/`; existing brand primitives for UI; Supabase for `sessions` table writes.

**Scope (lean):**
- Mastery tier + mastery ring on library deck cards and deck detail page.
- Fatigue: inject-easy (2 mature cards) and prompt-break (mint panel, dismissible, once per sprint). Sprint hard cap at 20 cards OR 15 minutes.
- Session summary row written on end.
- **Deferred:** heatmap, predicted-retention, FSRS weight personalization, leech tray UI.

---

## File Structure

**Create:**
- `lib/progress/deck-stats.ts` — `computeDeckStats(cards, now)` → `{ tier, masteryPct, dueCount, activeCount }`.
- `lib/progress/deck-stats.test.ts` — unit tests.
- `components/mastery-ring.tsx` — SVG ring primitive driven by `masteryPct`.
- `lib/fatigue/observe.ts` — `observe(events) → { action }` pure logic.
- `lib/fatigue/observe.test.ts` — event-stream unit tests.
- `lib/fatigue/easy-cards.ts` — DB adapter: `fetchEasyCards(userId, excludeIds, n)`.
- `components/break-prompt.tsx` — mint-green dismissible panel.

**Modify:**
- `app/(app)/deck/[id]/page.tsx` — swap inline tier/due math for `computeDeckStats`; add `<MasteryRing />`.
- `app/(app)/library/page.tsx` — fetch per-deck stats, pass to `DeckCard`.
- `components/deck-card.tsx` — accept `masteryPct` + `tier`, render ring and tier pill.
- `app/(app)/review/review-session.tsx` — consume fatigue action, enforce 15-min cap, write session summary on end.
- `app/(app)/review/actions.ts` — add `finalizeSession` server action for writing to `sessions` table.

**Leave alone:** Plans 1–3 code outside the files above; migrations (schema already has `sessions` table).

---

## Task 1: `computeDeckStats` (pure, TDD)

**Files:**
- Create: `D:/CUEMATH/Flashcard/lib/progress/deck-stats.ts`
- Create: `D:/CUEMATH/Flashcard/lib/progress/deck-stats.test.ts`

### Why

Library + deck page both derive the same numbers (tier, mastery %, due count). Extract once, test once. Pure over `{fsrs_state, suspended}[]` so we can fixture-test without DB.

- [ ] **Step 1: Write the failing test**

`lib/progress/deck-stats.test.ts`:
```ts
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

  it('mastery = % of active cards with stability > 30d', () => {
    const cards = [
      c({ fsrs_state: state(60, 5) }),
      c({ fsrs_state: state(10, 5) }),
      c({ fsrs_state: state(45, -1) }),
      c({ fsrs_state: state(5, -2) }),
    ]
    expect(computeDeckStats(cards, now).masteryPct).toBe(50)
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
```

- [ ] **Step 2: Run — expect failure**

```bash
pnpm vitest run lib/progress/deck-stats.test.ts
```
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

`lib/progress/deck-stats.ts`:
```ts
export type StatCard = {
  fsrs_state: { due?: string; stability?: number } | null
  suspended: boolean
}

export type Tier = 'Curious' | 'Practicing' | 'Confident' | 'SharpMind'

export type DeckStats = {
  tier: Tier
  masteryPct: number
  dueCount: number
  activeCount: number
}

const MASTERY_STABILITY_DAYS = 30

function tierFor(meanStability: number): Tier {
  if (meanStability < 7) return 'Curious'
  if (meanStability < 21) return 'Practicing'
  if (meanStability < 60) return 'Confident'
  return 'SharpMind'
}

export function computeDeckStats(cards: StatCard[], now: Date): DeckStats {
  const active = cards.filter((c) => !c.suspended)
  if (active.length === 0) {
    return { tier: 'Curious', masteryPct: 0, dueCount: 0, activeCount: 0 }
  }

  const nowMs = now.getTime()
  const dueCount = active.filter((c) => {
    if (!c.fsrs_state?.due) return true
    return new Date(c.fsrs_state.due).getTime() <= nowMs
  }).length

  const mastered = active.filter(
    (c) => (c.fsrs_state?.stability ?? 0) > MASTERY_STABILITY_DAYS,
  ).length
  const masteryPct = Math.round((mastered / active.length) * 100)

  const stabilities = active
    .map((c) => c.fsrs_state?.stability ?? 0)
    .filter((s) => s > 0)
  const meanStability =
    stabilities.length > 0 ? stabilities.reduce((a, b) => a + b, 0) / stabilities.length : 0

  return {
    tier: tierFor(meanStability),
    masteryPct,
    dueCount,
    activeCount: active.length,
  }
}
```

- [ ] **Step 4: Run — expect pass**

```bash
pnpm vitest run lib/progress/deck-stats.test.ts
```
Expected: 6 passed.

---

## Task 2: `MasteryRing` SVG component

**Files:**
- Create: `D:/CUEMATH/Flashcard/components/mastery-ring.tsx`

- [ ] **Step 1: Write it**

`components/mastery-ring.tsx`:
```tsx
export function MasteryRing({
  pct,
  size = 40,
  stroke = 4,
  label,
}: {
  pct: number
  size?: number
  stroke?: number
  label?: string
}) {
  const clamped = Math.max(0, Math.min(100, pct))
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const dashOffset = circumference * (1 - clamped / 100)
  return (
    <div className="inline-flex items-center gap-2" aria-label={label ?? `Mastery ${clamped}%`}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--soft-cream)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--cue-yellow)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: 'stroke-dashoffset 400ms ease' }}
        />
      </svg>
      <span className="text-xs font-semibold">{clamped}%</span>
    </div>
  )
}
```

---

## Task 3: Refactor deck detail to use `computeDeckStats` + `MasteryRing`

**Files:**
- Modify: `D:/CUEMATH/Flashcard/app/(app)/deck/[id]/page.tsx`

- [ ] **Step 1: Replace the inline math block**

Full new file:
```tsx
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/db/server'
import { CueCard } from '@/lib/brand/primitives/card'
import { CueButton } from '@/lib/brand/primitives/button'
import { CuePill } from '@/lib/brand/primitives/pill'
import { MasteryRing } from '@/components/mastery-ring'
import { computeDeckStats, type StatCard } from '@/lib/progress/deck-stats'
import type { subjectFamily } from '@/lib/brand/tokens'

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

  const stats = computeDeckStats((cards ?? []) as StatCard[], new Date())

  return (
    <main className="max-w-2xl mx-auto p-6 space-y-6">
      <header className="space-y-2">
        <Link href="/library" className="text-sm opacity-60 hover:opacity-100">← Library</Link>
        <h1 className="font-display text-3xl font-bold">{deck.title}</h1>
        <div className="flex flex-wrap items-center gap-3">
          <CuePill tone="highlight">{stats.tier}</CuePill>
          <CuePill>{deck.card_count ?? 0} cards</CuePill>
          <MasteryRing pct={stats.masteryPct} />
        </div>
      </header>

      <CueCard subject={deck.subject_family as subjectFamily} className="space-y-4">
        <div>
          <h2 className="font-display text-xl font-bold">Today's sprint</h2>
          <p className="text-sm opacity-70">
            {stats.dueCount > 0
              ? `Up to 20 cards ready — keep your edge.`
              : `Nothing due right now. Check back later.`}
          </p>
        </div>
        <Link href={`/review?deck=${deck.id}`} className="block">
          <CueButton className="w-full" disabled={stats.dueCount === 0}>
            {stats.dueCount > 0 ? 'Start sprint' : 'All caught up'}
          </CueButton>
        </Link>
      </CueCard>
    </main>
  )
}
```

- [ ] **Step 2: Typecheck**

```bash
pnpm tsc --noEmit
```
Expected: no errors.

---

## Task 4: Library page — per-deck stats on deck cards

**Files:**
- Modify: `D:/CUEMATH/Flashcard/app/(app)/library/page.tsx`
- Modify: `D:/CUEMATH/Flashcard/components/deck-card.tsx`

### Why

Library currently passes only `status` + `cardCount`. Add per-deck `tier` + `masteryPct` so the grid shows progress at a glance. Hide-the-mountain: no raw due counts.

- [ ] **Step 1: Extend `DeckCard` props**

Replace `components/deck-card.tsx` with:
```tsx
'use client'

import { useEffect, useState, useTransition } from 'react'
import Link from 'next/link'
import { CueCard } from '@/lib/brand/primitives/card'
import { CuePill } from '@/lib/brand/primitives/pill'
import { CueButton } from '@/lib/brand/primitives/button'
import { MasteryRing } from '@/components/mastery-ring'
import { createClient } from '@/lib/db/client'
import { retryIngest } from '@/app/(app)/library/actions'
import type { subjectFamily } from '@/lib/brand/tokens'
import type { Tier } from '@/lib/progress/deck-stats'

type Props = {
  id: string
  title: string
  subjectFamily: subjectFamily
  status: 'ingesting' | 'ready' | 'failed'
  cardCount: number
  tier?: Tier
  masteryPct?: number
}

type JobRow = { stage: string; progress_pct: number; error: string | null }

const STAGE_LABEL: Record<string, string> = {
  uploading: 'Uploading',
  parsing: 'Parsing PDF',
  extracting: 'Extracting cards',
  embedding: 'Embedding',
  ready: 'Ready',
  failed: 'Failed',
}

export function DeckCard({ id, title, subjectFamily, status, cardCount, tier, masteryPct }: Props) {
  const [job, setJob] = useState<JobRow | null>(null)
  const [pending, startTransition] = useTransition()
  const active = status === 'ingesting'

  useEffect(() => {
    if (!active) return
    const supabase = createClient()
    let cancelled = false

    async function poll() {
      const { data } = await supabase
        .from('ingest_jobs')
        .select('stage, progress_pct, error')
        .eq('deck_id', id)
        .order('started_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (cancelled) return
      if (data) setJob(data)
      if (data?.stage === 'ready' || data?.stage === 'failed') {
        window.location.reload()
        return
      }
      setTimeout(poll, 2000)
    }
    poll()
    return () => { cancelled = true }
  }, [id, active])

  function onRetry() {
    startTransition(async () => {
      await retryIngest(id)
      window.location.reload()
    })
  }

  return (
    <CueCard subject={subjectFamily}>
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="font-bold truncate">{title}</div>
          {status === 'ready' && (
            <div className="flex items-center gap-2 text-sm opacity-70">
              <span>{cardCount} cards</span>
              {tier && <CuePill tone="highlight">{tier}</CuePill>}
            </div>
          )}
          {active && (
            <div className="text-sm opacity-70">
              {STAGE_LABEL[job?.stage ?? 'uploading'] ?? 'Working…'}
              {typeof job?.progress_pct === 'number' ? ` · ${job.progress_pct}%` : ''}
            </div>
          )}
          {status === 'failed' && (
            <div className="text-sm text-red-700">Failed{job?.error ? `: ${job.error.slice(0, 120)}` : ''}</div>
          )}
        </div>
        {status === 'ready' && (
          <div className="flex items-center gap-3">
            {typeof masteryPct === 'number' && <MasteryRing pct={masteryPct} />}
            <Link href={`/deck/${id}`}>
              <CuePill>View</CuePill>
            </Link>
          </div>
        )}
        {active && <CuePill tone="info">{`${job?.progress_pct ?? 0}%`}</CuePill>}
        {status === 'failed' && (
          <CueButton variant="ghost" onClick={onRetry} disabled={pending}>
            {pending ? '…' : 'Retry'}
          </CueButton>
        )}
      </div>
    </CueCard>
  )
}
```

- [ ] **Step 2: Fetch stats in library page**

Replace `app/(app)/library/page.tsx` with:
```tsx
import { createClient } from '@/lib/db/server'
import { CueCard } from '@/lib/brand/primitives/card'
import { CuePill } from '@/lib/brand/primitives/pill'
import { UploadModal } from '@/components/upload-modal'
import { DeckCard } from '@/components/deck-card'
import { computeDeckStats, type StatCard } from '@/lib/progress/deck-stats'
import type { subjectFamily } from '@/lib/brand/tokens'

export default async function LibraryPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name, daily_goal_cards')
    .eq('user_id', user!.id)
    .single()

  const { data: decks } = await supabase
    .from('decks')
    .select('id, title, subject_family, status, card_count')
    .eq('user_id', user!.id)
    .order('created_at', { ascending: false })

  const readyIds = (decks ?? []).filter((d) => d.status === 'ready').map((d) => d.id)
  let statsByDeck: Record<string, { tier: string; masteryPct: number }> = {}
  if (readyIds.length > 0) {
    const { data: cardsRaw } = await supabase
      .from('cards')
      .select('deck_id, fsrs_state, suspended')
      .eq('user_id', user!.id)
      .in('deck_id', readyIds)
    const grouped: Record<string, StatCard[]> = {}
    for (const r of cardsRaw ?? []) {
      const row = r as { deck_id: string } & StatCard
      ;(grouped[row.deck_id] ??= []).push({ fsrs_state: row.fsrs_state, suspended: row.suspended })
    }
    const now = new Date()
    for (const [id, group] of Object.entries(grouped)) {
      const s = computeDeckStats(group, now)
      statsByDeck[id] = { tier: s.tier, masteryPct: s.masteryPct }
    }
  }

  const name = profile?.display_name?.split(' ')[0] ?? 'there'

  return (
    <main className="max-w-2xl mx-auto p-6 space-y-8">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">Hi, {name}</h1>
          <p className="text-sm opacity-70">Goal: {profile?.daily_goal_cards ?? 20} cards today</p>
        </div>
        <CuePill tone="highlight">Day 1</CuePill>
      </header>

      <div><UploadModal /></div>

      {(!decks || decks.length === 0) && (
        <CueCard className="text-center space-y-2">
          <h2 className="font-display text-xl font-bold">No decks yet</h2>
          <p className="text-sm opacity-80">Drop a PDF above to get started.</p>
        </CueCard>
      )}

      {decks && decks.length > 0 && (
        <div className="grid grid-cols-1 gap-4">
          {decks.map((d) => {
            const s = statsByDeck[d.id]
            return (
              <DeckCard
                key={d.id}
                id={d.id}
                title={d.title}
                subjectFamily={d.subject_family as subjectFamily}
                status={d.status as 'ingesting' | 'ready' | 'failed'}
                cardCount={d.card_count}
                tier={s?.tier as import('@/lib/progress/deck-stats').Tier | undefined}
                masteryPct={s?.masteryPct}
              />
            )
          })}
        </div>
      )}
    </main>
  )
}
```

- [ ] **Step 3: Typecheck**

```bash
pnpm tsc --noEmit
```
Expected: no errors.

---

## Task 5: Fatigue pure logic (TDD)

**Files:**
- Create: `D:/CUEMATH/Flashcard/lib/fatigue/observe.ts`
- Create: `D:/CUEMATH/Flashcard/lib/fatigue/observe.test.ts`

### Why

Effort sensing = pure decision over an event stream. Zero DB, zero React, zero clock dependency. Easy to test with synthetic histories.

**Triggers (spec §8):**
- **inject_easy**: in last 6 cards (contiguous window), ≥50% rated Forgot(1) or Tough(2).
- **prompt_break**: median elapsed_ms of last 10 cards ≥ 2× baseline (median of first 10 cards this session).
- Each trigger at most once per session: caller passes `alreadyTriggered` flags.

- [ ] **Step 1: Write the failing test**

`lib/fatigue/observe.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { observe, type ReviewEvent } from './observe'

function e(rating: 1 | 2 | 3 | 4, elapsedMs: number): ReviewEvent {
  return { rating, elapsedMs, timestamp: 0 }
}

describe('fatigue/observe', () => {
  it('no events → continue', () => {
    expect(observe([], { injectedEasy: false, promptedBreak: false }).action).toBe('continue')
  })

  it('few events → continue', () => {
    const events = [e(3, 4000), e(3, 4000)]
    expect(observe(events, { injectedEasy: false, promptedBreak: false }).action).toBe('continue')
  })

  it('6 consecutive cards with ≥50% Forgot/Tough → inject_easy', () => {
    const events = [
      e(3, 4000), e(3, 4000),
      e(1, 5000), e(2, 5000), e(1, 5000),
      e(3, 4000), e(2, 5000), e(1, 5000),
    ]
    expect(observe(events, { injectedEasy: false, promptedBreak: false }).action).toBe('inject_easy')
  })

  it('inject_easy not repeated if already triggered', () => {
    const events = [
      e(1, 5000), e(1, 5000), e(1, 5000),
      e(2, 5000), e(2, 5000), e(1, 5000),
    ]
    expect(observe(events, { injectedEasy: true, promptedBreak: false }).action).toBe('continue')
  })

  it('response-time balloon → prompt_break', () => {
    const fast = Array.from({ length: 10 }, () => e(3, 3000))
    const slow = Array.from({ length: 10 }, () => e(3, 8000))
    expect(observe([...fast, ...slow], { injectedEasy: false, promptedBreak: false }).action).toBe('prompt_break')
  })

  it('prompt_break not repeated if already triggered', () => {
    const fast = Array.from({ length: 10 }, () => e(3, 3000))
    const slow = Array.from({ length: 10 }, () => e(3, 8000))
    expect(observe([...fast, ...slow], { injectedEasy: false, promptedBreak: true }).action).toBe('continue')
  })

  it('inject_easy takes precedence over prompt_break when both would fire', () => {
    const fast = Array.from({ length: 10 }, () => e(3, 3000))
    const slowAndWrong = Array.from({ length: 10 }, () => e(1, 8000))
    expect(observe([...fast, ...slowAndWrong], { injectedEasy: false, promptedBreak: false }).action).toBe('inject_easy')
  })
})
```

- [ ] **Step 2: Run — expect failure**

```bash
pnpm vitest run lib/fatigue/observe.test.ts
```
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

`lib/fatigue/observe.ts`:
```ts
export type ReviewEvent = {
  rating: 1 | 2 | 3 | 4
  elapsedMs: number
  timestamp: number
}

export type FatigueFlags = {
  injectedEasy: boolean
  promptedBreak: boolean
}

export type FatigueAction = 'continue' | 'inject_easy' | 'prompt_break'

const ACCURACY_WINDOW = 6
const ACCURACY_THRESHOLD = 0.5
const BASELINE_WINDOW = 10
const SLOWDOWN_FACTOR = 2

function median(nums: number[]): number {
  if (nums.length === 0) return 0
  const sorted = [...nums].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid]
}

export function observe(
  events: ReviewEvent[],
  flags: FatigueFlags,
): { action: FatigueAction } {
  if (!flags.injectedEasy && events.length >= ACCURACY_WINDOW) {
    const window = events.slice(-ACCURACY_WINDOW)
    const wrong = window.filter((e) => e.rating <= 2).length
    if (wrong / window.length >= ACCURACY_THRESHOLD) {
      return { action: 'inject_easy' }
    }
  }

  if (!flags.promptedBreak && events.length >= BASELINE_WINDOW * 2) {
    const baseline = median(events.slice(0, BASELINE_WINDOW).map((e) => e.elapsedMs))
    const recent = median(events.slice(-BASELINE_WINDOW).map((e) => e.elapsedMs))
    if (baseline > 0 && recent >= SLOWDOWN_FACTOR * baseline) {
      return { action: 'prompt_break' }
    }
  }

  return { action: 'continue' }
}
```

- [ ] **Step 4: Run — expect pass**

```bash
pnpm vitest run lib/fatigue/observe.test.ts
```
Expected: 7 passed.

---

## Task 6: Easy-card DB adapter

**Files:**
- Create: `D:/CUEMATH/Flashcard/lib/fatigue/easy-cards.ts`

### Why

When `inject_easy` fires, we need 2 mature cards (stability > 30d, currently due or recently reviewed) to slip in. Keep it a thin query.

- [ ] **Step 1: Write it**

`lib/fatigue/easy-cards.ts`:
```ts
'use server'

import { createClient } from '@/lib/db/server'
import type { SprintCard } from '@/lib/queue/types'

export async function fetchEasyCards(args: {
  deckId: string
  excludeIds: string[]
  n: number
}): Promise<SprintCard[]> {
  const { deckId, excludeIds, n } = args
  if (n <= 0) return []
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data, error } = await supabase
    .from('cards')
    .select('id, deck_id, concept_tag, front, back, fsrs_state, suspended')
    .eq('user_id', user.id)
    .eq('deck_id', deckId)
    .eq('suspended', false)
    .not('fsrs_state', 'is', null)
    .limit(200)
  if (error || !data) return []

  const mature = (data as SprintCard[]).filter(
    (c) => !excludeIds.includes(c.id) && (c.fsrs_state?.stability ?? 0) > 30,
  )
  mature.sort((a, b) => (b.fsrs_state?.stability ?? 0) - (a.fsrs_state?.stability ?? 0))
  return mature.slice(0, n)
}
```

---

## Task 7: `BreakPrompt` component

**Files:**
- Create: `D:/CUEMATH/Flashcard/components/break-prompt.tsx`

- [ ] **Step 1: Write it**

`components/break-prompt.tsx`:
```tsx
'use client'

import { CueButton } from '@/lib/brand/primitives/button'

export function BreakPrompt({ onDismiss }: { onDismiss: () => void }) {
  return (
    <div
      className="rounded-card p-4 space-y-3 text-center"
      style={{ background: 'var(--mint-green)' }}
      role="status"
    >
      <p className="font-display text-base font-semibold">You've been going hard.</p>
      <p className="text-sm opacity-80">Stretch for 60 seconds?</p>
      <CueButton variant="ghost" onClick={onDismiss} className="w-full">
        I'm good, keep going
      </CueButton>
    </div>
  )
}
```

---

## Task 8: `finalizeSession` server action

**Files:**
- Modify: `D:/CUEMATH/Flashcard/app/(app)/review/actions.ts`

### Why

Write one `sessions` row at end-of-sprint with aggregate telemetry. Keeps the `reviews` table focused on per-card events.

- [ ] **Step 1: Append to `app/(app)/review/actions.ts`**

```ts
export async function finalizeSession(args: {
  startedAt: string
  endedAt: string
  ratings: { rating: FsrsRating; elapsedMs: number }[]
  breakPromptedAt: string | null
}): Promise<{ ok: true } | { error: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not signed in' }

  const total = args.ratings.length
  const correct = args.ratings.filter((r) => r.rating >= 3).length
  const meanAccuracy = total > 0 ? correct / total : 0
  const meanResponseMs =
    total > 0 ? Math.round(args.ratings.reduce((a, r) => a + r.elapsedMs, 0) / total) : 0

  const { error } = await supabase.from('sessions').insert({
    user_id: user.id,
    started_at: args.startedAt,
    ended_at: args.endedAt,
    cards_reviewed: total,
    mean_accuracy: meanAccuracy,
    mean_response_ms: meanResponseMs,
    break_prompted_at: args.breakPromptedAt,
  })
  if (error) return { error: error.message }
  return { ok: true }
}
```

- [ ] **Step 2: Typecheck**

```bash
pnpm tsc --noEmit
```
Expected: no errors.

---

## Task 9: Wire fatigue + session finalization into review session

**Files:**
- Modify: `D:/CUEMATH/Flashcard/app/(app)/review/review-session.tsx`

### Why

This is the integration task. The session:
1. Emits `ReviewEvent` on each rating.
2. Calls `observe()` after each submission.
3. On `inject_easy`: calls `fetchEasyCards` to fetch 2 cards, splices them in **immediately after** the current index (so the user hits them next).
4. On `prompt_break`: shows `BreakPrompt`, pauses rating input.
5. Enforces 15-min hard cap (in addition to 20-card cap already baked into `buildSprint`).
6. On session end: calls `finalizeSession` once.

- [ ] **Step 1: Replace `app/(app)/review/review-session.tsx`**

```tsx
'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { CueCard } from '@/lib/brand/primitives/card'
import { CueButton } from '@/lib/brand/primitives/button'
import { ReviewCard } from '@/components/review-card'
import { RatingBar } from '@/components/rating-bar'
import { BreakPrompt } from '@/components/break-prompt'
import { submitRating, finalizeSession } from './actions'
import { fetchEasyCards } from '@/lib/fatigue/easy-cards'
import { observe, type ReviewEvent } from '@/lib/fatigue/observe'
import type { SprintCard } from '@/lib/queue/types'
import type { FsrsRating } from '@/lib/srs/schedule'
import type { subjectFamily } from '@/lib/brand/tokens'

const SPRINT_MS_CAP = 15 * 60 * 1000

export function ReviewSession({
  cards: initialCards,
  subject,
  deckId,
}: {
  cards: SprintCard[]
  subject?: subjectFamily
  deckId: string
}) {
  const router = useRouter()
  const [cards, setCards] = useState<SprintCard[]>(initialCards)
  const [index, setIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [events, setEvents] = useState<ReviewEvent[]>([])
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const [showBreak, setShowBreak] = useState(false)
  const [flags, setFlags] = useState({ injectedEasy: false, promptedBreak: false })
  const [breakPromptedAt, setBreakPromptedAt] = useState<string | null>(null)
  const shownAt = useRef<number>(Date.now())
  const startedAt = useRef<string>(new Date().toISOString())
  const finalized = useRef(false)

  const current = cards[index]
  const timedOut = Date.now() - new Date(startedAt.current).getTime() >= SPRINT_MS_CAP
  const done = index >= cards.length || timedOut

  useEffect(() => {
    shownAt.current = Date.now()
    setFlipped(false)
  }, [index])

  useEffect(() => {
    if (!done || finalized.current || cards.length === 0) return
    finalized.current = true
    const ratings = events.map((e) => ({ rating: e.rating, elapsedMs: e.elapsedMs }))
    void finalizeSession({
      startedAt: startedAt.current,
      endedAt: new Date().toISOString(),
      ratings,
      breakPromptedAt,
    })
  }, [done, events, cards.length, breakPromptedAt])

  function rate(rating: FsrsRating) {
    if (!current || pending || showBreak) return
    const elapsedMs = Date.now() - shownAt.current
    startTransition(async () => {
      const res = await submitRating({ cardId: current.id, rating, elapsedMs })
      if ('error' in res) {
        setError(res.error)
        return
      }
      setError(null)
      const nextEvents = [...events, { rating, elapsedMs, timestamp: Date.now() }]
      setEvents(nextEvents)

      const decision = observe(nextEvents, flags)

      if (decision.action === 'inject_easy') {
        setFlags((f) => ({ ...f, injectedEasy: true }))
        const excludeIds = cards.map((c) => c.id)
        const extras = await fetchEasyCards({ deckId, excludeIds, n: 2 })
        if (extras.length > 0) {
          setCards((prev) => {
            const copy = [...prev]
            copy.splice(index + 1, 0, ...extras)
            return copy
          })
        }
        setIndex((i) => i + 1)
        return
      }

      if (decision.action === 'prompt_break') {
        setFlags((f) => ({ ...f, promptedBreak: true }))
        setBreakPromptedAt(new Date().toISOString())
        setShowBreak(true)
        setIndex((i) => i + 1)
        return
      }

      setIndex((i) => i + 1)
    })
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (done || showBreak) return
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
  }, [flipped, done, showBreak, cards.length, pending]) // eslint-disable-line react-hooks/exhaustive-deps

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
    const got = events.filter((e) => e.rating >= 3).length
    return (
      <CueCard className="text-center space-y-4" style={{ background: 'var(--mint-green)' }}>
        <h2 className="font-display text-2xl font-bold">Nice sprint.</h2>
        <p className="text-base">{got} remembered out of {events.length}.</p>
        {timedOut && <p className="text-xs opacity-70">Timed out at 15 min — good focus.</p>}
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

      {showBreak ? (
        <BreakPrompt onDismiss={() => setShowBreak(false)} />
      ) : (
        <>
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
        </>
      )}

      {error && <p className="text-sm text-red-700">{error}</p>}
      <p className="text-xs text-center opacity-50">Esc to end early</p>
    </div>
  )
}
```

- [ ] **Step 2: Typecheck**

```bash
pnpm tsc --noEmit
```
Expected: no errors.

---

## Task 10: Smoke test (user-driven)

**Files:** none

- [ ] **Step 1: Restart dev**

```bash
pnpm dev
```

- [ ] **Step 2: Library page verification**

- Deck cards show tier pill and mastery ring (likely 0% / Curious until more reviews accumulate).
- No raw due counts visible anywhere.

- [ ] **Step 3: Deck page verification**

Click View:
- Tier + card count + mastery ring all render.
- Start sprint CTA enabled if cards are due.

- [ ] **Step 4: Review loop — base case**

Walk a sprint rating mostly `3` / `4`. At end, summary shows.

- [ ] **Step 5: Fatigue — inject_easy**

Rate the first 6 cards as `1` or `2`. Expected: after the 6th rating, an **extra mature card** gets inserted into the queue (sprint length increases by up to 2). No visible UI change beyond seeing a card you already know well.

- [ ] **Step 6: Fatigue — prompt_break**

Rate the first 10 cards quickly (≤3 seconds each). Then rate the next 10 slowly (≥6 seconds each). Expected: break prompt panel appears in place of the current card.

*Note:* If the deck has < 20 cards, the balloon may not trigger within the sprint — that's OK.

- [ ] **Step 7: Session summary in DB**

Supabase SQL:
```sql
select started_at, ended_at, cards_reviewed, mean_accuracy, mean_response_ms, break_prompted_at
from public.sessions
where user_id = auth.uid()
order by started_at desc
limit 5;
```
Expected: one row per completed sprint with non-zero metrics.

- [ ] **Step 8: 15-min cap (skip in manual test)**

Not practical to verify by hand — trust the code path.

---

## Self-Review Checklist

**Spec coverage:**
- ✅ `lib/progress/` read-only projections (tier, mastery): Task 1.
- ✅ Mastery ring SVG: Task 2.
- ✅ Tier on library + deck page: Tasks 3, 4.
- ✅ `lib/fatigue/` pure observe with inject_easy + prompt_break: Task 5.
- ✅ Mature-card injection via `fetchEasyCards`: Task 6.
- ✅ Break prompt component: Task 7.
- ✅ `sessions` table write: Task 8.
- ✅ Hard cap 20 cards (via `buildSprint size`) OR 15 min (timedOut check): Task 9.
- ✅ Hide-the-mountain (no raw due counts in library): Task 4.
- ⏸ Heatmap: deferred (Week 2 stretch).
- ⏸ Predicted-retention: deferred (Week 2 stretch).

**Placeholder scan:** None.

**Type consistency:**
- `StatCard` / `DeckStats` / `Tier` (Task 1) used in Tasks 3, 4.
- `ReviewEvent` / `FatigueFlags` / `FatigueAction` (Task 5) used in Task 9.
- `fetchEasyCards` (Task 6) signature matches call in Task 9.
- `finalizeSession` (Task 8) signature matches call in Task 9.
- `SprintCard` type unchanged since Plan 3.
