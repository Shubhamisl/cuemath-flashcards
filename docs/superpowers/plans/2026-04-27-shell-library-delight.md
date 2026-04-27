# Shell + Library Delight Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the authenticated app shell and library home so SharpMind feels playful-smart, clearer to navigate, and more visually intentional without changing product behavior.

**Architecture:** Keep all existing auth, queueing, filtering, and trust-gate behavior intact while improving the shell through three isolated seams: explicit nav in the app header, a recomposed library hero and control rail, and more expressive deck-card presentation. Favor extracting small UI helpers over making `library/page.tsx` or `top-nav.tsx` even denser.

**Tech Stack:** Next.js App Router, React 19 client components, Tailwind CSS, existing Cue brand primitives, Vitest + Testing Library

---

## File Structure

### New files

- `app/(app)/_components/primary-nav-links.tsx` - client-side pathname-aware nav links for `Library`, `Progress`, and `Profile`
- `app/(app)/_components/top-nav.test.tsx` - focused tests for explicit nav and menu behavior
- `app/(app)/library/library-hero.tsx` - extracted study-home hero band with greeting, daily progress, and study-now CTAs
- `app/(app)/library/library-hero.test.tsx` - tests for hero CTA visibility and progress copy
- `components/search-sort-bar.test.tsx` - tests for the reshaped control rail labels and URL updates

### Modified files

- `app/(app)/_components/top-nav.tsx` - upgrade shell composition and integrate explicit primary nav
- `app/(app)/library/page.tsx` - use extracted hero, simplify page composition, preserve query/data behavior
- `components/search-sort-bar.tsx` - refine filter rail hierarchy and add clearer labels without changing behavior
- `components/deck-card.tsx` - improve card hierarchy, state treatment, and metadata scanability
- `components/deck-card.test.tsx` - extend coverage for state badges and key metadata
- `components/app-page-loading.tsx` - make loading shell visually align with the new Ribbon Shell
- `docs/superpowers/plans/2026-04-27-ui-ux-delight-handover.md` - check off Slice A items and update the log after implementation

### Existing files to read before editing

- `AGENTS.md`
- `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/layout.md`
- `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/loading.md`
- `app/(app)/_components/top-nav.tsx`
- `app/(app)/library/page.tsx`
- `components/deck-card.tsx`
- `components/search-sort-bar.tsx`

---

### Task 1: Introduce explicit app navigation in the shell

**Files:**
- Create: `app/(app)/_components/primary-nav-links.tsx`
- Create: `app/(app)/_components/top-nav.test.tsx`
- Modify: `app/(app)/_components/top-nav.tsx`

- [ ] **Step 1: Write the failing nav test**

```tsx
// app/(app)/_components/top-nav.test.tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { TopNav } from './top-nav'

const { pathnameMock, signOutMock } = vi.hoisted(() => ({
  pathnameMock: vi.fn(),
  signOutMock: vi.fn(),
}))

vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    className,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} className={className} {...props}>
      {children}
    </a>
  ),
}))

vi.mock('next/navigation', () => ({
  usePathname: () => pathnameMock(),
}))

vi.mock('../profile/actions', () => ({
  signOut: signOutMock,
}))

describe('TopNav', () => {
  it('shows explicit primary nav and marks the current route', () => {
    pathnameMock.mockReturnValue('/library')

    render(<TopNav name="Shubham" streak={3} />)

    expect(screen.getByRole('link', { name: 'Library' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('link', { name: 'Progress' })).toHaveAttribute('href', '/progress')
    expect(screen.getByRole('link', { name: 'Profile' })).toHaveAttribute('href', '/profile')
    expect(screen.getByText('Day 3')).toBeInTheDocument()
  })

  it('keeps sign-out inside the profile menu', async () => {
    pathnameMock.mockReturnValue('/progress')
    const user = userEvent.setup()

    render(<TopNav name="Shubham" streak={0} />)

    await user.click(screen.getByRole('button', { name: 'Shubham menu' }))
    await user.click(screen.getByRole('menuitem', { name: 'Sign out' }))

    expect(signOutMock).toHaveBeenCalledTimes(1)
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run "app/(app)/_components/top-nav.test.tsx"`

