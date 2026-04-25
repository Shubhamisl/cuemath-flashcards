# login-magic mapping

Stitch screen `f1d41cf0bb774e75a0f15ddd05746fd2`. Desktop, 2560×2298 (1280×1149 logical).

## Region → primitive

| Region | Primitive | Notes |
|---|---|---|
| "Welcome back" yellow pill | `CuePill tone="highlight"` | Exact match — cueYellow bg / ink-black text. |
| "Sign in to keep your SharpMind journey going." headline | plain `<h1>` `font-display font-extrabold text-[28px] leading-tight` | No primitive. |
| Email input (2px ink-black border, 12px radius) | net-new `CueInput` primitive **OR** inline `<input>` | Today there is no input primitive in `lib/brand/primitives/`. The login form uses a plain `<input>` in `app/(auth)/login/page.tsx`. Worth promoting to a `CueInput` since onboarding goal step + upload modal subject step both want the same border treatment. See net-new below. |
| "Email me a sign-in link" CTA | `CueButton variant="primary"` with `className="w-full"` | Existing primary; full-width override. |
| "or" divider | inline flex with two `<hr>` and a centered `<span>` | Not a primitive. |
| "Continue with Google" ghost | `CueButton variant="ghost"` with `className="w-full"` + Google G icon child | Existing `variant="ghost"` already has 2px ink-black border — exact match. |
| 3 trust chips | `TrustChip` ×3 | Existing primitive; pass `icon` + `label`. Pastel variants via additional `className` override (`bg-mint-green`, `bg-trust-blue`) — see net-new prop below. |

## Net-new

- **`CueInput` primitive** at `lib/brand/primitives/input.tsx`. Same surface as `CueButton`: `forwardRef`, accepts all `<input>` HTML attrs, applies `border-2 border-ink-black rounded-input bg-paper-white px-5 py-4 placeholder:text-ink-black/40 font-body focus:outline-none focus:ring-2 focus:ring-cue-yellow`. Used by login email field, future onboarding goal "custom" input, and upload modal filename slot.
- **`TrustChip` `tone?: 'cream' | 'mint' | 'blue' | 'pink'`** (default `cream`). Currently hard-coded to softCream bg. Tones map to `bg-soft-cream` / `bg-mint-green` / `bg-trust-blue` / `bg-bubble-pink`. Mirrors `CuePill` tone API. Cleaner than passing `className="bg-mint-green"` overrides.

## Notes for downstream

- Existing `app/(auth)/login/page.tsx` is a server-action form — keep it that way. The Google button should be a separate `<form action={signInWithGoogle}>` (server action) or a client island around `supabase.auth.signInWithOAuth`. Either works.
- "SharpMind" wording is from the prompt — confirm with product whether the brand line uses "SharpMind" or "Cuemath Flashcards" here. Easy text swap.
