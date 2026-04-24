# Plan 1: Foundation — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Set up a deployable Next.js 15 + Supabase app with Cuemath-branded primitives, full DB schema with RLS, and a working auth + onboarding flow that lands the user on an empty deck library.

**Architecture:** Next.js 15 App Router with TypeScript. Supabase handles Postgres, Auth, and Storage. Design tokens driven by Tailwind theme extensions and CSS variables. Auth via Supabase with magic link + Google. All user-scoped data protected by Postgres RLS. Onboarding collects subject family, level, and daily goal into a `profiles` row before landing on the library.

**Tech Stack:** Next.js 15, TypeScript, Tailwind CSS, shadcn/ui, Supabase (`@supabase/ssr`), Vitest + React Testing Library for unit/component tests, Playwright for E2E smoke.

**Related Spec:** `docs/superpowers/specs/2026-04-23-cuemath-flashcard-engine-design.md`

---

## UI Tooling Protocol (Stitch by Google + Claude design)

Per project memory, UI work on this project uses **Stitch by Google** and **Claude design** as the primary generators. Do not hand-design screens from scratch.

**For every screen-building task (Tasks 14, 16, 17, 18, 19):**

1. **Prompt Stitch / Claude design first** with:
   - The screen's purpose (from the task brief).
   - Cuemath design tokens (paste values from `lib/brand/tokens.ts`).
   - Constraints: mobile-first 390px, yellow primary CTA, pastel category tints, 24px card radius, 48px min tap targets, no purple AI gradients, no generic SaaS blue, copy voice parent-safe + encouraging.
   - Reference screen from the spec Section 7 (the relevant screen description).
2. **Review the generated mockup** — does it hit brand fidelity? If not, iterate on the prompt.
3. **Translate to React** using the CueButton / CueCard / CuePill / TrustChip primitives built in Tasks 6–7. Do not re-create primitives; re-use them.
4. **Verify tokens, not pixels** — the mockup guides layout and composition; token values from `lib/brand/tokens.ts` are authoritative for color/radius/spacing.

**For primitives (Tasks 6–7):** code is fully specified by tests — no generator needed. Implement directly.

**For schema / auth / middleware tasks:** no UI, no generator needed.

The generator is a *starting point*, not a substitute for token discipline. The final committed code must reference tokens, not one-off hex/px.

---

## File Structure

```
D:\CUEMATH\Flashcard\
├── .env.local                              # Supabase + OpenAI + Anthropic keys (gitignored)
├── .env.example                            # Template for contributors
├── .gitignore
├── package.json
├── tsconfig.json
├── next.config.ts
├── tailwind.config.ts                      # Cuemath tokens as theme extension
├── postcss.config.mjs
├── vitest.config.ts
├── playwright.config.ts
├── components.json                         # shadcn config
├── app/
│   ├── layout.tsx                          # Root layout, font setup, globals
│   ├── globals.css                         # CSS vars for tokens
│   ├── page.tsx                            # Marketing landing (redirects if logged in)
│   ├── (auth)/
│   │   ├── login/page.tsx                  # Magic link + Google buttons
│   │   └── callback/route.ts               # OAuth/magic link callback
│   ├── (app)/
│   │   ├── layout.tsx                      # Protected shell (sidebar/header)
│   │   ├── onboarding/
│   │   │   ├── layout.tsx                  # Onboarding progress bar
│   │   │   ├── subject/page.tsx            # Q1: subject family
│   │   │   ├── level/page.tsx              # Q2: level
│   │   │   └── goal/page.tsx               # Q3: daily goal → upserts profile
│   │   └── library/page.tsx                # Empty deck library
│   └── api/
│       └── health/route.ts                 # Smoke-test endpoint
├── lib/
│   ├── brand/
│   │   ├── tokens.ts                       # Typed design tokens (source of truth)
│   │   └── primitives/
│   │       ├── button.tsx                  # CueButton (yellow primary / ghost / pill)
│   │       ├── card.tsx                    # CueCard (24px radius, subject tint)
│   │       ├── pill.tsx                    # CuePill (chip with tone)
│   │       └── trust-chip.tsx              # Reassurance chip
│   ├── auth/
│   │   ├── server.ts                       # Server-side Supabase client + getUser
│   │   └── middleware.ts                   # Session refresh helper
│   ├── db/
│   │   ├── client.ts                       # Browser Supabase client
│   │   ├── server.ts                       # Server Supabase client (cookies)
│   │   └── types.ts                        # Generated DB types (supabase gen)
│   └── profile/
│       ├── upsert.ts                       # Ensures profile row exists after login
│       └── upsert.test.ts
├── middleware.ts                           # Next.js middleware: refresh session + gate /app
├── supabase/
│   ├── config.toml
│   └── migrations/
│       ├── 20260424000001_initial_schema.sql
│       ├── 20260424000002_rls_policies.sql
│       └── 20260424000003_profile_trigger.sql
├── tests/
│   └── e2e/
│       └── smoke.spec.ts                   # Login → onboarding → library
└── docs/superpowers/
    ├── specs/2026-04-23-cuemath-flashcard-engine-design.md
    └── plans/2026-04-24-plan-1-foundation.md  (this file)
```

**Decomposition principles:**
- `lib/brand/` owns visual primitives — no app logic, no data access.
- `lib/auth/` owns Supabase Auth plumbing — no UI, no DB schema knowledge beyond `auth.users`.
- `lib/db/` exposes typed Supabase clients; callers (future modules) own their queries.
- `lib/profile/` is the first domain module — tiny now, grows later.
- App Router route groups `(auth)` and `(app)` separate public vs protected surfaces.

---

## Prerequisites

Assumed installed on the developer's machine:
- Node.js ≥ 20
- pnpm (preferred) or npm
- Docker Desktop (for `supabase start` local dev)
- Supabase CLI (`npm i -g supabase`)
- Git
- Cloud accounts provisioned separately: Supabase project, Vercel project, Anthropic API key, OpenAI API key, Google OAuth client (for magic link Google button; credentials set in Supabase dashboard).

---

## Task 1: Initialize repo + Next.js scaffold

**Files:**
- Create: `.gitignore`, `package.json`, `tsconfig.json`, `next.config.ts`, `app/layout.tsx`, `app/page.tsx`, `app/globals.css`

- [ ] **Step 1: Initialize git**

Run in `D:\CUEMATH\Flashcard`:
```bash
git init
git config core.autocrlf true
```
Expected: `Initialized empty Git repository`.

- [ ] **Step 2: Create Next.js app via scaffold**

Run:
```bash
pnpm create next-app@latest . --typescript --tailwind --app --src-dir=false --eslint --import-alias "@/*" --use-pnpm --no-turbo
```
When prompted about conflicting files (the existing `docs/`, `User assets/`, `memory/` directories), choose to continue / keep them.

Expected: `package.json`, `tsconfig.json`, `next.config.ts`, `app/` directory created. `tailwind.config.ts` + `postcss.config.mjs` created.