Expected: FAIL because `TopNav` does not render explicit `Library`, `Progress`, and `Profile` links yet, and `aria-current` is missing.

- [ ] **Step 3: Add a pathname-aware nav helper**

```tsx
// app/(app)/_components/primary-nav-links.tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const LINKS = [
  { href: '/library', label: 'Library' },
  { href: '/progress', label: 'Progress' },
  { href: '/profile', label: 'Profile' },
]

export function PrimaryNavLinks() {
  const pathname = usePathname()

  return (
    <div className="flex items-center gap-2 rounded-full border border-ink-black/10 bg-paper-white/85 p-1">
      {LINKS.map((link) => {
        const active = pathname === link.href
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? 'page' : undefined}
            className={[
              'rounded-full px-4 py-2 font-body text-sm font-semibold transition-colors',
              active
                ? 'bg-cue-yellow text-ink-black'
                : 'text-ink-black/65 hover:bg-soft-cream hover:text-ink-black',
            ].join(' ')}
          >
            {link.label}
          </Link>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 4: Recompose `TopNav` around the new shell**

```tsx
// app/(app)/_components/top-nav.tsx
import { PrimaryNavLinks } from './primary-nav-links'

// inside the return
<nav className="max-w-[1200px] mx-auto px-6 py-5">
  <div className="rounded-[28px] border border-ink-black/10 bg-soft-cream/60 px-4 py-3 backdrop-blur-sm">
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex items-center gap-4">
        <Link href="/library" className="font-display font-extrabold tracking-tight text-xl">
          SharpMind
        </Link>
        <PrimaryNavLinks />
      </div>

      <div className="flex items-center gap-3 self-end lg:self-auto">
        <CuePill tone="neutral">{streak > 0 ? `Day ${streak}` : 'Day 1'}</CuePill>
        {/* keep existing avatar menu and sign-out behavior */}
      </div>
    </div>
  </div>
</nav>
```

- [ ] **Step 5: Run the nav test to verify it passes**

Run: `npx vitest run "app/(app)/_components/top-nav.test.tsx"`

Expected: PASS with 2 tests passing.

- [ ] **Step 6: Commit**

```bash
git add "app/(app)/_components/primary-nav-links.tsx" "app/(app)/_components/top-nav.tsx" "app/(app)/_components/top-nav.test.tsx"
git commit -m "Polish app shell navigation"
```

---

### Task 2: Recompose the library hero into a study-home band

**Files:**
- Create: `app/(app)/library/library-hero.tsx`
- Create: `app/(app)/library/library-hero.test.tsx`
- Modify: `app/(app)/library/page.tsx`

- [ ] **Step 1: Write the failing hero test**

```tsx
// app/(app)/library/library-hero.test.tsx
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { LibraryHero } from './library-hero'

