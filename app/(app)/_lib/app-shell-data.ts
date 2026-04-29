import { cache } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/db/server'
import { computeStreak } from '@/lib/progress/streak'
import type { subjectFamily } from '@/lib/brand/tokens'

export type AppShellProfile = {
  display_name: string | null
  daily_goal_cards: number | null
  daily_new_cards_limit: number | null
  subject_family: string | null
  level: string | null
  onboarded_at: string | null
}

export const getAppShellData = cache(async () => {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

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

  const shellProfile = (profile ?? {
    display_name: null,
    daily_goal_cards: null,
    daily_new_cards_limit: null,
    subject_family: null,
    level: null,
    onboarded_at: null,
  }) as AppShellProfile
  const fullName = shellProfile.display_name ?? 'there'

  return {
    user,
    profile: shellProfile,
    firstName: fullName.split(' ')[0] || 'there',
    streak: computeStreak((sessions ?? []).map((s) => s.started_at as string), now),
    subjectFamily: (shellProfile.subject_family ?? 'math') as subjectFamily,
  }
})
