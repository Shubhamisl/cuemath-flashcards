# Progress, Library, Settings Navigation Lag Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make navigation among `/library`, `/progress`, and `/profile` feel immediate while each screen's heavier Supabase data streams or loads behind stable page chrome.

**Architecture:** Move shared user/profile/nav data into the `(app)` layout so the top navigation is stable across sibling routes, then split each page into a fast shell plus Suspense-wrapped data panels. Add explicit route warming for the three primary nav links and verify with mobile/desktop Playwright checks.

**Tech Stack:** Next.js 16.2 App Router, React 19 Server Components, Supabase SSR, Tailwind CSS 4, Vitest, Playwright.

---

## Files

- Modify: `app/(app)/layout.tsx`
- Modify: `app/(app)/_components/top-nav.tsx`
- Modify: `app/(app)/_components/primary-nav-links.tsx`
- Modify: `app/(app)/library/page.tsx`
- Modify: `app/(app)/progress/page.tsx`
- Modify: `app/(app)/profile/page.tsx`
- Create: `app/(app)/_lib/app-shell-data.ts`
- Create: `app/(app)/_components/nav-route-warmer.tsx`
- Create: `tests/e2e/navigation-shell.spec.ts`

## Task 1: Shared App Shell Data

- [ ] **Step 1: Create `app/(app)/_lib/app-shell-data.ts`**

```ts
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/db/server'
import { computeStreak } from '@/lib/progress/streak'

export async function getAppShellData() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const now = new Date()
  const fortyDaysAgo = new Date(now.getTime() - 40 * 86400000)
  const [{ data: profile }, { data: sessions }] = await Promise.all([
    supabase
      .from('profiles')
      .select('display_name, onboarded_at')
      .eq('user_id', user.id)
      .single(),
    supabase
      .from('sessions')
      .select('started_at')
      .eq('user_id', user.id)
      .gte('started_at', fortyDaysAgo.toISOString()),
  ])

  if (!profile?.onboarded_at) redirect('/onboarding/subject')

  const fullName = profile.display_name ?? 'there'
  return {
    user,
    firstName: fullName.split(' ')[0] || 'there',
    streak: computeStreak((sessions ?? []).map((s) => s.started_at as string), now),
  }
}
```

- [ ] **Step 2: Update `app/(app)/layout.tsx` to render shared chrome once**

```tsx
import { TopNav } from './_components/top-nav'
import { getAppShellData } from './_lib/app-shell-data'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const shell = await getAppShellData()

  return (
    <>
      <TopNav name={shell.firstName} streak={shell.streak} />
      {children}
    </>
  )
}
```

- [ ] **Step 3: Remove duplicated `<TopNav />` calls from `library/page.tsx`, `progress/page.tsx`, and `profile/page.tsx`**

Delete each page-level `TopNav` import and JSX call. Keep page-specific profile reads only where the page needs fields outside shell data, such as settings form values.

- [ ] **Step 4: Run shell tests**

Run: `pnpm test app/(app)/_components/top-nav.test.tsx`

Expected: existing nav tests pass after imports remain unchanged.

## Task 2: Route Warming For Primary Navigation

- [ ] **Step 1: Create `app/(app)/_components/nav-route-warmer.tsx`**

```tsx
'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

const ROUTES = ['/library', '/progress', '/profile'] as const

export function NavRouteWarmer() {
  const router = useRouter()

  useEffect(() => {
    for (const route of ROUTES) router.prefetch(route)
  }, [router])

  return null
}
```

- [ ] **Step 2: Add `<NavRouteWarmer />` inside `TopNav`**

Import it in `app/(app)/_components/top-nav.tsx` and render it as the first child of `<nav>`. This complements Next's production viewport prefetch and makes dev testing closer to the intended route-switch behavior.

- [ ] **Step 3: Run nav tests**

Run: `pnpm test app/(app)/_components/top-nav.test.tsx`

Expected: tests pass after adding a `useRouter` mock with `prefetch: vi.fn()`.

## Task 3: Stream Heavy Page Bodies

- [ ] **Step 1: Split each target page into shell plus data component**

For each route, keep the `<main>` and page header in `page.tsx`, then move Supabase-heavy work into a local async component:

```tsx
import { Suspense } from 'react'
import { AppPageLoading } from '@/components/app-page-loading'

export default function ProgressPage() {
  return (
    <main className="min-h-screen">
      <Suspense fallback={<AppPageLoading title="Loading progress" />}>
        <ProgressPageData />
      </Suspense>
    </main>
  )
}

async function ProgressPageData() {
  // existing Supabase reads and dashboard JSX
}
```

Use the same shape for `LibraryPageData` and `ProfilePageData`. Avoid wrapping the shared nav in these Suspense boundaries because the layout already owns it.

- [ ] **Step 2: Keep route `loading.tsx` files**

Leave `app/(app)/library/loading.tsx`, `app/(app)/progress/loading.tsx`, and `app/(app)/profile/loading.tsx` in place. They still cover direct entry and cold navigations; the in-page Suspense boundary improves sibling transitions after the app shell has loaded.

- [ ] **Step 3: Validate with build**

Run: `pnpm build`

Expected: build completes without App Router warnings about uncached data blocking instant navigation.

## Task 4: Browser Verification

- [ ] **Step 1: Add `tests/e2e/navigation-shell.spec.ts`**

```ts
import { expect, test } from '@playwright/test'

test.use({ storageState: 'tests/e2e/.auth/local-user.json' })

test('primary app routes keep the shell visible on mobile and desktop', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/library')
  await expect(page.getByRole('navigation')).toBeVisible()
  await page.getByRole('link', { name: 'Progress' }).click()
  await expect(page.getByRole('navigation')).toBeVisible()
  await expect(page.getByRole('heading', { name: /curve|loading progress/i })).toBeVisible()
  await page.getByRole('link', { name: 'Profile' }).click()
  await expect(page.getByRole('navigation')).toBeVisible()
  await expect(page.getByRole('heading', { name: /settings|loading settings/i })).toBeVisible()

  await page.setViewportSize({ width: 1280, height: 900 })
  await page.getByRole('link', { name: 'Library' }).click()
  await expect(page.getByRole('navigation')).toBeVisible()
  await expect(page.locator('body')).not.toHaveCSS('overflow-x', 'scroll')
})
```

- [ ] **Step 2: Run focused e2e test**

Run: `pnpm test:e2e tests/e2e/navigation-shell.spec.ts`

Expected: mobile and desktop shell checks pass with no horizontal page scroll.

## Self-Review

- Spec coverage: the plan addresses all three reported screens: Library, Progress, and Settings/Profile.
- Placeholder scan: no placeholders remain.
- Risk: the plan intentionally avoids changing Supabase query shape until shell reuse and streaming are measured; deeper database optimization should follow only if route transitions still feel slow after these changes.