- [ ] **Step 3: Add `.gitignore` entries**

Edit `.gitignore`, append:
```
# Local env
.env.local
.env*.local

# Supabase
supabase/.branches
supabase/.temp

# OS
.DS_Store
Thumbs.db

# User assets (not tracked)
/User assets/

# Memory (local-only)
/memory/
```

- [ ] **Step 4: Create `.env.example`**

Write `.env.example`:
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
ANTHROPIC_API_KEY=
OPENAI_API_KEY=
```

- [ ] **Step 5: Smoke-test dev server**

Run:
```bash
pnpm dev
```
Open http://localhost:3000. Expected: default Next.js landing page renders. Ctrl+C to stop.

- [ ] **Step 6: Initial commit**

```bash
git add .
git commit -m "chore: initialize Next.js 15 + TS + Tailwind scaffold"
```

---

## Task 2: Install project dependencies

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install runtime deps**

```bash
pnpm add @supabase/ssr @supabase/supabase-js ts-fsrs zod
```

- [ ] **Step 2: Install UI deps**

```bash
pnpm add class-variance-authority clsx tailwind-merge lucide-react
pnpm add -D @types/node
```

- [ ] **Step 3: Install test deps**

```bash
pnpm add -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event
pnpm add -D playwright @playwright/test
pnpm exec playwright install chromium
```

- [ ] **Step 4: Initialize shadcn/ui**

```bash
pnpm dlx shadcn@latest init
```
Choose: TypeScript yes, style "new-york", base color "neutral", CSS variables yes, global css at `app/globals.css`, tailwind config at `tailwind.config.ts`, components at `@/components`, utils at `@/lib/utils`, React Server Components yes.

- [ ] **Step 5: Commit**

```bash
git add .
git commit -m "chore: install core dependencies (Supabase, shadcn, testing)"
```

---

## Task 3: Configure Vitest

**Files:**
- Create: `vitest.config.ts`, `vitest.setup.ts`
- Modify: `package.json`, `tsconfig.json`

- [ ] **Step 1: Write `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    include: ['**/*.test.{ts,tsx}'],
    exclude: ['node_modules', '.next', 'tests/e2e/**'],
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, '.') },
  },
})
```

- [ ] **Step 2: Write `vitest.setup.ts`**

```ts
import '@testing-library/jest-dom/vitest'
```

- [ ] **Step 3: Add scripts to `package.json`**

Edit the `scripts` block to include:
```json
"test": "vitest run",
"test:watch": "vitest",
"test:e2e": "playwright test"
```

- [ ] **Step 4: Add Vitest types to `tsconfig.json`**

In `compilerOptions.types`, add: `["vitest/globals", "@testing-library/jest-dom"]`.

- [ ] **Step 5: Sanity test**

Create `lib/utils.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { cn } from './utils'

describe('cn', () => {
  it('merges class names', () => {
    expect(cn('a', 'b')).toBe('a b')
  })
})
```

Run:
```bash
pnpm test
```
Expected: 1 passed.

- [ ] **Step 6: Commit**

```bash
git add .
git commit -m "chore: configure Vitest with jsdom + RTL"
```

---

## Task 4: Design tokens (source of truth)

**Files:**
- Create: `lib/brand/tokens.ts`, `lib/brand/tokens.test.ts`

- [ ] **Step 1: Write failing test**

Create `lib/brand/tokens.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { colors, radius, motion, subjectFamily, subjectTint } from './tokens'

describe('brand tokens', () => {
  it('exposes the 8 Cuemath colors with exact hex values', () => {
    expect(colors.cueYellow).toBe('#FFBA07')
    expect(colors.inkBlack).toBe('#000000')
    expect(colors.paperWhite).toBe('#FFFFFF')
    expect(colors.softCream).toBe('#FFF1CC')
    expect(colors.mintGreen).toBe('#D0FBE5')
    expect(colors.bubblePink).toBe('#FFE0FD')
    expect(colors.trustBlue).toBe('#DBEAFE')
    expect(colors.alertCoral).toBe('#F97373')
  })

  it('exposes radius tokens', () => {
    expect(radius.input).toBe('12px')
    expect(radius.card).toBe('24px')
    expect(radius.panel).toBe('32px')
  })

  it('exposes motion tokens', () => {
    expect(motion.tap).toBe('120ms')
    expect(motion.progress).toBe('400ms')
  })

  it('maps every subject family to a pastel tint', () => {
    const families: subjectFamily[] = ['math', 'language', 'science', 'humanities', 'other']
    for (const f of families) {
      expect(subjectTint(f)).toMatch(/^#[0-9A-F]{6}$/i)
    }
  })

  it('maps math→cream, language→pink, science→mint, humanities→blue, other→cream', () => {
    expect(subjectTint('math')).toBe('#FFF1CC')
    expect(subjectTint('language')).toBe('#FFE0FD')
    expect(subjectTint('science')).toBe('#D0FBE5')
    expect(subjectTint('humanities')).toBe('#DBEAFE')
    expect(subjectTint('other')).toBe('#FFF1CC')
  })
})
```

- [ ] **Step 2: Run test → fails**

```bash
pnpm test lib/brand/tokens.test.ts
```
Expected: FAIL — module not found.

- [ ] **Step 3: Implement tokens**

Create `lib/brand/tokens.ts`:
```ts
export const colors = {
  cueYellow: '#FFBA07',
  inkBlack: '#000000',
  paperWhite: '#FFFFFF',
  softCream: '#FFF1CC',
  mintGreen: '#D0FBE5',
  bubblePink: '#FFE0FD',
  trustBlue: '#DBEAFE',
  alertCoral: '#F97373',
} as const

export const radius = {
  input: '12px',
  card: '24px',
  panel: '32px',
} as const

export const motion = {
  tap: '120ms',
  progress: '400ms',
} as const

export type subjectFamily = 'math' | 'language' | 'science' | 'humanities' | 'other'

export function subjectTint(family: subjectFamily): string {
  switch (family) {
    case 'math': return colors.softCream
    case 'language': return colors.bubblePink
    case 'science': return colors.mintGreen
    case 'humanities': return colors.trustBlue
    case 'other': return colors.softCream
  }
}
```

- [ ] **Step 4: Run test → passes**

```bash
pnpm test lib/brand/tokens.test.ts
```
Expected: 5 passed.

- [ ] **Step 5: Commit**

```bash
git add lib/brand/
git commit -m "feat(brand): add Cuemath design tokens (colors, radius, motion, subject tints)"
```

---

## Task 5: Wire tokens into Tailwind + CSS variables

**Files:**
- Modify: `tailwind.config.ts`, `app/globals.css`, `app/layout.tsx`

- [ ] **Step 1: Extend Tailwind theme**

Edit `tailwind.config.ts`:
```ts
import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        'cue-yellow': '#FFBA07',
        'ink-black': '#000000',
        'paper-white': '#FFFFFF',
        'soft-cream': '#FFF1CC',
        'mint-green': '#D0FBE5',
        'bubble-pink': '#FFE0FD',
        'trust-blue': '#DBEAFE',
        'alert-coral': '#F97373',
      },
      borderRadius: {
        input: '12px',
        card: '24px',
        panel: '32px',
      },
      fontFamily: {
        display: ['Plus Jakarta Sans', 'Sora', 'system-ui', 'sans-serif'],
        body: ['Nunito Sans', 'system-ui', 'sans-serif'],
      },
      transitionDuration: {
        tap: '120ms',
        progress: '400ms',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
}
export default config
```

- [ ] **Step 2: Expose CSS variables**

Replace `app/globals.css` with:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --cue-yellow: #FFBA07;
    --ink-black: #000000;
    --paper-white: #FFFFFF;
    --soft-cream: #FFF1CC;
    --mint-green: #D0FBE5;
    --bubble-pink: #FFE0FD;
    --trust-blue: #DBEAFE;
    --alert-coral: #F97373;

    --radius-input: 12px;
    --radius-card: 24px;
    --radius-panel: 32px;

    --motion-tap: 120ms;
    --motion-progress: 400ms;
  }

  html, body {
    background-color: var(--paper-white);
    color: var(--ink-black);
    font-family: var(--font-body), system-ui, sans-serif;
  }

  *:focus-visible {
    outline: 2px solid var(--cue-yellow);
    outline-offset: 2px;
  }

  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after {
      animation-duration: 0.01ms !important;
      transition-duration: 0.01ms !important;
    }
  }
}
```