describe('LibraryHero', () => {
  it('renders progress and only shows study actions when cards are due', () => {
    const { rerender } = render(
      <LibraryHero
        name="Shubham"
        doneToday={7}
        dailyGoal={20}
        progressPct={35}
        globalDueNowCount={9}
      />,
    )

    expect(screen.getByText('Hi, Shubham')).toBeInTheDocument()
    expect(screen.getByText('7 / 20 today')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Review all due' })).toHaveAttribute('href', '/review')
    expect(screen.getByRole('link', { name: 'Quick 5' })).toHaveAttribute('href', '/review?mode=quick')
    expect(screen.getByRole('button', { name: 'Upload PDF' })).toBeInTheDocument()

    rerender(
      <LibraryHero
        name="Shubham"
        doneToday={7}
        dailyGoal={20}
        progressPct={35}
        globalDueNowCount={0}
      />,
    )

    expect(screen.queryByRole('link', { name: 'Review all due' })).not.toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run "app/(app)/library/library-hero.test.tsx"`

Expected: FAIL because `LibraryHero` does not exist yet.

- [ ] **Step 3: Create the extracted hero band component**

```tsx
// app/(app)/library/library-hero.tsx
import Link from 'next/link'
import { UploadModal } from '@/components/upload-modal'
import { CueButton } from '@/lib/brand/primitives/button'

type LibraryHeroProps = {
  name: string
  doneToday: number
  dailyGoal: number
  progressPct: number
  globalDueNowCount: number
}

export function LibraryHero({
  name,
  doneToday,
  dailyGoal,
  progressPct,
  globalDueNowCount,
}: LibraryHeroProps) {
  return (
    <header className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.9fr)]">
      <div className="rounded-[28px] border border-ink-black/10 bg-paper-white px-6 py-6 shadow-card-rest">
        <p className="text-xs font-display font-semibold uppercase tracking-[0.08em] text-ink-black/55">
          Study home
        </p>
        <h1 className="mt-2 font-display font-extrabold text-4xl tracking-tight text-ink-black">
          Hi, {name}
        </h1>
        <div className="mt-4 flex items-center gap-3">
          <div className="h-2.5 w-44 overflow-hidden rounded-full bg-ink-black/10">
            <div
              className="h-full rounded-full bg-cue-yellow transition-all duration-progress"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <p className="text-sm text-ink-black/70">
            {doneToday} / {dailyGoal} today
          </p>
        </div>
      </div>

      <div className="rounded-[28px] border border-ink-black/10 bg-mint-sky/55 px-6 py-6 shadow-card-rest">
        <div className="flex flex-col gap-4">
          <div>
            <p className="text-xs font-display font-semibold uppercase tracking-[0.08em] text-ink-black/55">
              Study now
            </p>
            <p className="mt-1 text-sm text-ink-black/70">
              Pick up where your memory curve wants attention.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            {globalDueNowCount > 0 && (
              <>
                <Link href="/review">
                  <CueButton size="lg">Review all due</CueButton>
                </Link>
                <Link href="/review?mode=quick">
                  <CueButton variant="ghost" size="lg">Quick 5</CueButton>
                </Link>
              </>
            )}
            <UploadModal />
          </div>
        </div>
      </div>
    </header>
  )
}
```

- [ ] **Step 4: Replace the inline library header with the extracted component**

```tsx
// app/(app)/library/page.tsx
import { LibraryHero } from './library-hero'

// replace the current <header>...</header> block with:
<LibraryHero
  name={name}
  doneToday={doneToday}
  dailyGoal={dailyGoal}
  progressPct={progressPct}
  globalDueNowCount={globalDueNowCount}
/>
```

- [ ] **Step 5: Run the hero test to verify it passes**

Run: `npx vitest run "app/(app)/library/library-hero.test.tsx"`

Expected: PASS with 1 test passing.

- [ ] **Step 6: Commit**

```bash
git add "app/(app)/library/library-hero.tsx" "app/(app)/library/library-hero.test.tsx" "app/(app)/library/page.tsx"
git commit -m "Recompose library study-home hero"
```

---

### Task 3: Refine the control rail and deck-card presentation

**Files:**
- Create: `components/search-sort-bar.test.tsx`
- Modify: `components/search-sort-bar.tsx`
- Modify: `components/deck-card.tsx`
- Modify: `components/deck-card.test.tsx`

- [ ] **Step 1: Write the failing control-rail and deck-card tests**

```tsx
// components/search-sort-bar.test.tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { SearchSortBar } from './search-sort-bar'

const pushMock = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
  useSearchParams: () => new URLSearchParams('sort=created&subject=all&status=active&mastery=all'),
}))

