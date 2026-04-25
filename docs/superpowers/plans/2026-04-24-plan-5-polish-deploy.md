# Plan 5 — Brand Polish, Visual Motion & Vercel Deploy

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring the app up to Cuemath's brand fidelity bar (fonts, landing page, review micro-interactions) and ship it on Vercel so the deliverable is a URL, not a repo.

**Architecture:** Pure front-end polish + deploy config. No new domain logic. Extends existing files. **Visual tasks run through a two-stage design pipeline: Stitch (Google) generates brand-aligned mockups → Claude's frontend-design skill translates them into our existing primitive/token system → code lands in the files listed below.**

**Tech Stack:** `next/font/google` for typography, Tailwind v4 CSS tokens already defined, Vercel for hosting. **Design tooling:** Stitch MCP (`mcp__stitch__*` — create_design_system, generate_screen_from_text, generate_variants, edit_screens) + `superpowers:frontend-design` skill + `anthropic-skills` (Claude design workflow) for mockup-to-code translation.

**Scope (strictly bounded):**
- **Stitch design system + mockups for the 3 visual tasks (landing, sprint dots, card flip), refined via Claude's frontend-design skill.**
- Font wiring (Plus Jakarta Sans + Nunito Sans).
- Landing page rewrite with SharpMind framing + trust strip + "How it works" triad.
- Real "Day N" streak pill computed from `sessions`.
- Sprint progress as dots (spec §7: "visual dots, not '5/20' text").
- Card flip CSS transform (respects `prefers-reduced-motion`).
- Vercel deploy config + env var checklist.

**Explicitly deferred** (tracked in `docs/demo-deviations.md`):
- Onboarding flow
- Heatmap, predicted-retention
- Interference-pair adjacency
- Leech tray UI
- Font loading: self-hosting / OFL bundling (using `next/font/google` for simplicity)

---

## File Structure

**Create:**
- None.

**Modify:**
- `app/layout.tsx` — wire both Google fonts via `next/font`, apply CSS variables.
- `app/globals.css` — map `--font-display` / `--font-body` to the new CSS variables.
- `app/page.tsx` — landing page: hero + 3-step "How it works" + trust strip.
- `app/(app)/library/page.tsx` — replace static "Day 1" with real streak pill.
- `components/review-card.tsx` — CSS 3D flip transform.
- `app/(app)/review/review-session.tsx` — sprint progress as dots.
- `next.config.ts` — no change expected; verify `serverExternalPackages` still present.
- `README.md` — replace Next boilerplate with project summary + env var table + deploy steps.

**Leave alone:** everything else.

**Stitch artifacts (not code, but inputs for visual tasks):**
- Stitch project `cuemath-flashcards-v1` with design system mirroring `lib/brand/tokens.ts` (colors, fonts, radii).
- Screens: `landing-hero`, `review-sprint`, `review-card-flip` (front + back states).
- Exports saved under `docs/design/stitch/` as reference images for visual tasks.

---

## Task 0: Stitch design system + mockups (visual foundation)

**Tools:** `mcp__stitch__*` + `superpowers:frontend-design` skill.

**Files:**
- Create: `docs/design/stitch/README.md` — links + screenshot exports.
- Create: `docs/design/stitch/<screen>.png` — exported mockups (one per screen below).

### Why

Tasks 2, 4, and 5 are visual. Instead of hand-guessing brand-fidelity, generate mockups in Stitch against a design system that mirrors our existing Tailwind tokens, then run them through Claude's `frontend-design` skill to convert Stitch output into code that uses **our** primitives (`CueButton`, `CueCard`, `CuePill`, `MasteryRing`) and **our** CSS tokens (`--cue-yellow`, `--mint-green`, `font-display`, etc.). Stitch provides the visual north star; frontend-design enforces the code contract.

- [ ] **Step 1: Invoke frontend-design skill**

```
Skill: superpowers:frontend-design
```
Record the skill's guidance (tokens, primitive reuse rules, motion principles). This skill governs Steps 3–5 below — every Stitch output gets run through it before a single line of JSX is written.

- [ ] **Step 2: Create Stitch design system mirroring `lib/brand/tokens.ts`**