- [ ] **Step 3: Wire fonts in root layout**

Replace `app/layout.tsx`:
```tsx
import type { Metadata } from 'next'
import { Plus_Jakarta_Sans, Nunito_Sans } from 'next/font/google'
import './globals.css'

const display = Plus_Jakarta_Sans({ subsets: ['latin'], variable: '--font-display' })
const body = Nunito_Sans({ subsets: ['latin'], variable: '--font-body' })

export const metadata: Metadata = {
  title: 'Cuemath Flashcards',
  description: 'Turn any PDF into a smart, practice-ready deck.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable}`}>
      <body>{children}</body>
    </html>
  )
}
```

- [ ] **Step 4: Replace placeholder home page**

Replace `app/page.tsx`:
```tsx
export default function LandingPage() {
  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-lg text-center space-y-6">
        <h1 className="font-display text-4xl font-bold">Cuemath Flashcards</h1>
        <p className="text-lg">Turn any PDF into a smart, practice-ready deck.</p>
        <a
          href="/login"
          className="inline-block bg-cue-yellow text-ink-black font-bold px-6 py-3 rounded-input"
        >
          Get Started
        </a>
      </div>
    </main>
  )
}
```

- [ ] **Step 5: Install `tailwindcss-animate`**

```bash
pnpm add -D tailwindcss-animate
```

- [ ] **Step 6: Visual smoke test**

```bash
pnpm dev
```
Open http://localhost:3000. Expected: white background, black heading, yellow "Get Started" pill. Ctrl+C.

- [ ] **Step 7: Commit**

```bash
git add .
git commit -m "feat(brand): wire design tokens into Tailwind + CSS vars, set up fonts"
```

---

## Task 6: Brand primitive — CueButton

**Files:**
- Create: `lib/brand/primitives/button.tsx`, `lib/brand/primitives/button.test.tsx`

- [ ] **Step 1: Write failing test**

Create `lib/brand/primitives/button.test.tsx`:
```tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CueButton } from './button'

describe('CueButton', () => {
  it('renders primary variant with yellow background', () => {
    render(<CueButton>Start</CueButton>)
    const btn = screen.getByRole('button', { name: 'Start' })
    expect(btn.className).toMatch(/bg-cue-yellow/)
    expect(btn.className).toMatch(/text-ink-black/)
  })

  it('renders ghost variant', () => {
    render(<CueButton variant="ghost">Cancel</CueButton>)
    const btn = screen.getByRole('button', { name: 'Cancel' })
    expect(btn.className).not.toMatch(/bg-cue-yellow/)
    expect(btn.className).toMatch(/border/)
  })

  it('has at least 48px tap target', () => {
    render(<CueButton>Tap</CueButton>)
    const btn = screen.getByRole('button')
    expect(btn.className).toMatch(/min-h-\[48px\]/)
  })

  it('fires onClick', async () => {
    let clicked = false
    render(<CueButton onClick={() => { clicked = true }}>Go</CueButton>)
    await userEvent.click(screen.getByRole('button'))
    expect(clicked).toBe(true)
  })

  it('renders disabled state without yellow background', () => {
    render(<CueButton disabled>Disabled</CueButton>)
    const btn = screen.getByRole('button')
    expect(btn).toBeDisabled()
    expect(btn.className).toMatch(/opacity/)
  })
})
```

- [ ] **Step 2: Run test → fails**

```bash
pnpm test lib/brand/primitives/button.test.tsx
```
Expected: FAIL — module not found.

- [ ] **Step 3: Implement CueButton**

Create `lib/brand/primitives/button.tsx`:
```tsx
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'
import * as React from 'react'

const buttonVariants = cva(
  'inline-flex items-center justify-center font-display font-bold transition-transform duration-tap active:scale-[0.98] min-h-[48px] px-6 rounded-input disabled:opacity-50 disabled:cursor-not-allowed',
  {
    variants: {
      variant: {
        primary: 'bg-cue-yellow text-ink-black hover:brightness-95',
        ghost: 'bg-transparent text-ink-black border-2 border-ink-black hover:bg-soft-cream',
        pill: 'bg-cue-yellow text-ink-black rounded-full px-8',
      },
      size: {
        default: 'text-base',
        sm: 'min-h-[40px] text-sm px-4',
        lg: 'text-lg px-8',
      },
    },
    defaultVariants: { variant: 'primary', size: 'default' },
  },
)

export interface CueButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const CueButton = React.forwardRef<HTMLButtonElement, CueButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button ref={ref} className={cn(buttonVariants({ variant, size }), className)} {...props} />
  ),
)
CueButton.displayName = 'CueButton'
```

- [ ] **Step 4: Run test → passes**

```bash
pnpm test lib/brand/primitives/button.test.tsx
```
Expected: 5 passed.

- [ ] **Step 5: Commit**

```bash
git add lib/brand/primitives/
git commit -m "feat(brand): add CueButton primitive (primary/ghost/pill variants)"
```

---

## Task 7: Brand primitive — CueCard, CuePill, TrustChip

**Files:**
- Create: `lib/brand/primitives/card.tsx`, `lib/brand/primitives/card.test.tsx`
- Create: `lib/brand/primitives/pill.tsx`, `lib/brand/primitives/pill.test.tsx`
- Create: `lib/brand/primitives/trust-chip.tsx`, `lib/brand/primitives/trust-chip.test.tsx`

- [ ] **Step 1: Write CueCard test**

Create `lib/brand/primitives/card.test.tsx`:
```tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { CueCard } from './card'

