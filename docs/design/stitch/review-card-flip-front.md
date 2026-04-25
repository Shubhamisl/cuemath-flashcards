# review-card-flip-front

**Stitch project:** `cuemath-flashcards-v1` (`projects/3065800030091529504`)
**Screen ID:** `1a8f8246eec04394a8c62e2fb4ced94b`
**Device:** DESKTOP (canvas 2560×2048 @ 2x → 1280×1024 logical)

## Preview
- Screenshot: `screenshots/review-card-flip-front.png`
- Source HTML: `html/review-card-flip-front.html`

## Primitive mapping

| Visual region | Existing primitive | Notes |
|---|---|---|
| Card shell (softCream, 24px) | `CueCard` | `lib/brand/primitives/card.tsx`. Override fill via inline `style` to `#FFF1CC` or via subject. Default `shadow-sm` on `CueCard` matches spec's "subtle drop shadow". |
| "QUESTION" label | plain `<span className="text-xs uppercase tracking-[0.08em] text-ink-black/60 font-body">` | No primitive. |
| Question body | `font-display font-semibold text-[28px] text-ink-black` centered | Inside `CueCard`, use `flex items-center justify-center min-h-[300px]`. |

## Net-new CSS / tokens

- **Card label utility**: convention `text-xs uppercase tracking-[0.08em] text-ink-black/60` — consider adding `.cue-label` class or a `CueLabel` primitive in a follow-up if reused (NOT this task).
- **Card flip animation** — owned by `components/review-card.tsx` (Plan 3); not in this static mockup.

## Downstream notes
- Front face has lighter shadow than back. Implement with `data-state="front"` / `data-state="back"` on the flipping container, pair with two CSS shadow tokens (`shadow-card-front` / `shadow-card-back`).