```
mcp__stitch__create_design_system
  name: "Cuemath Flashcards v1"
  tokens:
    colors:
      cue-yellow: "#FFC940"
      ink-black:  "#1A1A1A"
      paper-white:"#FFFFFF"
      soft-cream: "#FFF7E1"
      mint-green: "#D7F5E4"
      bubble-pink:"#FFE1EC"
      trust-blue: "#DCEBFB"
    typography:
      display: "Plus Jakarta Sans"
      body:    "Nunito Sans"
    radii:
      card: 20
      pill: 999
```
Read `D:/CUEMATH/Flashcard/lib/brand/tokens.ts` first to pull the actual hex values — do not copy the placeholders above blindly.

- [ ] **Step 3: Generate `landing-hero` screen**

```
mcp__stitch__generate_screen_from_text
  project: "cuemath-flashcards-v1"
  name: "landing-hero"
  prompt: |
    Cuemath-branded landing page. Hero: "PDF in. Memory forever." in Plus Jakarta Sans
    extrabold. Yellow pill "SharpMind journey" above headline. One primary yellow CTA
    "Start my journey". Below: 3 trust chips in a row (pill-shaped, soft pastel).
    Below the fold: 3-card triad "How it works" (Drop a PDF / Get atomic cards /
    Run short sprints). Paper-white background, generous whitespace, mobile-first.
```
Generate **3 variants** (`mcp__stitch__generate_variants`, n=3). Export preferred one to `docs/design/stitch/landing-hero.png`.

- [ ] **Step 4: Generate `review-sprint` screen (for progress dots)**

```
mcp__stitch__generate_screen_from_text
  project: "cuemath-flashcards-v1"
  name: "review-sprint"
  prompt: |
    Review sprint in progress. Top: horizontal row of ~20 small dots — first 7 filled
    in cue-yellow, dot #8 slightly larger (current card, 60% opacity yellow), rest
    muted ink/15. No "8/20" text. Below: flashcard (soft-cream tint) with a question.
    Below card: "Show answer (Space)" button. Bottom hint: "Esc to end early".
```
Export to `docs/design/stitch/review-sprint.png`.

- [ ] **Step 5: Generate `review-card-flip` (front + back states)**

```
mcp__stitch__generate_screen_from_text
  project: "cuemath-flashcards-v1"
  name: "review-card-flip-front"
  prompt: |
    Flashcard, front face. Soft-cream background, rounded-20 corners, subtle border.
    Small uppercase label "QUESTION" at top in ink-black/60. Body: "What is the
    derivative of sin(x)?" in Plus Jakarta Sans semibold, center-aligned. No other chrome.

mcp__stitch__generate_screen_from_text
  project: "cuemath-flashcards-v1"
  name: "review-card-flip-back"
  prompt: |
    Same card, back face, mid-flip appearance (slight rotateY shadow). Label "ANSWER".
    Body: "cos(x)". Underneath card: 4-button rating bar (Again red, Hard orange,
    Good yellow, Easy mint) — pill-shaped, full-width, equal widths.
```
Export both to `docs/design/stitch/review-card-flip-{front,back}.png`.

- [ ] **Step 6: Run each mockup through Claude's frontend-design skill**

For each of the 3 screens, open the Stitch export in context and ask the frontend-design skill to produce a **component-mapping note**: which of our existing primitives (`CueButton`, `CueCard`, `CuePill`, `TrustChip`, `MasteryRing`, `RatingBar`) map to which visual region, and what net-new CSS (if any) is required. Write the notes into `docs/design/stitch/README.md` under H2 sections per screen.

- [ ] **Step 7: Commit design artifacts**

```bash
git add docs/design/stitch/
git commit -m "design: stitch mockups + frontend-design mapping for plan 5 visual tasks"
```

**Downstream tasks (2, 4, 5) must reference the matching Stitch export + mapping note — do not freestyle the layout.**

---

## Task 1: Wire Google Fonts (Plus Jakarta Sans + Nunito Sans)

**Files:**
- Modify: `D:/CUEMATH/Flashcard/app/layout.tsx`
- Modify: `D:/CUEMATH/Flashcard/app/globals.css`

### Why

Spec §7 locks font-display to Plus Jakarta Sans and font-body to Nunito Sans. Currently the app uses `Geist`. `next/font/google` handles self-hosting and variable CSS fonts with zero runtime.

- [ ] **Step 1: Replace `app/layout.tsx`**

Read current file first:
```bash
cat D:/CUEMATH/Flashcard/app/layout.tsx
```

