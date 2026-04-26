# Card Browser — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **BEFORE WRITING ANY CODE:** Read `node_modules/next/dist/docs/` for the current Next.js API. `params` is a `Promise<…>` in this version — always `await` it. Server Actions use `'use server'` at the top of the file. Do not guess — read the guide first.

**Goal:** Give students a way to browse every card in a deck, edit the front/back text of any card, and delete cards they don't want — so they can trust and curate what the AI generated.

**Architecture:** New route `/deck/[id]/cards` (server component page + client `CardBrowser` component). All mutations go through server actions in a co-located `actions.ts`. The deck detail page gets a "Browse cards" link. No new database tables — uses existing `cards` table.

**Tech Stack:** Next.js 16 App Router, TypeScript, React 19, Tailwind v4, Supabase, existing `CueCard`/`CueButton` primitives from `lib/brand/primitives/`.

---

## Files Touched

| Action | Path |
|--------|------|
| Create | `app/(app)/deck/[id]/cards/page.tsx` |
| Create | `app/(app)/deck/[id]/cards/card-browser.tsx` |
| Create | `app/(app)/deck/[id]/cards/actions.ts` |
| Modify | `app/(app)/deck/[id]/page.tsx` |

---

## Task 1: Cards page scaffold

**Files:**
- Create: `app/(app)/deck/[id]/cards/page.tsx`
- Create: `app/(app)/deck/[id]/cards/card-browser.tsx`

- [ ] **Step 1: Create the server component page**

Create `app/(app)/deck/[id]/cards/page.tsx`:

```typescript
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/db/server'
import { CardBrowser } from './card-browser'

export default async function CardsPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: deck } = await supabase
    .from('decks')
    .select('id, title')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()
  if (!deck) notFound()

  const { data: cards } = await supabase
    .from('cards')
    .select('id, front, back, concept_tag, suspended')
    .eq('deck_id', id)
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })

  const rows = (cards ?? []) as Array<{
    id: string
    front: { text: string }
    back: { text: string }
    concept_tag: string | null
    suspended: boolean
  }>

  return (
    <main className="min-h-screen">
      <div className="max-w-[900px] mx-auto px-6 py-8 space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <Link
            href={`/deck/${id}`}
            className="text-sm font-body text-ink-black/60 hover:text-ink-black"
          >
            ← {deck.title}
          </Link>
          <h1 className="font-display font-extrabold text-2xl">
            {rows.length} {rows.length === 1 ? 'card' : 'cards'}
          </h1>
        </div>

        {rows.length === 0 ? (
          <div className="rounded-card border-2 border-dashed border-ink-black/20 p-12 text-center space-y-2">
            <p className="text-sm text-ink-black/70">No cards yet.</p>
          </div>
        ) : (
          <CardBrowser deckId={id} initialCards={rows} />
        )}
      </div>
    </main>
  )
}
```

- [ ] **Step 2: Create the `CardBrowser` client component (read-only first)**

Create `app/(app)/deck/[id]/cards/card-browser.tsx` with just the list display — no edit or delete yet. We'll add those in the next tasks.

```tsx
'use client'

import { useState } from 'react'
import { CueCard } from '@/lib/brand/primitives/card'

export type CardRow = {
  id: string
  front: { text: string }
  back: { text: string }
  concept_tag: string | null
  suspended: boolean
}

export function CardBrowser({
  deckId,
  initialCards,
}: {
  deckId: string
  initialCards: CardRow[]
}) {
  const [cards, setCards] = useState<CardRow[]>(initialCards)

  return (
    <div className="space-y-3">
      {cards.map((card) => (
        <CueCard key={card.id} tone="cream" className="shadow-card-rest p-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1">
              <div className="text-xs uppercase tracking-[0.08em] text-ink-black/50">Front</div>
              <div className="text-sm font-body">{card.front.text}</div>
            </div>
            <div className="space-y-1">
              <div className="text-xs uppercase tracking-[0.08em] text-ink-black/50">Back</div>
              <div className="text-sm font-body">{card.back.text}</div>
            </div>
          </div>
          {card.concept_tag && (
            <div className="mt-3 text-xs text-ink-black/40">{card.concept_tag}</div>
          )}
        </CueCard>
      ))}
    </div>
  )
}
```

Note: `setCards` is exported as a state setter so future tasks can mutate the list. Keep the unused `setCards` for now — TypeScript won't complain because it'll be used in Task 2.

- [ ] **Step 3: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Manual verification**

Navigate to `/deck/[any-deck-id]/cards`. You should see a list of cards with Front and Back columns, a concept tag below each, and a back-link at the top. The count in the heading should match `deck.card_count`.

- [ ] **Step 5: Commit**