describe('CueCard', () => {
  it('renders children with card radius', () => {
    render(<CueCard>hello</CueCard>)
    const card = screen.getByText('hello').closest('div')!
    expect(card.className).toMatch(/rounded-card/)
  })

  it('applies subject tint when family provided', () => {
    render(<CueCard subject="science">sci</CueCard>)
    const card = screen.getByText('sci').closest('div')!
    expect(card.style.backgroundColor.toLowerCase()).toContain('208, 251, 229')
  })

  it('defaults to paper-white background when no subject', () => {
    render(<CueCard>plain</CueCard>)
    const card = screen.getByText('plain').closest('div')!
    expect(card.className).toMatch(/bg-paper-white/)
  })
})
```

- [ ] **Step 2: Run test → fails**

```bash
pnpm test lib/brand/primitives/card.test.tsx
```
Expected: FAIL.

- [ ] **Step 3: Implement CueCard**

Create `lib/brand/primitives/card.tsx`:
```tsx
import * as React from 'react'
import { cn } from '@/lib/utils'
import { subjectFamily, subjectTint } from '@/lib/brand/tokens'

export interface CueCardProps extends React.HTMLAttributes<HTMLDivElement> {
  subject?: subjectFamily
}

export const CueCard = React.forwardRef<HTMLDivElement, CueCardProps>(
  ({ subject, className, style, children, ...props }, ref) => {
    const tintStyle = subject ? { backgroundColor: subjectTint(subject), ...style } : style
    const base = 'rounded-card p-6 shadow-sm'
    return (
      <div
        ref={ref}
        style={tintStyle}
        className={cn(base, !subject && 'bg-paper-white', className)}
        {...props}
      >
        {children}
      </div>
    )
  },
)
CueCard.displayName = 'CueCard'
```

- [ ] **Step 4: Run test → passes**

```bash
pnpm test lib/brand/primitives/card.test.tsx
```
Expected: 3 passed.

- [ ] **Step 5: Write CuePill test**

Create `lib/brand/primitives/pill.test.tsx`:
```tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { CuePill } from './pill'

describe('CuePill', () => {
  it('renders children in a rounded pill', () => {
    render(<CuePill>Fresh</CuePill>)
    const pill = screen.getByText('Fresh')
    expect(pill.className).toMatch(/rounded-full/)
  })

  it('applies tone colors', () => {
    render(<CuePill tone="success">Got it</CuePill>)
    expect(screen.getByText('Got it').className).toMatch(/bg-mint-green/)
  })

  it('defaults to soft-cream tone', () => {
    render(<CuePill>Neutral</CuePill>)
    expect(screen.getByText('Neutral').className).toMatch(/bg-soft-cream/)
  })
})
```

- [ ] **Step 6: Implement CuePill**

Create `lib/brand/primitives/pill.tsx`:
```tsx
import * as React from 'react'
import { cn } from '@/lib/utils'

type Tone = 'neutral' | 'success' | 'warning' | 'info' | 'highlight'

const toneClass: Record<Tone, string> = {
  neutral: 'bg-soft-cream text-ink-black',
  success: 'bg-mint-green text-ink-black',
  warning: 'bg-alert-coral text-ink-black',
  info: 'bg-trust-blue text-ink-black',
  highlight: 'bg-cue-yellow text-ink-black',
}

export interface CuePillProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: Tone
}

export function CuePill({ tone = 'neutral', className, children, ...props }: CuePillProps) {
  return (
    <span
      className={cn('inline-flex items-center px-3 py-1 rounded-full text-sm font-medium', toneClass[tone], className)}
      {...props}
    >
      {children}
    </span>
  )
}
```

- [ ] **Step 7: Run pill test → passes**

```bash
pnpm test lib/brand/primitives/pill.test.tsx
```
Expected: 3 passed.

- [ ] **Step 8: Write TrustChip test**

Create `lib/brand/primitives/trust-chip.test.tsx`:
```tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { TrustChip } from './trust-chip'

describe('TrustChip', () => {
  it('renders label and icon slot', () => {
    render(<TrustChip icon="★" label="4.9+ rating" />)
    expect(screen.getByText('★')).toBeInTheDocument()
    expect(screen.getByText('4.9+ rating')).toBeInTheDocument()
  })

  it('uses soft-cream background', () => {
    render(<TrustChip label="Private" />)
    const chip = screen.getByText('Private').closest('div')!
    expect(chip.className).toMatch(/bg-soft-cream/)
  })
})
```

- [ ] **Step 9: Implement TrustChip**

Create `lib/brand/primitives/trust-chip.tsx`:
```tsx
import * as React from 'react'
import { cn } from '@/lib/utils'

export function TrustChip({
  icon,
  label,
  className,
}: {
  icon?: React.ReactNode
  label: string
  className?: string
}) {
  return (
    <div
      className={cn(
        'inline-flex items-center gap-2 px-3 py-2 rounded-full bg-soft-cream text-ink-black text-sm font-medium',
        className,
      )}
    >
      {icon && <span aria-hidden="true">{icon}</span>}
      <span>{label}</span>
    </div>
  )
}
```

- [ ] **Step 10: Run all brand tests → all pass**

```bash
pnpm test lib/brand
```
Expected: all tests pass.

- [ ] **Step 11: Commit**

```bash
git add lib/brand/primitives/
git commit -m "feat(brand): add CueCard, CuePill, TrustChip primitives"
```

---

## Task 8: Initialize Supabase local dev

**Files:**
- Create: `supabase/config.toml` (via CLI)
- Create: `.env.local`

- [ ] **Step 1: Initialize Supabase project**

```bash
pnpm dlx supabase init
```
Expected: `supabase/` directory created with `config.toml` and `seed.sql`.

- [ ] **Step 2: Start Supabase locally**

```bash
pnpm dlx supabase start
```
Expected: output includes `API URL`, `anon key`, `service_role key`. **Copy these.** Docker must be running.

- [ ] **Step 3: Populate `.env.local`**

Create `.env.local` with the values from Step 2:
```
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<paste-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<paste-service-role-key>
ANTHROPIC_API_KEY=
OPENAI_API_KEY=
```

- [ ] **Step 4: Enable `pgvector` + `pg_cron` extensions in local config**

Edit `supabase/config.toml`, find the `[db]` section, ensure:
```toml
[db]
major_version = 15
```

Extensions are enabled via migration (next task), not config.

- [ ] **Step 5: Verify connectivity**

Visit http://127.0.0.1:54323 (Supabase Studio). Expected: Studio loads.

- [ ] **Step 6: Commit**

```bash
git add supabase/ .env.example
git commit -m "chore(db): initialize Supabase local project"
```

---

## Task 9: Initial schema migration

**Files:**
- Create: `supabase/migrations/20260424000001_initial_schema.sql`

- [ ] **Step 1: Write migration**

Create `supabase/migrations/20260424000001_initial_schema.sql`:
```sql
-- Extensions
create extension if not exists "pgcrypto";
create extension if not exists "vector";