Replace font imports and assignments:
```tsx
import type { Metadata } from 'next'
import { Plus_Jakarta_Sans, Nunito_Sans } from 'next/font/google'
import './globals.css'

const display = Plus_Jakarta_Sans({
  variable: '--font-display',
  subsets: ['latin'],
  weight: ['400', '600', '700', '800'],
})

const body = Nunito_Sans({
  variable: '--font-body',
  subsets: ['latin'],
  weight: ['400', '600', '700'],
})

export const metadata: Metadata = {
  title: 'Cuemath Flashcards',
  description: 'SharpMind journey — PDF to atomic flashcards, cognitively tuned.',
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable}`}>
      <body className="min-h-full flex flex-col font-body antialiased">
        {children}
      </body>
    </html>
  )
}
```

- [ ] **Step 2: Update `app/globals.css`**

Find the `@theme` block. Ensure these font declarations reference the CSS variables wired above. Specifically:
```css
@theme {
  /* ... existing tokens ... */
  --font-display: var(--font-display), 'Sora', system-ui, sans-serif;
  --font-body: var(--font-body), system-ui, sans-serif;
}
```

Tailwind v4 will auto-generate `font-display` and `font-body` utility classes from these. If the file doesn't already declare these, add them inside the existing `@theme` block.

- [ ] **Step 3: Visual check**

```bash
pnpm dev
```
Open `http://localhost:3000`. Text should render in Nunito Sans (body) and headings in Plus Jakarta Sans (display). Inspect element → `body` should have computed font-family including `Nunito Sans`.

- [ ] **Step 4: Typecheck**

```bash
pnpm tsc --noEmit
```
Expected: clean.

---

## Task 2: Landing page rewrite

**Files:**
- Modify: `D:/CUEMATH/Flashcard/app/page.tsx`

### Why

Current landing is a single CTA card. Spec calls for a branded trust strip + SharpMind framing. Stretch for conversion polish without adding routes.

**Reference:** `docs/design/stitch/landing-hero.png` + mapping note in `docs/design/stitch/README.md`. The JSX below is the frontend-design skill's translation of the Stitch mockup into our primitives — if the mockup diverges, re-run Step 6 of Task 0 before editing the JSX.

- [ ] **Step 1: Replace `app/page.tsx`**

```tsx
import Link from 'next/link'
import { CueButton } from '@/lib/brand/primitives/button'
import { CueCard } from '@/lib/brand/primitives/card'
import { CuePill } from '@/lib/brand/primitives/pill'
import { TrustChip } from '@/lib/brand/primitives/trust-chip'

const STEPS = [
  {
    title: 'Drop a PDF',
    body: 'Notes, a chapter, anything you need to remember. Up to 20MB.',
  },
  {
    title: 'Get atomic cards',
    body: 'One idea per card — written the way a great teacher would.',
  },
  {
    title: 'Run short sprints',
    body: 'Modern spaced-repetition keeps your edge without burning you out.',
  },
]

export default function Home() {
  return (
    <main className="flex-1 flex flex-col">
      <section className="px-6 py-20 max-w-3xl mx-auto w-full space-y-8 text-center">
        <div className="space-y-4">
          <CuePill tone="highlight">SharpMind journey</CuePill>
          <h1 className="font-display text-5xl font-extrabold tracking-tight">
            PDF in.
            <br />
            Memory forever.
          </h1>
          <p className="text-lg opacity-80 max-w-xl mx-auto">
            Cuemath Flashcards turns any document into cognitively-tuned practice.
            Built on the same science that powers 700M+ reviews a year.
          </p>
        </div>

        <Link href="/login" className="inline-block">
          <CueButton className="px-10">Start my journey</CueButton>
        </Link>

        <div className="flex flex-wrap justify-center gap-2 pt-2">
          <TrustChip label="Backed by 700M+ reviews" />
          <TrustChip label="Cognitive-science tuned" />
          <TrustChip label="Your PDFs stay private" />
        </div>
      </section>

      <section className="px-6 py-16 max-w-5xl mx-auto w-full">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {STEPS.map((s, i) => (
            <CueCard key={s.title} className="space-y-2">
              <div className="text-xs font-semibold opacity-60">0{i + 1}</div>
              <h3 className="font-display text-xl font-bold">{s.title}</h3>
              <p className="text-sm opacity-80">{s.body}</p>
            </CueCard>
          ))}
        </div>
      </section>
    </main>
  )
}
```

