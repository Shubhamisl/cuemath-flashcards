import { redirect } from 'next/navigation'
import { createClient } from '@/lib/db/server'
import { TopNav } from '../_components/top-nav'
import { ProfileForm } from './profile-form'
import { computeStreak } from '@/lib/progress/streak'
import type { subjectFamily } from '@/lib/brand/tokens'

export default async function ProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const now = new Date()
  const fortyDaysAgo = new Date(now.getTime() - 40 * 86400000)
  const [{ data: profile }, { data: sessions }] = await Promise.all([
    supabase
      .from('profiles')
      .select('display_name, daily_goal_cards, daily_new_cards_limit, subject_family, level, onboarded_at')
      .eq('user_id', user.id)
      .single(),
    supabase
      .from('sessions')
      .select('started_at')
      .eq('user_id', user.id)
      .gte('started_at', fortyDaysAgo.toISOString()),
  ])

  if (!profile?.onboarded_at) redirect('/onboarding/subject')
  const streak = computeStreak(
    (sessions ?? []).map((s) => s.started_at as string),
    now,
  )

  const fullName = profile.display_name ?? ''
  const firstName = fullName.split(' ')[0] || 'there'

  return (
    <main className="min-h-screen">
      <TopNav name={firstName} streak={streak} />

      <div className="max-w-[1100px] mx-auto px-6 py-10">
        <header className="mx-auto max-w-[600px] space-y-2">
          <h1 className="font-display font-extrabold text-[36px] tracking-tight text-ink-black">
            Your settings
          </h1>
          <p className="font-body text-ink-black/70">
            Defaults you can change anytime.
          </p>
        </header>

        <div className="mx-auto max-w-[600px] mt-8 pb-20">
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
