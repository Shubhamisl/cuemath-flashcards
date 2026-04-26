# Library Power Features — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **BEFORE WRITING ANY CODE:** Read `node_modules/next/dist/docs/` for the current Next.js API. `searchParams` and `params` are `Promise<…>` in this version — always `await` them. Server Actions use `'use server'`. Do not guess — read the guide first.

**Goal:** Add due-count badges on library deck cards, today's-progress counter in the header, deck search, deck sort, and deck rename — making the library actually useful when you have many decks.

**Architecture:** All new data is fetched in the existing `LibraryPage` server component (no new routes). Search and sort are driven by URL query params (`?q=…&sort=…`) so they're bookmarkable and server-rendered. A thin `SearchSortBar` client component owns the input/select and pushes URL updates via `useRouter`. Deck rename lives on the deck detail page via a new `RenameDeckForm` client component + a `renameDeck` server action in a new `app/(app)/deck/[id]/actions.ts`.

**Tech Stack:** Next.js 16 App Router, TypeScript, React 19, Tailwind v4, Supabase, existing `CueButton`/`CueCard`/`CuePill` primitives from `lib/brand/primitives/`.

---

## Files Touched

| Action | Path |
|--------|------|
| Modify | `app/(app)/library/page.tsx` |
| Create | `components/search-sort-bar.tsx` |
| Modify | `components/deck-card.tsx` |
| Modify | `app/(app)/_components/top-nav.tsx` |
| Create | `app/(app)/deck/[id]/actions.ts` |
| Create | `app/(app)/deck/[id]/rename-deck-form.tsx` |
| Modify | `app/(app)/deck/[id]/page.tsx` |

---

## Task 1: Due-count badge on each library deck card

**Files:**
- Modify: `app/(app)/library/page.tsx`
- Modify: `components/deck-card.tsx`

- [ ] **Step 1: Add `dueCount` to `statsByDeck` in the library page**

Open `app/(app)/library/page.tsx`. The `statsByDeck` object currently stores only `{ tier, masteryPct }`. Change the type and the assignment to also include `dueCount`:

```typescript
// Change this type (around line 41):
const statsByDeck: Record<string, { tier: string; masteryPct: number; dueCount: number }> = {}

// Change this assignment (around line 55):
statsByDeck[id] = { tier: s.tier, masteryPct: s.masteryPct, dueCount: s.dueCount }
```

Pass `dueCount` to `<DeckCard>` in the JSX (around line 93):

```tsx
<DeckCard
  key={d.id}
  id={d.id}
  title={d.title}
  subjectFamily={d.subject_family as subjectFamily}
  status={d.status as 'ingesting' | 'ready' | 'failed'}
  cardCount={d.card_count}
  tier={s?.tier as import('@/lib/progress/deck-stats').Tier | undefined}
  masteryPct={s?.masteryPct}
  dueCount={s?.dueCount}
/>
```

- [ ] **Step 2: Accept and display `dueCount` in `DeckCard`**

Open `components/deck-card.tsx`. Add `dueCount?: number` to the `Props` type and destructure it:

```typescript
type Props = {
  id: string
  title: string
  subjectFamily: subjectFamily
  status: 'ingesting' | 'ready' | 'failed'
  cardCount: number
  tier?: Tier
  masteryPct?: number
  dueCount?: number   // ← add this
}

export function DeckCard({ id, title, subjectFamily, status, cardCount, tier, masteryPct, dueCount }: Props) {
```

In the `cardBody` JSX, find the `flex items-start justify-between` div (the top row with the mastery ring and tier pill). Add a due badge between the ring and the pill:

```tsx
<div className="flex items-start justify-between">
  {status === 'ready' && typeof masteryPct === 'number' ? (
    <MasteryRing pct={masteryPct} size={64} stroke={6} showLabel={false} />
  ) : (
    <div className="size-16" />
  )}
  <div className="flex flex-col items-end gap-1.5">
    {status === 'ready' && tier && (
      <CuePill tone={tierToTone(tier)}>{tier}</CuePill>
    )}
    {status === 'ready' && typeof dueCount === 'number' && dueCount > 0 && (
      <CuePill tone="info">{dueCount} due</CuePill>
    )}
    {active && <CuePill tone="info">{`${job?.progress_pct ?? 0}%`}</CuePill>}
  </div>
</div>
```

- [ ] **Step 3: Verify types compile**

```bash
npx tsc --noEmit
```

Expected: no errors. Fix any type errors before proceeding.

- [ ] **Step 4: Manual verification**

Start dev server (`npm run dev`), sign in, open `/library`. Each ready deck card should show a yellow "X due" badge in the top-right corner if it has due cards. A deck with 0 due shows no badge.

- [ ] **Step 5: Commit**

```bash
git add app/(app)/library/page.tsx components/deck-card.tsx
git commit -m "feat(library): show due-count badge on deck cards"
```

---

## Task 2: Today's goal progress in the library header

**Files:**
- Modify: `app/(app)/library/page.tsx`