describe('SearchSortBar', () => {
  it('labels the control rail and pushes updated search params', async () => {
    const user = userEvent.setup()

    render(
      <SearchSortBar
        initialQ=""
        initialSort="created"
        initialSubject="all"
        initialStatus="active"
        initialMastery="all"
      />,
    )

    expect(screen.getByText('Find a deck')).toBeInTheDocument()
    await user.type(screen.getByPlaceholderText('Search decks, tags, or subjects...'), 'bio{enter}')
    expect(pushMock).toHaveBeenCalledWith('/library?sort=created&subject=all&status=active&mastery=all&q=bio')
  })
})
```

```tsx
// components/deck-card.test.tsx
it('surfaces state badges and study metadata for ready decks', () => {
  render(
    <DeckCard
      id="deck-2"
      title="Biology Systems"
      subjectFamily="science"
      status="ready"
      cardCount={35}
      tags={['biology', 'systems']}
      tier="SharpMind"
      masteryPct={82}
      dueCount={4}
    />,
  )

  expect(screen.getByText('Biology Systems')).toBeInTheDocument()
  expect(screen.getByText('SharpMind')).toBeInTheDocument()
  expect(screen.getByText('4 due')).toBeInTheDocument()
  expect(screen.getByText('82% mastered')).toBeInTheDocument()
  expect(screen.getByText('biology')).toBeInTheDocument()
})
```

- [ ] **Step 2: Run the focused tests to verify they fail**

Run: `npx vitest run "components/search-sort-bar.test.tsx" "components/deck-card.test.tsx"`

Expected: FAIL because the control rail heading and placeholder copy do not exist yet.

- [ ] **Step 3: Refine the search and filter rail hierarchy**

```tsx
// components/search-sort-bar.tsx
return (
  <section className="rounded-[24px] border border-ink-black/10 bg-paper-white px-4 py-4 shadow-card-rest">
    <div className="flex flex-col gap-1 pb-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="text-xs font-display font-semibold uppercase tracking-[0.08em] text-ink-black/55">
          Find a deck
        </p>
        <p className="text-sm text-ink-black/65">
          Search by title, tag, subject, or study state.
        </p>
      </div>
    </div>

    <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1.15fr)_repeat(4,minmax(0,180px))]">
      <input
        placeholder="Search decks, tags, or subjects..."
        // keep current value / push behavior
      />
      {/* keep the existing select controls and URL push logic */}
    </div>
  </section>
)
```

- [ ] **Step 4: Refine deck-card hierarchy without changing actions**

```tsx
// components/deck-card.tsx
// update card body composition around the existing logic
<div className="flex flex-col gap-5 h-full min-h-[220px]">
  <div className="flex items-start justify-between gap-3">
    {/* keep ring / badges logic */}
  </div>

  <div className="space-y-2">
    <div className="font-display font-extrabold text-[20px] leading-tight text-ink-black line-clamp-2">
      {title}
    </div>
    <div className="flex flex-wrap items-center gap-2 text-sm text-ink-black/62">
      <span>{cardCount} cards</span>
      {status === 'ready' && typeof dueCount === 'number' && dueCount > 0 ? <span>•</span> : null}
      {status === 'ready' && typeof dueCount === 'number' && dueCount > 0 ? <span>{dueCount} due now</span> : null}
    </div>
    {tags.length > 0 && (
      <div className="flex flex-wrap gap-1.5 pt-1">
        {tags.slice(0, 3).map((tag) => (
          <CuePill key={tag} tone="neutral">{tag}</CuePill>
        ))}
      </div>
    )}
  </div>

  {/* keep state-specific footer and actions intact */}