- [ ] **Step 2: Visual check**

Open `http://localhost:3000`. Verify:
- Hero uses Plus Jakarta Sans (display font).
- Trust chips render.
- "How it works" triad below the fold is legible on mobile.

---

## Task 3: Real streak pill

**Files:**
- Modify: `D:/CUEMATH/Flashcard/app/(app)/library/page.tsx`

### Why

Library header shows static `Day 1` — misleading. Compute from `sessions` table: count distinct UTC dates with at least one session in the last 30 days, contiguous from today.

- [ ] **Step 1: Add streak query + helper to `library/page.tsx`**

Above the component, add:
```tsx
function computeStreak(sessionDates: string[], today: Date): number {
  // sessionDates: ISO strings of session started_at, any order
  // Returns consecutive-day streak ending today (or yesterday — allowing grace).
  if (sessionDates.length === 0) return 0
  const days = new Set(
    sessionDates.map((d) => new Date(d).toISOString().slice(0, 10)),
  )
  let streak = 0
  const cursor = new Date(Date.UTC(
    today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate(),
  ))
  // Allow "today OR yesterday" to count as active (user hasn't reviewed today yet).
  if (!days.has(cursor.toISOString().slice(0, 10))) {
    cursor.setUTCDate(cursor.getUTCDate() - 1)
    if (!days.has(cursor.toISOString().slice(0, 10))) return 0
  }
  while (days.has(cursor.toISOString().slice(0, 10))) {
    streak += 1
    cursor.setUTCDate(cursor.getUTCDate() - 1)
  }
  return streak
}
```

- [ ] **Step 2: Query sessions inside the page**

Inside `LibraryPage`, after the profile fetch, add:
```tsx
const { data: sessions } = await supabase
  .from('sessions')
  .select('started_at')
  .eq('user_id', user!.id)
  .gte('started_at', new Date(Date.now() - 40 * 86400000).toISOString())
const streak = computeStreak(
  (sessions ?? []).map((s) => s.started_at as string),
  new Date(),
)
```

- [ ] **Step 3: Swap the pill**

Replace:
```tsx
<CuePill tone="highlight">Day 1</CuePill>
```
with:
```tsx
<CuePill tone="highlight">{streak > 0 ? `Day ${streak}` : `Day 1`}</CuePill>
```

- [ ] **Step 4: Typecheck**

```bash
pnpm tsc --noEmit
```
Expected: clean.

- [ ] **Step 5: Visual check**

Do a sprint, reload library. Pill should say `Day 1` after today's first session. Second day → `Day 2`.

---

## Task 4: Sprint progress dots

**Files:**
- Modify: `D:/CUEMATH/Flashcard/app/(app)/review/review-session.tsx`

### Why

Spec §7: "visual dots, not '5/20' text". Current progress is a yellow bar. Replace with a row of small dots — filled as cards get rated. Keeps the player-feedback pattern familiar but brand-aligned.

**Reference:** `docs/design/stitch/review-sprint.png` — dot sizing, spacing, active-dot emphasis ratio come from the Stitch mockup as translated by the frontend-design skill.

- [ ] **Step 1: Locate the bar**

Find in `review-session.tsx`:
```tsx
<div className="h-1 rounded-full bg-ink-black/10 overflow-hidden">
  <div
    className="h-full bg-cue-yellow transition-all"
    style={{ width: `${progressPct}%` }}
  />
</div>
```

- [ ] **Step 2: Replace with dots**

```tsx
<div className="flex items-center justify-center gap-1.5 flex-wrap" aria-label={`Card ${Math.min(index + 1, cards.length)} of ${cards.length}`}>
  {cards.map((_, i) => (
    <span
      key={i}
      className={`rounded-full transition-all ${
        i < index
          ? 'bg-cue-yellow'
          : i === index
            ? 'bg-cue-yellow/60'
            : 'bg-ink-black/15'
      }`}
      style={{
        width: i === index ? 10 : 6,
        height: i === index ? 10 : 6,
      }}
    />
  ))}
</div>
```

- [ ] **Step 3: Remove unused `progressPct` constant if nothing else uses it.**

- [ ] **Step 4: Visual check**

Run a sprint. Dots under the header should fill left-to-right as you rate cards; the current dot is slightly larger.

---

## Task 5: Card flip animation

**Files:**
- Modify: `D:/CUEMATH/Flashcard/components/review-card.tsx`