- [ ] **Step 1: Query today's reviewed-card count**

In `app/(app)/library/page.tsx`, after the `streak` computation and before the `decks` query, add:

```typescript
const todayStart = new Date()
todayStart.setHours(0, 0, 0, 0)

const { data: todaySessions } = await supabase
  .from('sessions')
  .select('cards_reviewed')
  .eq('user_id', user!.id)
  .gte('started_at', todayStart.toISOString())

const doneToday = (todaySessions ?? []).reduce(
  (sum, s) => sum + (s.cards_reviewed ?? 0),
  0,
)
```

- [ ] **Step 2: Render progress in the header**

In the JSX, replace the plain goal paragraph with a progress display:

```tsx
<header className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
  <div className="space-y-2">
    <h1 className="font-display font-extrabold text-4xl md:text-5xl tracking-tight">
      Hi, {name}
    </h1>
    <div className="flex items-center gap-2">
      <div className="h-2 w-40 rounded-full bg-ink-black/10 overflow-hidden">
        <div
          className="h-full rounded-full bg-cue-yellow transition-all duration-progress"
          style={{
            width: `${Math.min(100, Math.round((doneToday / (profile?.daily_goal_cards ?? 20)) * 100))}%`,
          }}
        />
      </div>
      <p className="text-sm text-ink-black/70">
        {doneToday} / {profile?.daily_goal_cards ?? 20} today
      </p>
    </div>
  </div>
  <div className="md:w-auto">
    <UploadModal />
  </div>
</header>
```

- [ ] **Step 3: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Manual verification**

Open `/library`. Under the greeting, see "0 / 20 today" with a thin yellow progress bar. After completing a sprint, refresh — the count should increase.

- [ ] **Step 5: Commit**

```bash
git add app/(app)/library/page.tsx
git commit -m "feat(library): show today's goal progress bar"
```

---

## Task 3: Deck search and sort via URL params

**Files:**
- Create: `components/search-sort-bar.tsx`
- Modify: `app/(app)/library/page.tsx`

- [ ] **Step 1: Create the `SearchSortBar` client component**

Create `components/search-sort-bar.tsx`:

```tsx
'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useState } from 'react'

export function SearchSortBar({
  initialQ,
  initialSort,
}: {
  initialQ: string
  initialSort: string
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [q, setQ] = useState(initialQ)

  const push = useCallback(
    (overrides: Record<string, string>) => {
      const sp = new URLSearchParams(searchParams.toString())
      for (const [k, v] of Object.entries(overrides)) {
        if (v) sp.set(k, v)
        else sp.delete(k)
      }
      router.push(`/library?${sp.toString()}`)
    },
    [router, searchParams],
  )

  return (
    <div className="flex gap-3">
      <input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') push({ q, sort: initialSort })
        }}
        onBlur={() => push({ q, sort: initialSort })}
        placeholder="Search decks…"
        className="flex-1 min-w-0 rounded-input border-2 border-ink-black/20 bg-paper-white px-4 py-2 font-body text-sm focus:outline-none focus:ring-2 focus:ring-cue-yellow"
      />
      <select
        value={initialSort}
        onChange={(e) => push({ q, sort: e.target.value })}
        className="rounded-input border-2 border-ink-black/20 bg-paper-white px-3 py-2 font-body text-sm focus:outline-none focus:border-ink-black"
      >
        <option value="created">Newest</option>
        <option value="title">A–Z</option>
        <option value="due">Most due</option>
        <option value="mastery">Least mastered</option>
      </select>
    </div>
  )
}
```

- [ ] **Step 2: Read `searchParams` in `LibraryPage` and filter/sort decks**

`app/(app)/library/page.tsx` — the page function signature needs to accept `searchParams`. Replace the current function signature with:

```typescript
export default async function LibraryPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; sort?: string }>
}) {
  const { q = '', sort = 'created' } = await searchParams
  const supabase = await createClient()
  // ... existing auth + profile check ...
```

After computing `statsByDeck`, apply search and sort:

```typescript
// Filter by title search
let filtered = (decks ?? []).filter((d) =>
  q ? d.title.toLowerCase().includes(q.toLowerCase()) : true,
)

// Sort
if (sort === 'title') {
  filtered = filtered.sort((a, b) => a.title.localeCompare(b.title))
} else if (sort === 'due') {
  filtered = filtered.sort(
    (a, b) => (statsByDeck[b.id]?.dueCount ?? 0) - (statsByDeck[a.id]?.dueCount ?? 0),
  )
} else if (sort === 'mastery') {
  filtered = filtered.sort(
    (a, b) => (statsByDeck[a.id]?.masteryPct ?? 0) - (statsByDeck[b.id]?.masteryPct ?? 0),
  )
}
// default 'created' is already ordered by created_at DESC from Supabase
```

Use `filtered` instead of `decks` in the JSX map.

- [ ] **Step 3: Add `SearchSortBar` to the library JSX**

In the JSX, add the search bar between the header and the deck grid:

```tsx
import { SearchSortBar } from '@/components/search-sort-bar'

// In JSX, after </header>:
<SearchSortBar initialQ={q} initialSort={sort} />
```

Wrap `SearchSortBar` in a `<Suspense>` boundary (required when using `useSearchParams` in a client component):

```tsx
import { Suspense } from 'react'

<Suspense>
  <SearchSortBar initialQ={q} initialSort={sort} />
</Suspense>
```

- [ ] **Step 4: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Manual verification**

Open `/library`. You should see a search input and a sort dropdown above the deck grid. Type part of a deck title and press Enter — the grid filters. Change the sort to "Most due" — decks with more due cards appear first. Clear the search — all decks return.

- [ ] **Step 6: Commit**

```bash
git add components/search-sort-bar.tsx app/(app)/library/page.tsx
git commit -m "feat(library): add deck search and sort controls"
```

---

## Task 4: Deck rename on the deck detail page

**Files:**
- Create: `app/(app)/deck/[id]/actions.ts`
- Create: `app/(app)/deck/[id]/rename-deck-form.tsx`
- Modify: `app/(app)/deck/[id]/page.tsx`

- [ ] **Step 1: Create the `renameDeck` server action**

Create `app/(app)/deck/[id]/actions.ts`:

```typescript
'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/db/server'

export async function renameDeck(
  deckId: string,
  title: string,
): Promise<{ ok: true } | { error: string }> {
  const trimmed = title.trim()
  if (!trimmed) return { error: 'Title cannot be empty' }
  if (trimmed.length > 200) return { error: 'Title is too long (max 200 chars)' }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('decks')
    .update({ title: trimmed })
    .eq('id', deckId)
    .eq('user_id', user.id)

  if (error) return { error: error.message }

  revalidatePath(`/deck/${deckId}`)
  revalidatePath('/library')
  return { ok: true }
}
```

- [ ] **Step 2: Create the `RenameDeckForm` client component**

Create `app/(app)/deck/[id]/rename-deck-form.tsx`:

```tsx
'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { renameDeck } from './actions'

export function RenameDeckForm({
  deckId,
  initialTitle,
}: {
  deckId: string
  initialTitle: string
}) {
  const [editing, setEditing] = useState(false)
  const [title, setTitle] = useState(initialTitle)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const router = useRouter()

  function save() {
    if (!title.trim()) return
    startTransition(async () => {
      const res = await renameDeck(deckId, title)
      if ('error' in res) {
        setError(res.error)
        return
      }
      setError(null)
      setEditing(false)
      router.refresh()
    })
  }

  function cancel() {
    setTitle(initialTitle)
    setError(null)
    setEditing(false)
  }

  if (!editing) {
    return (
      <h1 className="font-display font-extrabold text-4xl md:text-5xl tracking-tight leading-tight flex items-start gap-3">
        <span>{title}</span>
        <button
          onClick={() => setEditing(true)}
          aria-label="Rename deck"
          className="mt-1 text-2xl leading-none text-ink-black/30 hover:text-ink-black/70 transition-colors"
        >
          ✎
        </button>
      </h1>
    )
  }

  return (
    <div className="space-y-2 max-w-[480px]">
      <div className="flex items-center gap-2">
        <input
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') save()
            if (e.key === 'Escape') cancel()
          }}
          className="flex-1 rounded-input border-2 border-ink-black bg-paper-white px-4 py-3 font-display font-extrabold text-2xl focus:outline-none focus:ring-2 focus:ring-cue-yellow"
        />
        <button
          onClick={save}
          disabled={pending || !title.trim()}
          className="px-4 py-3 rounded-full bg-cue-yellow font-display font-semibold text-sm disabled:opacity-50"
        >
          {pending ? '…' : 'Save'}
        </button>
        <button
          onClick={cancel}
          className="px-3 py-3 text-ink-black/60 hover:text-ink-black font-display font-semibold text-sm"
        >
          Cancel
        </button>
      </div>
      {error && <p className="text-sm text-red-700">{error}</p>}
    </div>
  )
}
```

- [ ] **Step 3: Wire `RenameDeckForm` into the deck detail page**

In `app/(app)/deck/[id]/page.tsx`, replace the static `<h1>` with `RenameDeckForm`:

```tsx
import { RenameDeckForm } from './rename-deck-form'

// Replace this:
// <h1 className="font-display font-extrabold text-4xl md:text-5xl tracking-tight leading-tight">
//   {deck.title}
// </h1>

// With this:
<RenameDeckForm deckId={deck.id} initialTitle={deck.title} />
```

- [ ] **Step 4: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Manual verification**

Open any deck detail page (`/deck/[id]`). The deck title should show a faint pencil icon (✎) beside it. Click it — the title turns into an input. Edit, press Enter or Save — the title updates and the page refreshes. The library should also show the updated name.

- [ ] **Step 6: Commit**

```bash
git add app/(app)/deck/[id]/actions.ts app/(app)/deck/[id]/rename-deck-form.tsx app/(app)/deck/[id]/page.tsx
git commit -m "feat(deck): inline deck rename"
```