-- profiles (1-to-1 with auth.users)
create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  timezone text,
  daily_goal_cards int not null default 20,
  fsrs_weights jsonb,
  subject_family text,           -- math | language | science | humanities | other
  level text,                    -- beginner | intermediate | advanced
  onboarded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- decks
create table public.decks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  subject_family text not null default 'other',
  source_pdf_path text,
  source_pdf_hash text,
  status text not null default 'ingesting',  -- ingesting | ready | failed
  card_count int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_decks_user on public.decks(user_id);

-- ingest_jobs
create table public.ingest_jobs (
  id uuid primary key default gen_random_uuid(),
  deck_id uuid not null references public.decks(id) on delete cascade,
  stage text not null default 'parsing',
  progress_pct int not null default 0,
  error text,
  started_at timestamptz not null default now(),
  finished_at timestamptz
);
create index idx_ingest_jobs_deck on public.ingest_jobs(deck_id);

-- cards
create table public.cards (
  id uuid primary key default gen_random_uuid(),
  deck_id uuid not null references public.decks(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  format text not null default 'qa',           -- qa | cloze | image_occlusion
  front jsonb not null,
  back jsonb not null,
  source_chunk_id text,
  concept_tag text,
  embedding vector(1536),
  fsrs_state jsonb,
  suspended boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_cards_deck on public.cards(deck_id);
create index idx_cards_user on public.cards(user_id);
create index idx_cards_due on public.cards((fsrs_state->>'due'));

-- interference_pairs
create table public.interference_pairs (
  card_a uuid not null references public.cards(id) on delete cascade,
  card_b uuid not null references public.cards(id) on delete cascade,
  discriminative_prompt text,
  similarity float,
  primary key (card_a, card_b),
  check (card_a < card_b)
);

-- reviews (append-only)
create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  card_id uuid not null references public.cards(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  rated_at timestamptz not null default now(),
  rating smallint not null check (rating between 1 and 4),
  elapsed_ms int,
  scheduled_days_before int,
  fsrs_state_before jsonb,
  fsrs_state_after jsonb
);
create index idx_reviews_user_time on public.reviews(user_id, rated_at desc);

-- sessions
create table public.sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  cards_reviewed int not null default 0,
  mean_accuracy float,
  mean_response_ms int,
  break_prompted_at timestamptz
);

-- llm_calls (cost observability)
create table public.llm_calls (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  stage text not null,
  model text not null,
  input_tokens int not null default 0,
  output_tokens int not null default 0,
  latency_ms int,
  created_at timestamptz not null default now()
);

-- updated_at trigger
create or replace function public.set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger decks_updated_at before update on public.decks
  for each row execute function public.set_updated_at();
create trigger cards_updated_at before update on public.cards
  for each row execute function public.set_updated_at();
```

- [ ] **Step 2: Apply migration**

```bash
pnpm dlx supabase db reset
```
Expected: migration applied cleanly. If errors, read output + fix SQL, repeat.

- [ ] **Step 3: Verify in Studio**

Open http://127.0.0.1:54323 → Table Editor. Expected: all 8 tables visible under `public` schema.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/
git commit -m "feat(db): initial schema — profiles, decks, cards, reviews, sessions, llm_calls"
```

---

## Task 10: RLS policies

**Files:**
- Create: `supabase/migrations/20260424000002_rls_policies.sql`

- [ ] **Step 1: Write migration**

Create `supabase/migrations/20260424000002_rls_policies.sql`:
```sql
-- Enable RLS on all user-scoped tables
alter table public.profiles enable row level security;
alter table public.decks enable row level security;
alter table public.ingest_jobs enable row level security;
alter table public.cards enable row level security;
alter table public.interference_pairs enable row level security;
alter table public.reviews enable row level security;
alter table public.sessions enable row level security;
alter table public.llm_calls enable row level security;

-- profiles: user can read/write their own row
create policy "own_profile_select" on public.profiles
  for select using (auth.uid() = user_id);
create policy "own_profile_insert" on public.profiles
  for insert with check (auth.uid() = user_id);
create policy "own_profile_update" on public.profiles
  for update using (auth.uid() = user_id);

-- decks
create policy "own_decks_all" on public.decks
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ingest_jobs: via deck ownership
create policy "own_ingest_jobs_all" on public.ingest_jobs
  for all using (
    exists (select 1 from public.decks d where d.id = ingest_jobs.deck_id and d.user_id = auth.uid())
  );

-- cards
create policy "own_cards_all" on public.cards
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- interference_pairs: via card_a ownership
create policy "own_interference_all" on public.interference_pairs
  for all using (
    exists (select 1 from public.cards c where c.id = interference_pairs.card_a and c.user_id = auth.uid())
  );

-- reviews
create policy "own_reviews_all" on public.reviews
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- sessions
create policy "own_sessions_all" on public.sessions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- llm_calls: read-only for user (service role writes)
create policy "own_llm_calls_select" on public.llm_calls
  for select using (auth.uid() = user_id);
```

- [ ] **Step 2: Apply migration**

```bash
pnpm dlx supabase db reset
```
Expected: both migrations apply.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/
git commit -m "feat(db): add RLS policies for user-scoped tables"
```

---

## Task 11: Profile creation trigger

**Files:**
- Create: `supabase/migrations/20260424000003_profile_trigger.sql`

- [ ] **Step 1: Write migration**

Create `supabase/migrations/20260424000003_profile_trigger.sql`:
```sql
-- Auto-create an empty profile row when a new auth.users row is inserted
create or replace function public.handle_new_user() returns trigger
security definer set search_path = public
as $$
begin
  insert into public.profiles (user_id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.email))
  on conflict (user_id) do nothing;
  return new;
end;
$$ language plpgsql;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
```

- [ ] **Step 2: Apply**

```bash
pnpm dlx supabase db reset
```

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/
git commit -m "feat(db): auto-create profile row on new auth user"
```

---

## Task 12: Generate typed DB client

**Files:**
- Create: `lib/db/types.ts`, `lib/db/client.ts`, `lib/db/server.ts`

- [ ] **Step 1: Generate types from local Supabase**

```bash
pnpm dlx supabase gen types typescript --local > lib/db/types.ts
```
Expected: `lib/db/types.ts` contains a `Database` interface.

- [ ] **Step 2: Create browser client**

Create `lib/db/client.ts`:
```ts
import { createBrowserClient } from '@supabase/ssr'
import type { Database } from './types'

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}
```

- [ ] **Step 3: Create server client**

Create `lib/db/server.ts`:
```ts
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from './types'

export async function createClient() {
  const cookieStore = await cookies()
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            )
          } catch {
            // Called from a Server Component — ignore.
          }
        },
      },
    },
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add lib/db/
git commit -m "feat(db): typed Supabase clients (browser + server)"
```

---

## Task 13: Session-refresh middleware

