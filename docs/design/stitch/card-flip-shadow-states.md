# card-flip-shadow-states — mapping notes

Stitch screen: `projects/3065800030091529504/screens/d2e0b816e9194601b5949c59c6fcdb34`

Reference comparison (not a route) — defines the two shadow tokens for the review card flip animation. Consumed by `components/review-card.tsx` and the existing `review-card-flip-front` / `review-card-flip-back` mockups.

## Region → primitive

| Region | Primitive | Notes |
|---|---|---|
| Card body (both states) | `CueCard subject="math"` | Soft-cream tint, 24px radius — already covered. |
| QUESTION / ANSWER label | `cue-label` utility (defined in prior `review-card-flip-front.md`) | `text-xs uppercase tracking-[0.08em] text-ink-black/60 font-body`. No new utility. |
| Resting shadow | net-new token `--shadow-card-rest` | See below. |
| Mid-flip shadow | net-new token `--shadow-card-flip` | See below. |
| Caption (mono CSS values) | none | Reference-only; not shipped to app. JetBrains Mono is **not** added — captions exist solely in the mockup. |

## Net-new shadow tokens (PROPOSED)

Add to `app/globals.css` under `@theme`:

```css
@theme {
  --shadow-card-rest: 0 2px 8px rgba(0, 0, 0, 0.06);
  --shadow-card-flip: 0 12px 32px rgba(0, 0, 0, 0.18);
}
```

This **supersedes** the earlier `shadow-card-front` / `shadow-card-back` proposals from `review-card-flip-{front,back}.md`:

| Old (Task 0) | New (this task) | Reason |
|---|---|---|
| `shadow-card-front: 0 4px 12px rgba(0,0,0,0.04)` | `shadow-card-rest: 0 2px 8px rgba(0,0,0,0.06)` | Tighter blur reads more grounded at desktop scale; rename to `rest` decouples from front/back semantics (the back face also rests when settled). |
| `shadow-card-back: 0 12px 32px rgba(0,0,0,0.08)` | `shadow-card-flip: 0 12px 32px rgba(0,0,0,0.18)` | Bump opacity 0.08→0.18 — the lower value disappears against soft-cream tint in the mockup; 0.18 reads as genuine elevation mid-flip. |

## Wiring

`components/review-card.tsx` should consume via Tailwind arbitrary values or a Tailwind v4 utility class:

```tsx
<CueCard
  subject="math"
  className={cn(
    'transition-shadow duration-200',
    isFlipping ? 'shadow-[var(--shadow-card-flip)]' : 'shadow-[var(--shadow-card-rest)]',
  )}
>
```

No new primitive — existing `CueCard` accepts `className` for the shadow override. `CueCard`'s baked-in `shadow-sm` should be removed (or made overrideable via a `shadow={false}` prop) so these tokens don't double-stack.

## Net-new summary

- **2 CSS custom properties** in `app/globals.css`: `--shadow-card-rest`, `--shadow-card-flip`.
- **Minor `CueCard` change**: drop the default `shadow-sm` from `card.tsx` line 12, since callers now supply shadow via the token. Audit existing `CueCard` consumers (`landing-hero` triad, `deck-card`) — add `className="shadow-sm"` back where needed. ~3 call sites.