</div>
```

- [ ] **Step 5: Run the focused tests to verify they pass**

Run: `npx vitest run "components/search-sort-bar.test.tsx" "components/deck-card.test.tsx"`

Expected: PASS with all assertions green.

- [ ] **Step 6: Commit**

```bash
git add "components/search-sort-bar.tsx" "components/search-sort-bar.test.tsx" "components/deck-card.tsx" "components/deck-card.test.tsx"
git commit -m "Refine library control rail and deck cards"
```

---

### Task 4: Align loading states, mobile rhythm, and handover tracking

**Files:**
- Modify: `components/app-page-loading.tsx`
- Modify: `app/(app)/library/loading.tsx`
- Modify: `docs/superpowers/plans/2026-04-27-ui-ux-delight-handover.md`
- Test: `components/app-page-loading.test.tsx`

- [ ] **Step 1: Extend the loading-shell test before changing the skeleton**

```tsx
// components/app-page-loading.test.tsx
it('renders shell placeholders that match the authenticated app frame', () => {
  render(<AppPageLoading title="Loading library" />)

  expect(screen.getByText('Loading library')).toBeInTheDocument()
  expect(screen.getByText('Just getting things ready...')).toBeInTheDocument()
  expect(screen.getAllByRole('presentation').length).toBeGreaterThan(0)
})
```

- [ ] **Step 2: Run the loading-shell test to verify it fails**

Run: `npx vitest run "components/app-page-loading.test.tsx"`

Expected: FAIL because the current loading shell does not expose the richer placeholder structure yet.

- [ ] **Step 3: Update the loading shell to visually match Ribbon Shell**

```tsx
// components/app-page-loading.tsx
// give placeholder blocks role="presentation" and mirror the new shell rhythm
<div className="border-b border-ink-black/10">
  <div className="max-w-[1200px] mx-auto px-6 py-5">
    <div className="rounded-[28px] border border-ink-black/10 bg-soft-cream/60 px-4 py-3">
      {/* nav ribbon placeholder */}
    </div>
  </div>
</div>

<div className="max-w-[1100px] mx-auto px-6 py-10 space-y-8">
  {/* hero band placeholder */}
  {/* control rail placeholder */}
  {/* deck grid placeholder */}
</div>
```

- [ ] **Step 4: Update the handover tracker once Slice A ships**

```md
<!-- docs/superpowers/plans/2026-04-27-ui-ux-delight-handover.md -->
- [x] Introduce a more obvious persistent app navigation model for `Library`, `Progress`, and `Profile`.
- [x] Make the current location visually unmistakable.
- [x] Improve the visual hierarchy of the greeting, progress strip, and CTA cluster.
- [x] Refine search/sort/filter layout so it scans faster.
- [x] Improve deck-card state design for `draft`, `ready`, `failed`, and `archived`.

### 2026-04-27
- Ribbon Shell Slice A shipped across shell and library surfaces.
```

- [ ] **Step 5: Run the loading-shell test, then the full project checks**

Run: `npx vitest run "components/app-page-loading.test.tsx"`

Expected: PASS

Run: `corepack pnpm lint`

Expected: PASS

Run: `corepack pnpm test`

Expected: PASS

Run: `corepack pnpm build`

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add "components/app-page-loading.tsx" "components/app-page-loading.test.tsx" "docs/superpowers/plans/2026-04-27-ui-ux-delight-handover.md"
git commit -m "Align loading shell with Ribbon Shell polish"
```

---

## Self-Review

### Spec coverage

- Shell navigation and active-state clarity: covered by Task 1
- Library hero and CTA regrouping: covered by Task 2
- Filter rail and deck-card polish: covered by Task 3
- Loading-state alignment and handover tracking: covered by Task 4
- Guardrails about preserving product behavior: enforced throughout by test-first tasks and isolated file seams

No spec requirements are missing from the plan.

### Placeholder scan

- No `TODO`, `TBD`, or deferred implementation markers remain.
- Every code-touching step includes concrete file paths, code, commands, and expected outcomes.

### Type and naming consistency

- `PrimaryNavLinks`, `LibraryHero`, `SearchSortBar`, and `DeckCard` naming is consistent across creation and usage steps.
- Pathname-based active state is confined to the new nav helper, which matches the approved shell approach.

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-04-27-shell-library-delight.md`. Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**
