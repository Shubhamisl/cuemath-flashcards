# landing-hero

**Stitch project:** `cuemath-flashcards-v1` (`projects/3065800030091529504`)
**Screen ID:** `92d129d801ee4d6ab8d0b2bfb7bdd8d9`
**Device:** DESKTOP (canvas 2560×4452 @ 2x → 1280×2226 logical, top fold ~1280×900)

## Preview
- Screenshot: `screenshots/landing-hero.png`
- Source HTML: `html/landing-hero.html`

## Primitive mapping

| Visual region | Existing primitive | Notes |
|---|---|---|
| Top nav wordmark + Sign in link | none — plain `<header>` w/ `font-display` text | New `components/marketing/site-header.tsx` (server, no state). Use `font-display font-bold` for wordmark, `text-ink-black/70 hover:text-ink-black` for link. |
| "SharpMind journey" pill | `CuePill` tone="neutral" | `lib/brand/primitives/pill.tsx`. Already softCream + rounded-full. Use `className="uppercase tracking-wider text-xs"`. |
| Headline "PDF in. Memory forever." | none — plain `<h1>` | Use `font-display font-extrabold tracking-tight text-[clamp(48px,7vw,72px)] leading-[0.95]` — net-new clamp scale, document in tokens. |
| Subhead | plain `<p>` w/ `font-body text-ink-black/70 text-lg` | No primitive needed. |
| Primary CTA "Start my journey" | `CueButton` variant="primary" size="lg" | `lib/brand/primitives/button.tsx`. Already cue-yellow + ink-black + 12px radius. |
| 3 trust chips row | `TrustChip` ×3 in flex row | `lib/brand/primitives/trust-chip.tsx`. Wrap in `<div className="flex flex-wrap items-center justify-center gap-3">`. |
| 3-column "How it works" cards | `CueCard` ×3 (no `subject` → paper-white) | `lib/brand/primitives/card.tsx`. Already 24px radius + paper-white. Add numbered circle as inline div: `<div className="w-8 h-8 rounded-full bg-cue-yellow font-display font-bold flex items-center justify-center">1</div>`. |

## Net-new CSS / tokens

- **Display clamp scale**: add to `tokens.ts` or Tailwind config — `display-hero: clamp(48px, 7vw, 72px)` with `leading: 0.95`, `tracking: -0.02em`.
- **Card border**: add utility `border-ink-black/5` (Tailwind arbitrary already supports; just adopt convention).
- No new primitives required.

## Downstream notes
- This is the marketing surface; auth-gated app shell is separate. Plan 5 Task 2 should consume `CueCard` + `CueButton` directly — do not re-style.
