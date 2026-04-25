# profile-settings mapping

Stitch screen `5266e2fc0e81412f80b6f125b4439f50`. Desktop, 2560×3388 (1280×1694 logical, 2x DPR).

## Region → primitive

| Region | Primitive | Notes |
|---|---|---|
| Top nav wordmark | plain `<Link>` + `font-display font-extrabold tracking-tight` | Identical to library. Extracted into `app/(app)/_components/top-nav.tsx` so it can host the avatar dropdown. |
| Day-N streak pill | `CuePill tone="neutral"` | Reused. Streak computed server-side in library; for `/profile` we re-run the same logic. |
| Avatar circle | net-new client `<AvatarMenu>` inside `top-nav.tsx` | 36px ink-black/10 (soft-cream) bg, single initial. Click opens a paper-white dropdown (`shadow-card-flip`, 24px radius) with two items: Profile (Link) and Sign out (form-action). |
| "Your settings" headline | plain `<h1>` `font-display font-extrabold text-[36px] tracking-tight` | Caption is `font-body text-ink-black/70`. |
| Profile card | `CueCard tone="paper"` with `shadow-card-rest` | Padding override `p-8`. Card heading reuses Plus Jakarta semibold 22pt. |
| Display name input | plain `<input>` | `rounded-input border-2 border-ink-black px-4 py-3 font-body text-base w-full focus:outline-none`. |
| Email read-only pill | plain `<div>` styled as pill | `rounded-full border border-ink-black/15 bg-paper-white px-4 py-2 text-ink-black/60 font-body w-fit`. |
| Subject pill row | 5 pill `<button>`s tinted via `subjectTint()` + 'other' = paper-white border-only | Selected = `border-2 border-ink-black`. Reuses `subjectFamily` token. |
| Level pill row | 3 pill `<button>`s, paper-white default, soft-cream when selected | Selected adds `border-2 border-ink-black bg-soft-cream`. |
| Daily-goal pill row | 3 pill `<button>`s, cue-yellow tinted | Unselected `bg-cue-yellow/50`; selected `bg-cue-yellow border-2 border-ink-black`. |
| "Save changes" CTA | `CueButton variant="primary"` (default size) | Bottom-right of card via `flex justify-end`. |
| Account card | `CueCard tone="paper"` with `shadow-card-rest` | Same padding `p-8`. |
| "Sign out" button | `CueButton variant="ghost"` size default | Form-action posts to `signOut` server action. |
| Destructive zone | net-new inline panel | `rounded-2xl border-l-4 border-alert-coral bg-alert-coral/10 px-5 py-4`. Right-side "Delete" is a bordered ghost button (alert-coral border + text). Wired to a `deleteAccount` server-action stub that toasts "Coming soon." |

## Net-new (small)

- **`top-nav.tsx`** (client): props `{ name, streak }`. Hosts wordmark, streak pill, and the avatar dropdown. Used by `/library`, `/profile`, and `/deck/[id]`.
- **Avatar dropdown**: native `useState` + click-away on `document` blur. No new package. Two menu items (Profile link + Sign-out form button). Backdrop closes on outside click.
- **`profile-form.tsx`** (client): controlled state for `display_name`, `subject_family`, `level`, `daily_goal_cards`. Save button calls `updateProfile` server action and shows an inline "Saved." toast that fades after 2.5s.
- **`actions.ts` for /profile**: `updateProfile(patch)` and `signOut()` (calls `supabase.auth.signOut()` then `redirect('/login')`).

## Delete-deck (no Stitch mockup needed)

- Inline `<details>` confirm (or local-state client component) on `/deck/[id]`. Reuses CueCard + CueButton (ghost + alert-coral solid).
- `deleteDeck(deckId)` server action: best-effort PDF removal from `pdfs` bucket, then `decks.delete().eq('id').eq('user_id')` (RLS + defense-in-depth). Cards/jobs/sessions cascade.
