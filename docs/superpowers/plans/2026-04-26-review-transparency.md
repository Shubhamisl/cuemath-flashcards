# Review Transparency & Progress Insight — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **BEFORE WRITING ANY CODE:** Read `node_modules/next/dist/docs/` for the current Next.js API. `params` is a `Promise<…>` — always `await` it. Server Actions use `'use server'`. Do not guess — read the guide first.

**Goal:** Close the "black box" feeling of the review session and deck detail page. After rating a card, students see how long until they'll see it again. On the deck detail, students see which concept areas they're struggling with and when their next reviews are scheduled.

**Architecture:**
- `submitRating` server action is extended to return `{ ok: true; intervalDays: number }` so the client can display the next interval without a second round-trip.
- `SprintCard.fsrs_state` already carries `null` for new cards — we derive an `isNew` flag client-side.
- Deck detail page gets two new server-computed data blobs: `weakTags` (concept tags with highest lapse rates) and `schedule` (due counts by time bucket: today remaining / tomorrow / this week). Both are computed in the existing `DeckPage` server component with Supabase queries.

**Tech Stack:** Next.js 16 App Router, TypeScript, React 19, Tailwind v4, Supabase, `ts-fsrs`.

**Key types already defined:**
- `FsrsCardState` (`lib/srs/schedule.ts`) — includes `lapses`, `due`, `stability`, `state`
- `SprintCard` (`lib/queue/types.ts`) — `fsrs_state: FsrsCardState | null` (null = new card)
- `ScheduleResult` (`lib/srs/schedule.ts`) — includes `intervalDays: number`

---

## Files Touched

| Action | Path |
|--------|------|
| Modify | `app/(app)/review/actions.ts` |
| Modify | `app/(app)/review/review-session.tsx` |
| Modify | `app/(app)/deck/[id]/page.tsx` |

---

## Task 1: Show next-review interval after rating

**Files:**
- Modify: `app/(app)/review/actions.ts`
- Modify: `app/(app)/review/review-session.tsx`

- [ ] **Step 1: Return `intervalDays` from `submitRating`**

Open `app/(app)/review/actions.ts`. The current return type is `Promise<{ ok: true } | { error: string }>`.

Change the return type and the success return to include `intervalDays`:

```typescript
// Change the function signature from:
export async function submitRating(args: {
  cardId: string
  rating: FsrsRating
  elapsedMs: number
}): Promise<{ ok: true } | { error: string }> {

// To:
export async function submitRating(args: {
  cardId: string
  rating: FsrsRating
  elapsedMs: number
}): Promise<{ ok: true; intervalDays: number } | { error: string }> {
```

The `schedule()` call (line ~28) already returns `{ nextState, dueDate, intervalDays }`. Capture `intervalDays` and include it in the success return:

```typescript
// Change from:
const { nextState } = schedule(before, args.rating, now)

// To:
const { nextState, intervalDays } = schedule(before, args.rating, now)
```

```typescript
// Change the final return from:
return { ok: true }

// To:
return { ok: true, intervalDays }
```

The full `submitRating` function after changes (show the whole function so the agent can replace it exactly):

```typescript
export async function submitRating(args: {
  cardId: string
  rating: FsrsRating
  elapsedMs: number
}): Promise<{ ok: true; intervalDays: number } | { error: string }> {
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

  const before: FsrsCardState = (card.fsrs_state as FsrsCardState | null) ?? initialState()
  const now = new Date()
  const { nextState, intervalDays } = schedule(before, args.rating, now)

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

  return { ok: true, intervalDays }
}
```

- [ ] **Step 2: Display interval and "New" badge in the review session**

Open `app/(app)/review/review-session.tsx`. Make the following changes:

**a) Add `lastInterval` state** — after the existing `useState` declarations:

```typescript
const [lastInterval, setLastInterval] = useState<number | null>(null)
```

**b) Capture `intervalDays` from `submitRating`** — in the `rate` function, after the early-return guards and before `setIndex`, update the success branch:

```typescript
// After: const res = await submitRating({ cardId: current.id, rating, elapsedMs })
// if ('error' in res) { ... return }
// After the error check, add:
setLastInterval(res.intervalDays)
```

The full updated `rate` function:

```typescript
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
    setLastInterval(res.intervalDays)
    setTimeout(() => setLastInterval(null), 2000)
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
        setEasyNote(`Here's an easy one — keep your rhythm.`)
        setTimeout(() => setEasyNote(null), 2500)
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
```

**c) Keep the interval visible across card transitions** — unlike `flipped`, `lastInterval` should NOT reset when the index changes. The `setLastInterval` and `setIndex` calls are batched in the same React transition, so the hint would display for 0 frames if we reset it on `[index]`. Instead, auto-clear it with a timeout. In the `rate` function, right after `setLastInterval(res.intervalDays)`, add:

```typescript
setLastInterval(res.intervalDays)
setTimeout(() => setLastInterval(null), 2000)
```

Do **not** add `setLastInterval(null)` to the `useEffect` that watches `[index]`. Leave that effect as-is:

```typescript
useEffect(() => {
  shownAt.current = Date.now()
  setFlipped(false)
  // Note: do NOT reset lastInterval here
}, [index])
```

**d) Show "New" badge and interval hint in the card area** — in the `return` JSX at the bottom of the component, find the block that renders `<ReviewCard>` and `<RatingBar>`. Add a "New" badge above the card when the current card is new, and an interval hint below the rating bar:

```tsx
{showBreak ? (
  <BreakPrompt onDismiss={() => setShowBreak(false)} />
) : (
  <>
    {/* New card badge */}
    {current.fsrs_state === null && (
      <div className="flex justify-center">
        <span className="text-xs font-display font-semibold uppercase tracking-[0.08em] bg-cue-yellow/30 text-ink-black px-3 py-1 rounded-full">
          New
        </span>
      </div>
    )}

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

    {/* Interval hint — shows after rating, before next card appears */}
    {lastInterval !== null && (
      <p className="text-xs text-center text-ink-black/50">
        {lastInterval === 0
          ? 'See you again shortly'
          : lastInterval === 1
            ? 'Next review: tomorrow'
            : `Next review: in ${lastInterval} days`}
      </p>
    )}
  </>
)}
```

- [ ] **Step 3: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: no errors. The most likely issue is `res.intervalDays` not being accessible if the error-branch narrowing is off — confirm the `if ('error' in res)` guard precedes the `setLastInterval` call.

- [ ] **Step 4: Manual verification**

Start a review session. Flip a card and rate it. Below the rating bar you should briefly see "Next review: in 5 days" (or similar) before the next card appears. New cards (never reviewed before) show a small "New" badge above the card on the front face.

- [ ] **Step 5: Commit**

```bash
git add app/(app)/review/actions.ts app/(app)/review/review-session.tsx
git commit -m "feat(review): show next-review interval after rating and new-card badge"
```

---

## Task 2: Weak concept tags on deck detail

**Files:**
- Modify: `app/(app)/deck/[id]/page.tsx`

- [ ] **Step 1: Compute weak concept tags in `DeckPage`**

Open `app/(app)/deck/[id]/page.tsx`. After the existing `const { data: cards }` query, add a second query and computation to find the concept tags with the most accumulated lapses:

```typescript
// Query all cards that have been reviewed at least once (fsrs_state is not null)
// and have at least 1 lapse. We need concept_tag and lapses.
const { data: reviewedCards } = await supabase
  .from('cards')
  .select('concept_tag, fsrs_state')
  .eq('deck_id', id)
  .eq('user_id', user.id)
  .not('fsrs_state', 'is', null)
  .eq('suspended', false)

// Aggregate lapses per concept tag
const tagLapses: Record<string, { lapses: number; count: number }> = {}
for (const rc of reviewedCards ?? []) {
  const tag = rc.concept_tag
  if (!tag) continue
  const lapses = (rc.fsrs_state as { lapses?: number } | null)?.lapses ?? 0
  if (lapses === 0) continue
  tagLapses[tag] ??= { lapses: 0, count: 0 }
  tagLapses[tag].lapses += lapses
  tagLapses[tag].count += 1
}

// Top 3 tags by total lapses (descending)
const weakTags = Object.entries(tagLapses)
  .sort(([, a], [, b]) => b.lapses - a.lapses)
  .slice(0, 3)
  .map(([tag]) => tag)
```

- [ ] **Step 2: Render weak concept tags in the JSX**

In the `DeckPage` JSX, inside the `<div className="space-y-8">` column, add a "Focus areas" section after the sprint CTA and before the `DeleteDeckButton`. Only render it if `weakTags.length > 0`:

```tsx
import { CuePill } from '@/lib/brand/primitives/pill'

{/* ... existing sprint CTA block ... */}

{weakTags.length > 0 && (
  <div className="space-y-2 max-w-[480px]">
    <p className="text-xs uppercase tracking-[0.08em] text-ink-black/60 font-display font-semibold">
      Focus areas
    </p>
    <div className="flex flex-wrap gap-2">
      {weakTags.map((tag) => (
        <CuePill key={tag} tone="warning">{tag}</CuePill>
      ))}
    </div>
  </div>
)}