```bash
git add app/(app)/deck/[id]/cards/page.tsx app/(app)/deck/[id]/cards/card-browser.tsx
git commit -m "feat(cards): card browser page — read-only list"
```

---

## Task 2: Edit card

**Files:**
- Create: `app/(app)/deck/[id]/cards/actions.ts`
- Modify: `app/(app)/deck/[id]/cards/card-browser.tsx`

- [ ] **Step 1: Create the `updateCard` server action**

Create `app/(app)/deck/[id]/cards/actions.ts`:

```typescript
'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/db/server'

export async function updateCard(args: {
  cardId: string
  front: string
  back: string
}): Promise<{ ok: true } | { error: string }> {
  const front = args.front.trim()
  const back = args.back.trim()
  if (!front) return { error: 'Front cannot be empty' }
  if (!back) return { error: 'Back cannot be empty' }
  if (front.length > 2000) return { error: 'Front is too long (max 2000 chars)' }
  if (back.length > 2000) return { error: 'Back is too long (max 2000 chars)' }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  // Verify ownership before update
  const { data: card } = await supabase
    .from('cards')
    .select('deck_id')
    .eq('id', args.cardId)
    .eq('user_id', user.id)
    .single()
  if (!card) return { error: 'Card not found' }

  const { error } = await supabase
    .from('cards')
    .update({
      front: { text: front },
      back: { text: back },
    })
    .eq('id', args.cardId)
    .eq('user_id', user.id)

  if (error) return { error: error.message }

  revalidatePath(`/deck/${card.deck_id}/cards`)
  return { ok: true }
}

export async function deleteCard(args: {
  cardId: string
}): Promise<{ ok: true } | { error: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: card } = await supabase
    .from('cards')
    .select('deck_id')
    .eq('id', args.cardId)
    .eq('user_id', user.id)
    .single()
  if (!card) return { error: 'Card not found' }

  const { error } = await supabase
    .from('cards')
    .delete()
    .eq('id', args.cardId)
    .eq('user_id', user.id)

  if (error) return { error: error.message }

  // Keep card_count in sync
  const { data: deck } = await supabase
    .from('decks')
    .select('card_count')
    .eq('id', card.deck_id)
    .single()
  await supabase
    .from('decks')
    .update({ card_count: Math.max(0, (deck?.card_count ?? 1) - 1) })
    .eq('id', card.deck_id)

  revalidatePath(`/deck/${card.deck_id}/cards`)
  revalidatePath(`/deck/${card.deck_id}`)
  return { ok: true }
}
```

- [ ] **Step 2: Add inline edit UI to `CardBrowser`**

Replace `app/(app)/deck/[id]/cards/card-browser.tsx` entirely:

```tsx
'use client'

import { useState, useTransition } from 'react'
import { CueCard } from '@/lib/brand/primitives/card'
import { CueButton } from '@/lib/brand/primitives/button'
import { updateCard, deleteCard } from './actions'

export type CardRow = {
  id: string
  front: { text: string }
  back: { text: string }
  concept_tag: string | null
  suspended: boolean
}

export function CardBrowser({
  deckId,
  initialCards,
}: {
  deckId: string
  initialCards: CardRow[]
}) {
  const [cards, setCards] = useState<CardRow[]>(initialCards)
  const [editing, setEditing] = useState<string | null>(null)
  const [editFront, setEditFront] = useState('')
  const [editBack, setEditBack] = useState('')
  const [editError, setEditError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function startEdit(card: CardRow) {
    setEditing(card.id)
    setEditFront(card.front.text)
    setEditBack(card.back.text)
    setEditError(null)
  }

  function cancelEdit() {
    setEditing(null)
    setEditError(null)
  }

  function saveEdit(cardId: string) {
    startTransition(async () => {
      const res = await updateCard({ cardId, front: editFront, back: editBack })
      if ('error' in res) {
        setEditError(res.error)
        return
      }
      setCards((prev) =>
        prev.map((c) =>
          c.id === cardId
            ? { ...c, front: { text: editFront.trim() }, back: { text: editBack.trim() } }
            : c,
        ),
      )
      setEditing(null)
      setEditError(null)
    })
  }

  function handleDelete(cardId: string) {
    if (!confirm('Delete this card? This cannot be undone.')) return
    startTransition(async () => {
      const res = await deleteCard({ cardId })
      if ('error' in res) {
        alert(res.error)
        return
      }
      setCards((prev) => prev.filter((c) => c.id !== cardId))
    })
  }

  return (
    <div className="space-y-3">
      {cards.map((card) => (
        <CueCard key={card.id} tone="cream" className="shadow-card-rest p-5 space-y-4">
          {editing === card.id ? (
            /* ── Edit mode ── */
            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-xs uppercase tracking-[0.08em] text-ink-black/50">
                  Front
                </label>
                <textarea
                  autoFocus
                  value={editFront}
                  onChange={(e) => setEditFront(e.target.value)}
                  rows={2}
                  className="w-full rounded-input border-2 border-ink-black bg-paper-white px-4 py-3 font-body text-sm focus:outline-none focus:ring-2 focus:ring-cue-yellow resize-none"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs uppercase tracking-[0.08em] text-ink-black/50">
                  Back
                </label>
                <textarea
                  value={editBack}
                  onChange={(e) => setEditBack(e.target.value)}
                  rows={3}
                  className="w-full rounded-input border-2 border-ink-black bg-paper-white px-4 py-3 font-body text-sm focus:outline-none focus:ring-2 focus:ring-cue-yellow resize-none"
                />
              </div>
              {editError && <p className="text-sm text-red-700">{editError}</p>}
              <div className="flex items-center justify-end gap-2">
                <button
                  onClick={cancelEdit}
                  className="px-4 py-2 text-sm font-display font-semibold text-ink-black/60 hover:text-ink-black"
                >
                  Cancel
                </button>
                <CueButton
                  onClick={() => saveEdit(card.id)}
                  disabled={pending || !editFront.trim() || !editBack.trim()}
                  size="sm"
                >
                  {pending ? '…' : 'Save'}
                </CueButton>
              </div>
            </div>
          ) : (
            /* ── Read mode ── */
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1">
                  <div className="text-xs uppercase tracking-[0.08em] text-ink-black/50">
                    Front
                  </div>
                  <div className="text-sm font-body">{card.front.text}</div>
                </div>
                <div className="space-y-1">
                  <div className="text-xs uppercase tracking-[0.08em] text-ink-black/50">
                    Back
                  </div>
                  <div className="text-sm font-body">{card.back.text}</div>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {card.concept_tag && (
                    <span className="text-xs text-ink-black/40">{card.concept_tag}</span>
                  )}
                  {card.suspended && (
                    <span className="text-xs text-alert-coral/70 font-display font-semibold">
                      suspended
                    </span>
                  )}
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => startEdit(card)}
                    className="px-3 py-1.5 text-xs font-display font-semibold text-ink-black/60 hover:text-ink-black rounded-full hover:bg-ink-black/5"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(card.id)}
                    disabled={pending}
                    className="px-3 py-1.5 text-xs font-display font-semibold text-alert-coral hover:text-red-800 rounded-full hover:bg-alert-coral/10 disabled:opacity-50"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </>
          )}
        </CueCard>
      ))}
    </div>
  )
}
```

- [ ] **Step 3: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Manual verification**

Navigate to `/deck/[id]/cards`. Click "Edit" on any card — the card expands into textarea inputs for front and back. Edit the text, click Save. The card updates in place. Click "Delete" — a confirmation dialog appears; confirm — the card disappears and is removed from the database.

- [ ] **Step 5: Commit**

```bash
git add app/(app)/deck/[id]/cards/actions.ts app/(app)/deck/[id]/cards/card-browser.tsx
git commit -m "feat(cards): edit and delete individual cards"
```

---

## Task 3: Link from deck detail to card browser

**Files:**
- Modify: `app/(app)/deck/[id]/page.tsx`

- [ ] **Step 1: Add "Browse cards" link to deck detail**

In `app/(app)/deck/[id]/page.tsx`, find the `<div className="space-y-3">` block that contains the "Start sprint" link and the `<DeleteDeckButton>`. Add a "Browse cards" link after the sprint CTA block and before the `DeleteDeckButton`:

```tsx
import Link from 'next/link'

// After the sprint CTA block (the </div> that closes space-y-3 with the Link+CueButton+p), add:
<Link
  href={`/deck/${deck.id}/cards`}
  className="inline-flex items-center gap-1.5 text-sm font-display font-semibold text-ink-black/60 hover:text-ink-black"
>
  Browse {deck.card_count ?? 0} cards →
</Link>
```

Place it between the sprint block and `<DeleteDeckButton>`:

```tsx
<div className="space-y-8">
  {/* ... tier pill, title, stat tiles, sprint CTA ... */}

  <Link
    href={`/deck/${deck.id}/cards`}
    className="inline-flex items-center gap-1.5 text-sm font-display font-semibold text-ink-black/60 hover:text-ink-black"
  >
    Browse {deck.card_count ?? 0} cards →
  </Link>

  <DeleteDeckButton deckId={deck.id} deckTitle={deck.title} />
</div>
```

- [ ] **Step 2: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Manual verification**

Open any deck detail page. You should see a "Browse X cards →" link below the sprint section. Clicking it navigates to the card browser. The back-link in the card browser returns to the deck detail.

- [ ] **Step 4: Commit**

```bash
git add app/(app)/deck/[id]/page.tsx
git commit -m "feat(deck): link to card browser from deck detail"
```
