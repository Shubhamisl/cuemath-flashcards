# deck-detail mapping

Stitch screen `075e922ad07242d4b5027509e9ccdcea`. Desktop, 2560×2390 (1280×1195 logical).

## Region → primitive

| Region | Primitive | Notes |
|---|---|---|
| `← Library` breadcrumb | plain `<Link>` Nunito Sans `text-ink-black/60` | No primitive. |
| 256px mastery ring | `MasteryRing pct={...} size={256} stroke={12}` | `MasteryRing` already takes `size`/`stroke` — exact reuse. The `<span>` showing the percentage next to it (the existing inline % label) needs to be **suppressed** at large sizes; see net-new prop below. |
| Deck title (~36pt) | plain `<h1>` `font-display font-extrabold text-4xl` | No primitive. |
| Tier pill ("Practicing") | `CuePill tone="success"` | Same mapping as library card. |
| 3 stat tiles (Total / Due / Mastery) | `CueCard subject="math"` ×3 OR custom inline divs | softCream bg matches `subjectTint('math')`. Cleanest: a small `StatTile` composite under `app/(app)/deck/_components/stat-tile.tsx` — number Plus Jakarta extrabold, label Nunito Sans uppercase tracking-wide. Not a primitive. |
| "Start sprint" CTA | `CueButton variant="primary" size="lg"` with `className="w-[480px]"` | Same as review-sprint sizing pattern. |
| "Delete deck" ghost link | `<button>` plain, `text-alert-coral hover:underline` | Not a `CueButton variant="ghost"` — that has a 2px ink-black border which is too heavy for a destructive secondary. Inline. |

## Net-new

- **`MasteryRing` `showLabel?: boolean`** prop, default `true`. At 256px we don't want the inline `12%` text next to the ring — the % belongs inside or beside, larger. Easiest: pass `showLabel={false}` and render the `%` as a child or sibling `<span>` outside. Tiny addition.
- **`StatTile` composite** (not a primitive): `app/(app)/deck/_components/stat-tile.tsx`. Reuses `CueCard subject="math"` with `className="px-4 py-3"` override and a 2-line content slot.
- No new tokens.

## Notes for downstream

- The `app/(app)/deck/[id]/page.tsx` route already exists (in untracked dirs from git status). Keep server component for data, push the CTA button into a small `'use client'` island so the sprint navigation can use `useTransition`.
- Tier → `CuePill` tone mapping should be a shared util; suggest `lib/progress/tier-tone.ts` exporting `tierToTone(tier: Tier): 'success' | 'info' | 'highlight'` and reuse in `DeckCard`.
