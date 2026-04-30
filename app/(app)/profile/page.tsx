import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { AppPageLoadingContent } from '@/components/app-page-loading'
import { ProfileForm } from './profile-form'
import type { subjectFamily } from '@/lib/brand/tokens'
import { getAppShellData } from '../_lib/app-shell-data'

export default function ProfilePage() {
  return (
    <main className="min-h-screen">
      <Suspense fallback={<AppPageLoadingContent title="Loading settings" />}>
        <ProfilePageData />
      </Suspense>
    </main>
  )
}

async function ProfilePageData() {
  const { user, profile } = await getAppShellData()

  if (!profile?.onboarded_at) redirect('/onboarding/subject')

  return (
      <div className="mx-auto max-w-[1100px] space-y-8 px-4 py-8 sm:px-6 sm:py-10">
        <header className="grid gap-4 lg:grid-cols-[0.72fr_0.28fr] lg:items-end">
          <div className="space-y-2">
            <p className="font-display text-xs font-semibold uppercase tracking-[0.08em] text-ink-black/60">
              Profile
            </p>
            <h1 className="max-w-[760px] font-display text-4xl font-extrabold tracking-tight text-ink-black sm:text-5xl">
              Make the study room feel like yours.
            </h1>
          </div>
          <p className="font-body text-sm leading-6 text-ink-black/70 lg:text-right">
            Set the defaults that shape every deck, sprint, and review queue.
          </p>
        </header>

        <div className="pb-20">
          <ProfileForm
            email={user.email ?? ''}
            initial={{
              display_name: profile.display_name ?? '',
              subject_family: (profile.subject_family ?? 'math') as subjectFamily,
              level: profile.level ?? 'intermediate',
              daily_goal_cards: profile.daily_goal_cards ?? 20,
              daily_new_cards_limit:
                profile.daily_new_cards_limit ?? Math.min(profile.daily_goal_cards ?? 20, 10),
            }}
          />
        </div>
      </div>
  )
}