### Why

Spec §7: "subtle flip animation (~160ms, respects `prefers-reduced-motion`)". Current component swaps text instantly. Add a 3D flip.

**Reference:** `docs/design/stitch/review-card-flip-front.png` + `review-card-flip-back.png` — face labels ("QUESTION"/"ANSWER"), text scale, tint mapping per subject come from the Stitch mockups via the frontend-design skill.

- [ ] **Step 1: Replace `components/review-card.tsx`**

```tsx
'use client'

import type { subjectFamily } from '@/lib/brand/tokens'

export function ReviewCard({
  front,
  back,
  flipped,
  subject,
}: {
  front: string
  back: string
  flipped: boolean
  subject?: subjectFamily
}) {
  const tint =
    subject === 'math'
      ? 'var(--soft-cream)'
      : subject === 'science'
        ? 'var(--mint-green)'
        : subject === 'language'
          ? 'var(--bubble-pink)'
          : subject === 'humanities'
            ? 'var(--trust-blue)'
            : 'var(--paper-white)'

  return (
    <div
      className="relative w-full min-h-[240px]"
      style={{ perspective: '1000px' }}
      aria-live="polite"
    >
      <div
        className="relative w-full h-full min-h-[240px] transition-transform motion-reduce:transition-none"
        style={{
          transformStyle: 'preserve-3d',
          transitionDuration: '160ms',
          transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
        }}
      >
        <Face tint={tint} label="Question" text={front} />
        <Face tint={tint} label="Answer" text={back} backSide />
      </div>
    </div>
  )
}

function Face({
  tint,
  label,
  text,
  backSide,
}: {
  tint: string
  label: string
  text: string
  backSide?: boolean
}) {
  return (
    <div
      className="absolute inset-0 rounded-card p-6 shadow-sm border border-ink-black/5 flex items-center justify-center text-center"
      style={{
        background: tint,
        backfaceVisibility: 'hidden',
        transform: backSide ? 'rotateY(180deg)' : undefined,
      }}
    >
      <div className="w-full">
        <div className="text-xs uppercase tracking-wide opacity-60 mb-3">{label}</div>
        <div className="font-display text-xl font-semibold whitespace-pre-wrap">{text}</div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Visual check**

Press Space on a card. The card should rotate ~160ms along the Y axis, revealing the back. With OS "reduced motion" enabled, the rotation instantly snaps.

- [ ] **Step 3: Typecheck**

```bash
pnpm tsc --noEmit
```
Expected: clean.

---

## Task 6: README rewrite

**Files:**
- Modify: `D:/CUEMATH/Flashcard/README.md`

### Why

The Next.js boilerplate README is noise. Replace with a concise project summary + env var table + run/deploy steps so reviewers can grok it in 60 seconds.

- [ ] **Step 1: Replace `README.md` with**

```markdown
# Cuemath Flashcards

PDF → atomic flashcards → modern spaced-repetition review, wrapped in Cuemath's brand.

## Stack

- Next.js 16 App Router (TypeScript)
- Supabase (Auth + Postgres + Storage + pgvector)
- Tailwind v4 with Cuemath design tokens
- `ts-fsrs` for scheduling
- OpenRouter for LLM extraction + embeddings (free-tier during demo; see `docs/demo-deviations.md`)
- Vercel for hosting

## Local setup

1. `pnpm install`
2. Copy `.env.local.example` → `.env.local` and fill in values.
3. Apply migrations to your Supabase project:
   ```
   supabase/migrations/20260424000001_initial_schema.sql
   supabase/migrations/20260424000002_rls_policies.sql
   supabase/migrations/20260424000003_profile_trigger.sql
   supabase/migrations/20260424000004_embedding_flex.sql
   supabase/migrations/20260424000005_storage_bucket.sql
   ```
4. `pnpm dev`

## Environment variables

| Var | Purpose |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-side admin key (ingest pipeline) |
| `SUPABASE_PROJECT_REF` | Supabase project ref |
| `OPENROUTER_API_KEY` | OpenRouter key for LLM + embeddings |
| `LLM_PROVIDER` | `openrouter` (demo) or `anthropic` (prod) |
| `LLM_MODEL` | e.g. `google/gemma-4-31b-it:free` |
| `EMBEDDING_MODEL` | e.g. `nvidia/llama-nemotron-embed-vl-1b-v2:free` |
| `ANTHROPIC_API_KEY` | Only needed when `LLM_PROVIDER=anthropic` |

