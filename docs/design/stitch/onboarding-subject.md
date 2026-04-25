# onboarding-subject — mapping notes

Stitch screen: `projects/3065800030091529504/screens/f8b3e0c999c54a51930eec74bbf1c1d1`
Variant (2-col grid): `projects/3065800030091529504/screens/16794c2cd9a442248a993516e6df44c8`

Step 1 of 3 of the Cuemath onboarding intake — "What are you studying?". Existing route: `app/(app)/onboarding/subject/page.tsx`.

## Region → primitive

| Region | Primitive | Notes |
|---|---|---|
| Page shell | none | `min-h-screen bg-paper-white flex flex-col items-center` wrapper in the route file. No new primitive. |
| Progress bar (33%) | none — net-new | Net-new `OnboardingProgress` composite (see below). 2 lines of CSS, not worth a primitive. |
| Headline | none | Plain `<h1 className="font-display font-extrabold text-[36px] tracking-tight text-ink-black">`. |
| Subtext | none | `<p className="font-body text-ink-black/70">`. |
| Subject card (×5) | `CueCard` with `subject` prop | Already supports `subject` → `subjectTint()` mapping for math/science/language/humanities. Add `'other'` to `subjectFamily` union → falls back to softCream, OR pass `subject="math"` for the Other row (cheaper). |
| Card label | none | `<span className="font-display font-semibold text-[22px]">` inside `CueCard` children. |
| Card hover state | none | Tailwind: `hover:ring-2 hover:ring-ink-black hover:ring-inset` on `CueCard` — extend `CueCard` className via `className` prop, no new primitive. |

## Net-new (minimal)

- **`OnboardingProgress` composite** (not a primitive — colocate in `app/(app)/onboarding/_components/progress.tsx`):
  ```tsx
  // 8px tall, full-width, ink-black/10 track, cue-yellow fill, 9999px radius.
  <div className="h-2 w-full rounded-full bg-ink-black/10">
    <div className="h-full rounded-full bg-cue-yellow transition-all" style={{ width: `${pct}%` }} />
  </div>
  ```
- Extend `subjectFamily` in `lib/brand/tokens.ts` to include `'other'` (maps to softCream). One-line addition, no API churn.

## Variant note

The 2-col icon grid variant (`16794c2cd9a442248a993516e6df44c8`) is logged for reference but **not** the chosen direction — vertical stack reads cleaner on desktop, matches Cuemath's editorial whitespace, and keeps the subject row swap-trivial. Stick with the linear list.
