# sprint-complete mapping

Stitch screen `8be6267e87a346bd9d078824b3f0fa6b`. Desktop, 2560×2048 (1280×1024 logical).

## Region → primitive

| Region | Primitive | Notes |
|---|---|---|
| "You're on Day 7." mood line | plain `<p>` `font-display font-semibold text-ink-black/70` | No primitive. Pull streak from existing `lib/progress/streak.ts`. |
| MintGreen celebration panel (~440×360, 32px radius) | `CueCard` with `className="rounded-panel bg-mint-green !shadow-none p-10 w-[440px]"` | `CueCard` defaults to 24px (`rounded-card`) — override to `rounded-panel` (32px). Need `bg-mint-green` override since `CueCard` only accepts `subject` (which gives a tint, not direct mint). See net-new below. |
| Confetti emoji / illustration | inline `<span>` | No primitive. Could later become a `<Confetti />` lottie. |
| "Nice sprint." headline | plain `<h2>` `font-display font-extrabold text-[32px]` | |
| Big stat row "8 / 10 remembered" | composed `<div>` | "8" → `text-[64px] font-display font-extrabold text-cue-yellow`; "/ 10" → `text-2xl text-ink-black`; "remembered" → `text-base text-ink-black/70`. No primitive. |
| "TIME 4m 32s" footer label | use `cue-label` utility (already established in landing-hero pass) | `text-xs uppercase tracking-[0.08em] text-ink-black/60`. |
| "Another sprint" primary CTA | `CueButton variant="primary"` | Exact match. |
| "Done for today" ghost link | plain `<Link>` `text-ink-black hover:underline` | Not `CueButton variant="ghost"` — text-only secondary, no border. |

## Net-new

- **`CueCard` `tone?: 'paper' | 'mint' | 'cream' | 'pink' | 'blue' | 'highlight'`** prop — extension of the `tone='highlight'` proposal from onboarding-goal pass. Map: `mint → bg-mint-green`, `cream → bg-soft-cream`, etc. Today `CueCard` only has `subject` (tinted) and the proposed `tone='highlight'` (yellow) — generalize to one `tone` enum that supersedes both.
  - Migration: `<CueCard subject="math">` → `<CueCard tone="cream">` (math tint == softCream); `<CueCard tone="highlight">` already proposed. Sprint-complete adds `tone="mint"`.
  - Keep `subject` prop for ergonomics in `DeckCard` (it maps subject family → tone internally).
- **No new tokens.** mintGreen, panel radius, and `cue-label` already exist.

## Notes for downstream

- This screen lives at `app/(app)/review/complete/page.tsx` (or as a state of `review-session.tsx`). Today `app/(app)/review/review-session.tsx` already has end-of-sprint logic — extend it rather than adding a route.
- Sprint duration calc lives in the session client component; format with `Intl.RelativeTimeFormat` or simple `Math.floor(s/60)m Xs`.
- Streak number sourced from `getStreak(userId)` server action (pre-loaded into the page, passed as prop).
