# review-card-flip-back

**Stitch project:** `cuemath-flashcards-v1` (`projects/3065800030091529504`)
**Screen ID:** `880bcb701b834f86b01b6e521b57ad4e`
**Device:** DESKTOP (canvas 2880×2304 @ 2x → 1440×1152 logical)

## Preview
- Screenshot: `screenshots/review-card-flip-back.png`
- Source HTML: `html/review-card-flip-back.html`

## Primitive mapping

| Visual region | Existing primitive | Notes |
|---|---|---|
| Card shell (softCream, 24px, deeper shadow) | `CueCard` with `className="shadow-[0_12px_32px_rgba(0,0,0,0.08)]"` | Same primitive as front, deeper shadow override. |
| "ANSWER" label | plain `<span>` matching front spec | Same `cue-label` convention. |
| Answer body "cos(x)" | `font-display font-bold text-[48px]` centered | Heavier weight than the question (semibold → bold) to signal reveal. |
| 4-button rating bar | `components/rating-bar.tsx` (already exists) | Already shipped Plan 3. Verify color mapping: Again→alertCoral, Hard→orange (NEW token if not present), Good→cueYellow, Easy→mintGreen. Buttons should be **fully rounded pills**, equal width, 56px tall, 8px gap, full-width row matching card. |
| Keyboard hints "1/2/3/4" under each label | inside `RatingBar` button — `<span className="block text-[11px] opacity-60">1</span>` | If current `RatingBar` doesn't render hints, add a `showHints` prop. |

## Net-new CSS / tokens

- **`orange` token** — spec uses `#FB923C` for "Hard". `lib/brand/tokens.ts` does NOT currently include this. **Add**: `hardOrange: '#FB923C'` (or pick a Cuemath-canon orange if brand kit specifies one — verify against `reference_cuemath_brand_kit.md`).
- **`shadow-card-back`** Tailwind utility = `0 12px 32px rgba(0,0,0,0.08)`.
- **RatingBar `showHints` prop** — small additive change to existing component, not a new primitive.

## Downstream notes
- **Action item for Plan 5 Task 4**: confirm `hardOrange` against the Cuemath brand kit; if brand says no orange, swap to a tinted yellow/coral gradient between Again and Good.
- Rating bar already exists — Task 4 is a visual polish pass, not a rebuild.