## Project structure

```
app/                 Next routes + server actions
  (auth)/login       Magic-link + Google sign-in
  (app)/library      Deck grid + upload modal
  (app)/deck/[id]    Deck detail, mastery ring, sprint CTA
  (app)/review       Review sprint session
  api/ingest/[jobId] Pipeline webhook
lib/
  brand/             Design tokens + primitives
  db/                Supabase client helpers
  llm/               LLM provider abstraction (OpenRouter / Anthropic)
  embeddings/        OpenRouter embeddings adapter
  pdf/               pdf-parse v2 wrapper + chunking
  ingest/            PDF → deck pipeline
  srs/               Pure ts-fsrs wrapper
  queue/             Sprint builder
  fatigue/           Pure effort-sensing decision logic
  progress/          Deck stats (tier, mastery)
supabase/migrations  DDL + RLS policies
docs/                Spec, plans, demo-vs-prod deviation log
```

## Design

- Spec: `docs/superpowers/specs/2026-04-23-cuemath-flashcard-engine-design.md`
- Plans: `docs/superpowers/plans/`
- Demo deviations (free-tier shortcuts): `docs/demo-deviations.md`

## Deploy (Vercel)

1. Push to GitHub.
2. Import project in Vercel.
3. Set all env vars from the table above in Project Settings → Environment Variables.
4. Framework preset: Next.js (auto-detected).
5. Build command: `pnpm build`.
6. Deploy. Add the production URL as an allowed redirect in Supabase Auth → URL Configuration.
```

---

## Task 7: Vercel deploy (user-driven)

**Files:** none

- [ ] **Step 1: Production build locally**

```bash
cd D:/CUEMATH/Flashcard && pnpm build
```
Expected: build completes without type or runtime errors. Output path summary ends with `✓`.

- [ ] **Step 2: Push to GitHub**

If the repo isn't on GitHub yet:
```bash
cd D:/CUEMATH/Flashcard
git init    # if not already a repo
git add -A
git commit -m "feat: initial Cuemath Flashcards implementation"
# create repo on github.com/<user>/cuemath-flashcards
git remote add origin git@github.com:<user>/cuemath-flashcards.git
git branch -M main
git push -u origin main
```

- [ ] **Step 3: Import to Vercel**

1. vercel.com → Add New → Project.
2. Select the GitHub repo.
3. Framework: Next.js (auto).
4. Build command: `pnpm build` (auto).
5. Output: `.next` (auto).
6. Install command: `pnpm install` (auto).

- [ ] **Step 4: Add env vars**

In Vercel Project Settings → Environment Variables, add all 9 vars from the README table. Mark them Production + Preview.

- [ ] **Step 5: Deploy**

Click **Deploy**. First build ~2 minutes. Copy the assigned `*.vercel.app` URL.

- [ ] **Step 6: Supabase redirect URL**

Supabase Dashboard → Authentication → URL Configuration → Site URL → set to the Vercel URL. Add same URL + `/auth/callback` under Redirect URLs.

- [ ] **Step 7: Smoke test on prod URL**

- Sign up via magic link (email deliverability). Redirect lands on `/library`.
- Upload a small PDF. Polling works. Deck flips to `ready`.
- Run a sprint. Ratings persist. Streak pill updates next day.

- [ ] **Step 8: Update README with live URL**

Add a line at the top of `README.md`:
```markdown
**Live:** https://<your-project>.vercel.app
```

---

## Self-Review Checklist

**Spec coverage (delta from Plan 4):**
- ✅ Stitch design system + mockups + frontend-design mapping: Task 0.
- ✅ Fonts (Plus Jakarta + Nunito): Task 1.
- ✅ Landing polish + trust strip: Task 2.
- ✅ Real streak: Task 3.
- ✅ Sprint dots (§7): Task 4.
- ✅ Card flip motion respecting reduced-motion (§7): Task 5.
- ✅ README for reviewers: Task 6.
- ✅ Deploy to Vercel: Task 7.
- ⏸ Onboarding flow: deferred (demo-deviations.md item 14).
- ⏸ Heatmap / predicted-retention: deferred.
- ⏸ Interference-pair adjacency: deferred.
- ⏸ Leech tray: deferred.

**Placeholder scan:** None.

**Type consistency:** No new types introduced. All changes are within existing components/pages.
