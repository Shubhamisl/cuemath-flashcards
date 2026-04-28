import { createClient } from '@/lib/db/server'
import type { subjectFamily } from '@/lib/brand/tokens'
import { GoalForm } from './goal-form'

const ALLOWED: subjectFamily[] = ['math', 'language', 'science', 'humanities', 'other']

export default async function GoalPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  let subject: subjectFamily | null = null
  let level: string | null = null
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('subject_family, level')
      .eq('user_id', user.id)
      .single()
    const sub = profile?.subject_family
    if (typeof sub === 'string' && ALLOWED.includes(sub as subjectFamily)) {
      subject = sub as subjectFamily
    }
    if (typeof profile?.level === 'string') {
      level = profile.level
    }
  }

  return <GoalForm subject={subject} level={level} />
}
