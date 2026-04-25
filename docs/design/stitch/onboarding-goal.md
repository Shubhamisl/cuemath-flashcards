# onboarding-goal — mapping notes

Stitch screen: `projects/3065800030091529504/screens/058dbfdfa13d437c82a0e51b4c06814b`

Step 3 of 3 — "How many cards per day?". Existing route: `app/(app)/onboarding/goal/page.tsx`.

## Region → primitive

| Region | Primitive | Notes |
|---|---|---|
| Page shell | none | Same onboarding wrapper. |
| Progress bar (100%) | `OnboardingProgress` | `pct={100}`. |
| Headline + subtext | none | Same pattern as previous steps. |
| Goal card (×3, "10" / "20" / "40") | `CueCard` with custom `style={{ backgroundColor: cueYellow }}` OR a new `tone="highlight"` prop | Cleanest path: extend `CueCard` to accept an optional `tone?: 'highlight'` that sets `bg-cue-yellow`. Two-line change, mirrors `CuePill`'s `tone` API. Avoids inline style + keeps yellow tint discoverable. |
| Number "10" / "20" / "40" | none | `<div className="font-display font-extrabold text-[48px] text-center">`. |
| "cards / day" caption | none | `<div className="font-body text-sm text-ink-black/70 text-center">`. |
| Continue ghost button | `CueButton variant="ghost"` | Override to remove border for the underline-only treatment: `<CueButton variant="ghost" className="border-0 hover:bg-transparent hover:underline px-0 min-h-0">Continue</CueButton>`. Or accept that this CTA is rare enough to warrant a one-off `<button>` — both fine. Recommend the override since `CueButton` already encodes typography + tap scale. |

## Net-new

- **Optional `tone` prop on `CueCard`** — `tone?: 'highlight'` → `bg-cue-yellow`. Tiny API addition; reused by review-sprint hero card later if we tint there too.
- No new components.