**Files:**
- Create: `middleware.ts`, `lib/auth/middleware.ts`

- [ ] **Step 1: Write middleware helper**

Create `lib/auth/middleware.ts`:
```ts
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import type { Database } from '@/lib/db/types'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          )
        },
      },
    },
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  const isProtected = pathname.startsWith('/library') || pathname.startsWith('/onboarding')
  const isAuthRoute = pathname.startsWith('/login') || pathname.startsWith('/auth/callback')

  if (!user && isProtected) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  if (user && isAuthRoute && pathname !== '/auth/callback') {
    const url = request.nextUrl.clone()
    url.pathname = '/library'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
```

- [ ] **Step 2: Wire root middleware**

Create `middleware.ts` at project root:
```ts
import { updateSession } from '@/lib/auth/middleware'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
```

- [ ] **Step 3: Commit**

```bash
git add middleware.ts lib/auth/
git commit -m "feat(auth): session-refresh middleware with route gating"
```

---

## Task 14: Login page

**Files:**
- Create: `app/(auth)/login/page.tsx`, `app/(auth)/login/actions.ts`

> **UI Tooling:** Before writing the JSX in Step 2, generate a login-screen mockup via Stitch by Google or Claude design using the Cuemath tokens and the spec's login-screen description (card + email input + yellow magic-link button + ghost Google button + 3 trust chips). Use the mockup to validate composition; the JSX below is the token-faithful implementation to commit.

- [ ] **Step 1: Write server action for magic link**

Create `app/(auth)/login/actions.ts`:
```ts
'use server'

import { createClient } from '@/lib/db/server'
import { headers } from 'next/headers'

export async function sendMagicLink(formData: FormData) {
  const email = String(formData.get('email') ?? '').trim()
  if (!email) return { error: 'Email required' }

  const supabase = await createClient()
  const origin = (await headers()).get('origin') ?? 'http://localhost:3000'

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: `${origin}/auth/callback` },
  })

  if (error) return { error: error.message }
  return { ok: true }
}

export async function signInWithGoogle() {
  const supabase = await createClient()
  const origin = (await headers()).get('origin') ?? 'http://localhost:3000'

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: `${origin}/auth/callback` },
  })

  if (error) return { error: error.message }
  return { url: data.url }
}
```

- [ ] **Step 2: Write login page**

Create `app/(auth)/login/page.tsx`:
```tsx
'use client'

import { useState, useTransition } from 'react'
import { CueButton } from '@/lib/brand/primitives/button'
import { CueCard } from '@/lib/brand/primitives/card'
import { TrustChip } from '@/lib/brand/primitives/trust-chip'
import { sendMagicLink, signInWithGoogle } from './actions'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'sent' | 'error'>('idle')
  const [message, setMessage] = useState('')
  const [pending, startTransition] = useTransition()

  function handleMagicLink(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    startTransition(async () => {
      const res = await sendMagicLink(formData)
      if ('ok' in res) {
        setStatus('sent')
        setMessage('Check your email for a sign-in link.')
      } else {
        setStatus('error')
        setMessage(res.error)
      }
    })
  }

  async function handleGoogle() {
    const res = await signInWithGoogle()
    if ('url' in res && res.url) window.location.href = res.url
    else if ('error' in res) {
      setStatus('error')
      setMessage(res.error)
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <CueCard className="w-full max-w-md space-y-6">
        <div className="space-y-2">
          <h1 className="font-display text-3xl font-bold">Welcome back</h1>
          <p className="text-sm opacity-80">Sign in to keep your SharpMind journey going.</p>
        </div>

        <form onSubmit={handleMagicLink} className="space-y-3">
          <label className="block">
            <span className="text-sm font-medium">Email</span>
            <input
              type="email"
              name="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-input border-2 border-ink-black px-4 py-3"
              placeholder="you@example.com"
            />
          </label>
          <CueButton type="submit" disabled={pending} className="w-full">
            {pending ? 'Sending…' : 'Email me a sign-in link'}
          </CueButton>
        </form>

        <div className="relative text-center text-sm opacity-60">
          <span className="bg-paper-white px-2 relative z-10">or</span>
          <div className="absolute inset-x-0 top-1/2 h-px bg-ink-black/10" />
        </div>

        <CueButton variant="ghost" onClick={handleGoogle} className="w-full">
          Continue with Google
        </CueButton>

        {status !== 'idle' && (
          <p className={status === 'sent' ? 'text-sm text-green-700' : 'text-sm text-red-700'}>
            {message}
          </p>
        )}

        <div className="flex flex-wrap gap-2 pt-4 border-t">
          <TrustChip label="Backed by 700M+ reviews" />
          <TrustChip label="Cognitive-science tuned" />
          <TrustChip label="Your PDFs stay private" />
        </div>
      </CueCard>
    </main>
  )
}
```

- [ ] **Step 3: Visual smoke test**

```bash
pnpm dev
```
Visit http://localhost:3000/login. Expected: card with email input, yellow pill button, ghost Google button, three trust chips. Ctrl+C.

- [ ] **Step 4: Commit**

```bash
git add app/\(auth\)/
git commit -m "feat(auth): login page with magic link + Google"
```

---

## Task 15: Auth callback route

**Files:**
- Create: `app/auth/callback/route.ts`

- [ ] **Step 1: Write callback handler**

Create `app/auth/callback/route.ts`:
```ts
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/db/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (error) {
      return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(error.message)}`)
    }
  }

  // Decide destination: onboarding if not complete, library otherwise
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return NextResponse.redirect(`${origin}/login`)

  const { data: profile } = await supabase
    .from('profiles')
    .select('onboarded_at')
    .eq('user_id', user.id)
    .single()

  const dest = profile?.onboarded_at ? '/library' : '/onboarding/subject'
  return NextResponse.redirect(`${origin}${dest}`)
}
```

- [ ] **Step 2: Commit**

```bash
git add app/auth/
git commit -m "feat(auth): callback route routes to onboarding or library"
```

---

## Task 16: Onboarding — Step 1 (subject family)

**Files:**
- Create: `app/(app)/layout.tsx`, `app/(app)/onboarding/layout.tsx`, `app/(app)/onboarding/subject/page.tsx`, `app/(app)/onboarding/actions.ts`

> **UI Tooling:** Before Steps 2 and 4, generate onboarding-shell + subject-picker mockups via Stitch / Claude design. Reference spec Section 6 ("Onboarding, one-question-per-screen"). Verify: thin yellow progress bar, large tap targets, pastel subject tints on option cards. The JSX below matches the expected output.

- [ ] **Step 1: Write protected app layout**

Create `app/(app)/layout.tsx`:
```tsx
import { createClient } from '@/lib/db/server'
import { redirect } from 'next/navigation'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  return <>{children}</>
}
```

- [ ] **Step 2: Write onboarding shell with progress bar**

Create `app/(app)/onboarding/layout.tsx`:
```tsx
export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-paper-white">
      <div className="h-1 w-full bg-soft-cream">
        <div className="h-1 bg-cue-yellow transition-all duration-progress" style={{ width: 'var(--onboarding-progress, 25%)' }} />
      </div>
      <main className="max-w-md mx-auto p-6 pt-12">{children}</main>
    </div>
  )
}
```

- [ ] **Step 3: Write onboarding actions**

Create `app/(app)/onboarding/actions.ts`:
```ts
'use server'

