# library-grid mapping

Stitch screen `e5281a754c0a44b78840c8bdf114c96c` (primary) + `ec51a8244ebf40daaab9edb56f1f9701` (variant). Desktop, 2560×2048 (1280×1024 logical, 2x DPR).

## Region → primitive

| Region | Primitive | Notes |
|---|---|---|
| Top nav wordmark | plain `<Link>` + Plus Jakarta extrabold span | No primitive needed; use `font-display font-extrabold tracking-tight` |
| "Day 7" streak pill | `CuePill tone="neutral"` | Already softCream bg / ink-black text — exact match. Existing `app/(app)/library/page.tsx` already renders this server-side from `lib/progress/streak.ts`. |
| Avatar circle | net-new tiny `<Avatar>` element | 36px circle, ink-black/10 bg, initial. Not worth a primitive — inline or shadcn-style colocated `components/avatar.tsx`. |
| "Hi, Shubham" hero headline | plain `<h1>` | Uses existing `font-display font-extrabold` utilities; size `text-[40px]`/`text-5xl`. |
| "Goal: 20 cards today" subtext | plain `<p>` Nunito Sans | `text-ink-black/70`. |
| Upload PDF CTA | `CueButton variant="primary" size="lg"` | Existing `components/upload-modal.tsx` already triggers the modal — wire `onClick={() => setOpen(true)}`. |
| Deck cards (3-col grid) | existing `components/deck-card.tsx` (`DeckCard`) | Already uses `CueCard subject={subjectFamily}` + `MasteryRing` + `CuePill`. Layout change: switch from current single-column stack to `grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 max-w-[1100px] mx-auto`. |
| Mastery ring (top-left, 64px) | `MasteryRing pct={...} size={64} stroke={6}` | `MasteryRing` already supports `size` prop — bump default call from 40 → 64 in DeckCard, move to top-left of card via flex-col layout. |
| Tier pill | `CuePill tone="success"` (mintGreen) for Practicing, `tone="info"` (trustBlue) for Confident | Map `Tier` enum → tone in DeckCard. |
| Empty-state ghost card | net-new — 4th grid cell `<button>` with `border-2 border-dashed border-ink-black/20 rounded-card` | Mirrors CueCard radius/padding but isn't a card. Single-use; inline. |

## Net-new

- **Avatar primitive (optional):** 36/40px circle with initial fallback. Defer until we have profile data; for now an inline `<div className="size-9 rounded-full bg-soft-cream …">` is enough.
- **Layout change in `DeckCard`:** today the mastery ring sits inline-right; mockup wants it top-left with title/meta below. Restructure to `flex flex-col gap-3` with ring at top, title row middle, tier pill bottom-right via `mt-auto self-end`. No prop changes — visual rearrangement only.
- **`CuePill` tone for tiers:** confirm `Tier` → tone mapping lives in `DeckCard`, not `CuePill`. Today `DeckCard` hard-codes `tone="highlight"` (yellow) for the tier pill — that's wrong; should be `success`/`info` per tier.

## Variant (sticky-sidebar)

`ec51a8244ebf40daaab9edb56f1f9701`. 2-col deck grid, vertical CuePill stack as left rail. Not chosen as primary — but worth keeping for when we add real subject filtering. Sidebar is `w-[200px] sticky top-24 self-start` with a `<nav>` of `CuePill` buttons (clickable variant — see net-new prop below).

- **Optional `CuePill` prop:** `as?: 'span' | 'button'` to render as a button without losing the pill styling. Currently `CuePill` is `<span>`-only. Add only when we wire subject filters.
