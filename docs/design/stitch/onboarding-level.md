# onboarding-level — mapping notes

Stitch screen: `projects/3065800030091529504/screens/29d75761ff6b447bb55e5b881e90f022`

Step 2 of 3 — "What's your level?". Existing route: `app/(app)/onboarding/level/page.tsx`.

## Region → primitive

| Region | Primitive | Notes |
|---|---|---|
| Page shell | none | Same wrapper as subject step. |
| Progress bar (66%) | `OnboardingProgress` (net-new from subject step) | Pass `pct={66}`. |
| Headline | none | `<h1 className="font-display font-extrabold text-[36px]">`. |
| Level card (×3) | `CueCard` (paper-white default) | No `subject` prop — default `bg-paper-white`. Override `className="border border-ink-black/10"`. |
| Card label | none | `<div className="font-display font-semibold text-[22px]">`. |
| Card hint | none | `<p className="font-body text-sm text-ink-black/70 mt-1">`. |
| Active/hover accent bar | none — net-new utility | 4px-wide cue-yellow left bar inside the card. Use Tailwind: `relative before:absolute before:inset-y-4 before:left-0 before:w-1 before:rounded-full before:bg-cue-yellow before:opacity-0 hover:before:opacity-100 data-[active=true]:before:opacity-100`. No new primitive — composes on top of `CueCard`. |

## Net-new

- None at the primitive level. Reuses `CueCard` + `OnboardingProgress`. The accent-bar pseudo-element is a one-off utility composition, not worth a primitive.
