import { redirect } from 'next/navigation'
import { ProfileForm } from './profile-form'
import type { subjectFamily } from '@/lib/brand/tokens'
import { getAppShellData } from '../_lib/app-shell-data'

export default async function ProfilePage() {
  const { user, profile } = await getAppShellData()

  if (!profile?.onboarded_at) redirect('/onboarding/subject')

  return (
    <main className="min-h-screen">
      <div className="mx-auto max-w-[1100px] px-4 py-8 sm:px-6 sm:py-10">
        <header className="mx-auto max-w-[600px] space-y-2">
          <h1 className="font-display text-3xl font-extrabold tracking-tight text-ink-black sm:text-[36px]">
            Your settings
          </h1>
          <p className="font-body text-ink-black/70">
            Defaults you can change anytime.
          </p>
        </header>

        <div className="mx-auto mt-8 max-w-[600px] pb-20">
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
    </main>
  )
}