<DeleteDeckButton deckId={deck.id} deckTitle={deck.title} />
```

Valid `CuePill` tones: `neutral` | `success` | `warning` | `info` | `highlight`. The `"warning"` tone maps to `bg-alert-coral` — correct for focus areas needing attention.

- [ ] **Step 3: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: no errors. If `CuePill` tone type is narrower than expected, check `lib/brand/primitives/pill.tsx` for the exact union type and use one of the listed values.

- [ ] **Step 4: Manual verification**

Open a deck that has been reviewed (some cards should have been rated 1 = Again at least once). You should see a "Focus areas" section showing up to 3 concept-tag pills representing the topics with most lapses. A freshly ingested deck with no reviews will not show this section.

- [ ] **Step 5: Commit**

```bash
git add app/(app)/deck/[id]/page.tsx
git commit -m "feat(deck): show weak concept tags on deck detail"
```

---

## Task 3: Upcoming review schedule on deck detail

**Files:**
- Modify: `app/(app)/deck/[id]/page.tsx`

- [ ] **Step 1: Compute upcoming due counts**

In `app/(app)/deck/[id]/page.tsx`, after the `weakTags` computation, add the upcoming schedule computation. We want three buckets: due later today (not yet past-due), due tomorrow, and due within this week:

```typescript
const now = new Date()

// End of today (23:59:59)
const todayEnd = new Date(now)
todayEnd.setHours(23, 59, 59, 999)

// End of tomorrow (23:59:59 tomorrow)
const tomorrowEnd = new Date(now)
tomorrowEnd.setDate(tomorrowEnd.getDate() + 1)
tomorrowEnd.setHours(23, 59, 59, 999)

// End of 7-day window
const weekEnd = new Date(now)
weekEnd.setDate(weekEnd.getDate() + 7)
weekEnd.setHours(23, 59, 59, 999)

let dueLaterToday = 0
let dueTomorrow = 0
let dueThisWeek = 0

for (const card of reviewedCards ?? []) {
  const state = card.fsrs_state as { due?: string } | null
  if (!state?.due) continue
  const due = new Date(state.due)
  if (isNaN(due.getTime())) continue
  // Skip already-past-due (those are in stats.dueCount already)
  if (due <= now) continue

  if (due <= todayEnd) {
    dueLaterToday++
  } else if (due <= tomorrowEnd) {
    dueTomorrow++
  } else if (due <= weekEnd) {
    dueThisWeek++
  }
}

const hasUpcoming = dueLaterToday > 0 || dueTomorrow > 0 || dueThisWeek > 0
```

Note: `reviewedCards` was already fetched in Task 2 — reuse it. Do not issue another Supabase query.

- [ ] **Step 2: Render the upcoming schedule**

In the JSX, add an "Upcoming" section after the Focus areas block and before `DeleteDeckButton`:

```tsx
{hasUpcoming && (
  <div className="space-y-2 max-w-[480px]">
    <p className="text-xs uppercase tracking-[0.08em] text-ink-black/60 font-display font-semibold">
      Upcoming
    </p>
    <div className="flex flex-wrap gap-3 text-sm text-ink-black/70">
      {dueLaterToday > 0 && (
        <span>
          <span className="font-display font-bold text-ink-black">{dueLaterToday}</span> later today
        </span>
      )}
      {dueTomorrow > 0 && (
        <span>
          <span className="font-display font-bold text-ink-black">{dueTomorrow}</span> tomorrow
        </span>
      )}
      {dueThisWeek > 0 && (
        <span>
          <span className="font-display font-bold text-ink-black">{dueThisWeek}</span> this week
        </span>
      )}
    </div>
  </div>
)}
```

The full order of the right-column sections after these additions should be:
1. Tier pill + `RenameDeckForm` (title)
2. 3-stat tiles (Total / Due / Mastery)
3. Sprint CTA block
4. "Browse X cards →" link (from card-browser plan)
5. Focus areas (weak tags)
6. Upcoming schedule
7. `DeleteDeckButton`

- [ ] **Step 3: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Manual verification**

Open a deck that has been reviewed. The Upcoming section should appear if any cards are scheduled for the future. For a brand-new deck (all cards `fsrs_state: null`), neither Focus areas nor Upcoming appear. After a study session where some cards were rated 3 or 4 (scheduled days out), Upcoming should show counts.

- [ ] **Step 5: Commit**

```bash
git add app/(app)/deck/[id]/page.tsx
git commit -m "feat(deck): show upcoming review schedule on deck detail"
```