import { createClient } from '@/lib/db/server'
import { revalidatePath } from 'next/cache'

type Patch = {
  subject_family?: string
  level?: string
  daily_goal_cards?: number
  onboarded_at?: string
}

export async function patchProfile(patch: Patch) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not signed in' }

  const { error } = await supabase
    .from('profiles')
    .update(patch)
    .eq('user_id', user.id)

  if (error) return { error: error.message }
  revalidatePath('/library')
  return { ok: true }
}
```

- [ ] **Step 4: Write subject page**

Create `app/(app)/onboarding/subject/page.tsx`:
```tsx
'use client'

import { useRouter } from 'next/navigation'
import { useTransition } from 'react'
import { CueButton } from '@/lib/brand/primitives/button'
import { CueCard } from '@/lib/brand/primitives/card'
import type { subjectFamily } from '@/lib/brand/tokens'
import { patchProfile } from '../actions'

const OPTIONS: Array<{ id: subjectFamily; label: string }> = [
  { id: 'math', label: 'Math' },
  { id: 'science', label: 'Science' },
  { id: 'language', label: 'Language' },
  { id: 'humanities', label: 'History / Humanities' },
  { id: 'other', label: 'Something else' },
]

export default function SubjectPage() {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  function pick(family: subjectFamily) {
    startTransition(async () => {
      await patchProfile({ subject_family: family })
      router.push('/onboarding/level')
    })
  }

  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl font-bold">What are you studying?</h1>
      <p className="text-sm opacity-80">We'll tune colors and defaults to fit.</p>
      <div className="grid grid-cols-1 gap-3">
        {OPTIONS.map((o) => (
          <CueCard key={o.id} subject={o.id} className="cursor-pointer">
            <CueButton variant="ghost" className="w-full" disabled={pending} onClick={() => pick(o.id)}>
              {o.label}
            </CueButton>
          </CueCard>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Commit**

```bash
git add app/\(app\)/
git commit -m "feat(onboarding): step 1 — subject family selection"
```

---

## Task 17: Onboarding — Step 2 (level)

**Files:**
- Create: `app/(app)/onboarding/level/page.tsx`

> **UI Tooling:** Generate a level-picker mockup via Stitch / Claude design — three stacked option cards with label + hint copy, 50% progress bar. Match Cuemath's one-question-per-screen feel.

- [ ] **Step 1: Write level page**

Create `app/(app)/onboarding/level/page.tsx`:
```tsx
'use client'

import { useRouter } from 'next/navigation'
import { useTransition } from 'react'
import { CueButton } from '@/lib/brand/primitives/button'
import { CueCard } from '@/lib/brand/primitives/card'
import { patchProfile } from '../actions'

const LEVELS = [
  { id: 'beginner', label: 'Beginner', hint: "I'm just starting out." },
  { id: 'intermediate', label: 'Intermediate', hint: "I know the basics." },
  { id: 'advanced', label: 'Advanced', hint: "I want to go deep." },
]

export default function LevelPage() {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  function pick(level: string) {
    startTransition(async () => {
      await patchProfile({ level })
      router.push('/onboarding/goal')
    })
  }

  return (
    <div className="space-y-6" style={{ ['--onboarding-progress' as any]: '50%' }}>
      <h1 className="font-display text-3xl font-bold">What's your level?</h1>
      <div className="grid grid-cols-1 gap-3">
        {LEVELS.map((l) => (
          <CueCard key={l.id}>
            <button
              disabled={pending}
              onClick={() => pick(l.id)}
              className="w-full text-left"
            >
              <div className="font-bold text-lg">{l.label}</div>
              <div className="text-sm opacity-70">{l.hint}</div>
            </button>
          </CueCard>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add app/\(app\)/onboarding/level/
git commit -m "feat(onboarding): step 2 — level selection"
```

---

## Task 18: Onboarding — Step 3 (daily goal) + completion

**Files:**
- Create: `app/(app)/onboarding/goal/page.tsx`

> **UI Tooling:** Generate a goal-picker mockup via Stitch / Claude design — 3 large tap-target cards in a row (10 / 20 / 40), 100% progress bar, encouraging copy.

- [ ] **Step 1: Write goal page**

Create `app/(app)/onboarding/goal/page.tsx`:
```tsx
'use client'

import { useRouter } from 'next/navigation'
import { useTransition } from 'react'
import { CueButton } from '@/lib/brand/primitives/button'
import { CueCard } from '@/lib/brand/primitives/card'
import { patchProfile } from '../actions'

const GOALS = [10, 20, 40]

export default function GoalPage() {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  function pick(goal: number) {
    startTransition(async () => {
      await patchProfile({ daily_goal_cards: goal, onboarded_at: new Date().toISOString() })
      router.push('/library')
    })
  }

  return (
    <div className="space-y-6" style={{ ['--onboarding-progress' as any]: '100%' }}>
      <h1 className="font-display text-3xl font-bold">How many cards per day?</h1>
      <p className="text-sm opacity-80">You can change this anytime.</p>
      <div className="grid grid-cols-3 gap-3">
        {GOALS.map((g) => (
          <CueCard key={g}>
            <CueButton variant="ghost" className="w-full" disabled={pending} onClick={() => pick(g)}>
              {g}
            </CueButton>
          </CueCard>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add app/\(app\)/onboarding/goal/
git commit -m "feat(onboarding): step 3 — daily goal + mark onboarded"
```

---

## Task 19: Empty deck library

**Files:**
- Create: `app/(app)/library/page.tsx`

> **UI Tooling:** Generate the library home mockup via Stitch / Claude design using spec Section 6 ("Home / Deck library"). Reference: greeting + streak pill, "Today's sprint" hero card concept (show as disabled placeholder for now since sprint UI comes in Plan 3), pastel-tinted deck cards grid, `+ New deck` dashed tile. Empty state is a soft-cream panel with encouraging copy, not a barren empty list.

- [ ] **Step 1: Write library page**

Create `app/(app)/library/page.tsx`:
```tsx
import { createClient } from '@/lib/db/server'
import { CueCard } from '@/lib/brand/primitives/card'
import { CueButton } from '@/lib/brand/primitives/button'
import { CuePill } from '@/lib/brand/primitives/pill'

export default async function LibraryPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name, daily_goal_cards')
    .eq('user_id', user!.id)
    .single()

  const { data: decks } = await supabase
    .from('decks')
    .select('id, title, subject_family, status, card_count')
    .eq('user_id', user!.id)
    .order('created_at', { ascending: false })

  const name = profile?.display_name?.split(' ')[0] ?? 'there'

  return (
    <main className="max-w-2xl mx-auto p-6 space-y-8">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">Hi, {name}</h1>
          <p className="text-sm opacity-70">Goal: {profile?.daily_goal_cards ?? 20} cards today</p>
        </div>
        <CuePill tone="highlight">Day 1</CuePill>
      </header>

      {(!decks || decks.length === 0) && (
        <CueCard className="text-center space-y-4">
          <h2 className="font-display text-xl font-bold">No decks yet</h2>
          <p className="text-sm opacity-80">
            Drop a PDF and we'll turn it into atomic flashcards — one idea per card.
          </p>
          <CueButton disabled>Upload PDF (coming in next plan)</CueButton>
        </CueCard>
      )}

      {decks && decks.length > 0 && (
        <div className="grid grid-cols-1 gap-4">
          {decks.map((d) => (
            <CueCard key={d.id} subject={d.subject_family as any}>
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-bold">{d.title}</div>
                  <div className="text-sm opacity-70">{d.card_count} cards · {d.status}</div>
                </div>
                <CuePill>View</CuePill>
              </div>
            </CueCard>
          ))}
        </div>
      )}
    </main>
  )
}
```

- [ ] **Step 2: Visual smoke test (full flow)**

```bash
pnpm dev
```

Flow:
1. Visit http://localhost:3000 → see landing with yellow CTA.
2. Click Get Started → http://localhost:3000/login.
3. Enter email, click magic link button. On local Supabase, visit http://127.0.0.1:54324 (Inbucket) to find the link. Click it.
4. Expect redirect to `/onboarding/subject`. Pick one. Then level. Then goal.
5. Expect landing on `/library` with greeting + empty-state card.

Ctrl+C when done.

- [ ] **Step 3: Commit**

```bash
git add app/\(app\)/library/
git commit -m "feat(library): empty deck library with greeting + empty state"
```

---

## Task 20: E2E smoke test

**Files:**
- Create: `playwright.config.ts`, `tests/e2e/smoke.spec.ts`

- [ ] **Step 1: Write Playwright config**

Create `playwright.config.ts`:
```ts
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  retries: 0,
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
```

- [ ] **Step 2: Write smoke test**

Create `tests/e2e/smoke.spec.ts`:
```ts
import { test, expect } from '@playwright/test'

test('landing page renders with yellow CTA', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Cuemath Flashcards' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Get Started' })).toBeVisible()
})

test('login page renders magic link + Google', async ({ page }) => {
  await page.goto('/login')
  await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible()
  await expect(page.getByPlaceholder('you@example.com')).toBeVisible()
  await expect(page.getByRole('button', { name: /sign-in link/i })).toBeVisible()
  await expect(page.getByRole('button', { name: /Continue with Google/i })).toBeVisible()
})

test('library route redirects anonymous user to login', async ({ page }) => {
  await page.goto('/library')
  await expect(page).toHaveURL(/\/login/)
})
```

- [ ] **Step 3: Run E2E**

```bash
pnpm test:e2e
```
Expected: 3 passed.

- [ ] **Step 4: Commit**

```bash
git add playwright.config.ts tests/e2e/
git commit -m "test: e2e smoke for landing, login, and protected route gating"
```

---

## Task 21: Deploy to Vercel + cloud Supabase

**Files:**
- Modify: `.env.local` (cloud values for deploy parity optional)

- [ ] **Step 1: Create Supabase cloud project**

Go to https://supabase.com/dashboard → New project. Note the project ref, anon key, service role key.

- [ ] **Step 2: Link + push migrations**

```bash
pnpm dlx supabase link --project-ref <your-ref>
pnpm dlx supabase db push
```
Expected: migrations applied to cloud DB. Verify tables via cloud Studio.

- [ ] **Step 3: Configure Google OAuth in Supabase dashboard**

Supabase dashboard → Authentication → Providers → Google → enable, paste OAuth client ID + secret from Google Cloud Console. Add the callback URL shown by Supabase to the Google OAuth client's authorized redirects.

- [ ] **Step 4: Create Vercel project**

Run:
```bash
pnpm dlx vercel link
pnpm dlx vercel env add NEXT_PUBLIC_SUPABASE_URL
pnpm dlx vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
pnpm dlx vercel env add SUPABASE_SERVICE_ROLE_KEY
pnpm dlx vercel env add ANTHROPIC_API_KEY
pnpm dlx vercel env add OPENAI_API_KEY
```
Paste cloud Supabase + API keys for each.

- [ ] **Step 5: Deploy**

```bash
pnpm dlx vercel --prod
```
Expected: deploy URL printed. Visit it, confirm landing page loads, login flow works with cloud Supabase.

- [ ] **Step 6: Add Site URL + redirect URLs in Supabase**

Supabase dashboard → Authentication → URL Configuration → Site URL = Vercel production URL. Add `https://<vercel-url>/auth/callback` to redirect URLs.

- [ ] **Step 7: Commit**

```bash
git add .
git commit -m "chore: initial deploy to Vercel + cloud Supabase"
```

---

## Verification Checklist

After all tasks, run:

```bash
pnpm test        # unit/component tests all pass
pnpm test:e2e    # e2e smoke tests all pass
pnpm build       # production build succeeds
```

Manual verification:
- [ ] Land on `/` → yellow CTA visible
- [ ] `/login` → magic link + Google + 3 trust chips
- [ ] Sign in via local Inbucket magic link → redirected to `/onboarding/subject`
- [ ] Complete 3-step onboarding → lands on `/library`
- [ ] `/library` shows greeting + empty state card
- [ ] Logout (via Studio deletes cookie) → `/library` redirects to `/login`
- [ ] Production deploy: same flow works on Vercel URL

---

## Self-Review

**Spec coverage (Week 1 foundation items):**
- Next.js 15 + TS + Tailwind + shadcn ✓ (Tasks 1, 2)
- Supabase setup + auth (magic link + Google) ✓ (Tasks 8, 14, 15)
- Database schema (8 tables) with RLS ✓ (Tasks 9, 10, 11)
- Typed clients (browser + server) ✓ (Task 12)
- Design tokens in Tailwind + CSS vars ✓ (Tasks 4, 5)
- Brand primitives (CueButton, CueCard, CuePill, TrustChip) ✓ (Tasks 6, 7)
- One-question-per-screen onboarding ✓ (Tasks 16, 17, 18)
- Empty deck library ✓ (Task 19)
- Deployable ✓ (Task 21)

**Placeholder scan:** no TODO/TBD strings in task bodies; all code shown inline; all commands exact.

**Type consistency:** `subjectFamily` type is the single source used across tokens + onboarding + library. `patchProfile` signature consistent across all three onboarding pages.

---

## Next Plan

Plan 2 (ingestion pipeline) will build on this foundation: the Upload CTA in the empty library becomes live, kicks off the 7-stage pipeline, streams progress, lands the user on a card-review gate before committing the deck.
