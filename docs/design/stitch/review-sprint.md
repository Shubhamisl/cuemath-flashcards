# review-sprint

**Stitch project:** `cuemath-flashcards-v1` (`projects/3065800030091529504`)
**Screen ID:** `00b68f11943b4e15b6798fdb1f0d79d0`
**Device:** DESKTOP (canvas 2560×2048 @ 2x → 1280×1024 logical)

## Preview
- Screenshot: `screenshots/review-sprint.png`
- Source HTML: `html/review-sprint.html`

## Primitive mapping

| Visual region | Existing primitive | Notes |
|---|---|---|
| 20-dot progress strip | none — net-new `ProgressDots` component | Already exists conceptually in `components/review-card.tsx`? If not, build inside `app/(app)/review/` — pure presentation, takes `total`, `index`, `done` props. No primitive in `lib/brand/primitives/` needed; this is composite layout. |
| Flashcard panel (softCream) | `CueCard` with explicit `style={{ backgroundColor: '#FFF1CC' }}` OR pass `subject` mapped to softCream | `subjectTint('default')` in `lib/brand/tokens.ts` — verify softCream is the default tint. If not, extend `subjectFamily` with a neutral key. |
| Question text | `font-display font-semibold text-2xl` inside the card | No primitive. |
| "Show answer (Space)" button | `CueButton` variant="primary" size="lg" with `className="w-full"` | Width override is the only addition. |
| "Esc to end early" hint | plain `<p className="text-sm text-ink-black/50 font-body">` | No primitive. |

## Net-new CSS / tokens

- **`ProgressDots` component** — Plan 4 may already ship this; reuse if so. Otherwise: simple flex-row of spans, dot states `filled | current | pending` mapping to `bg-cue-yellow`, `bg-cue-yellow/60 scale-125`, `bg-ink-black/15`.
- **Centered focus shell** — page-level layout `mx-auto max-w-[640px] pt-20`. Add to `app/(app)/review/layout.tsx`.
- No new primitives.

## Downstream notes
- Plan 5 Task 4 (review polish) should NOT introduce shadows on the card; spec is flat softCream + 1px border.
- Keyboard shortcuts are already wired (Plan 3); only the visual hint on the button label is new.
