import { createClient } from '@/lib/db/server'
import type { subjectFamily } from '@/lib/brand/tokens'
import { GoalForm } from './goal-form'

const ALLOWED: subjectFamily[] = ['math', 'language', 'science', 'humanities', 'other']
const ALLOWED_LEVELS = new Set(['beginner', 'intermediate', 'advanced'])

export default async function GoalPage({
  searchParams,
}: {
  searchParams: Promise<{ s?: string; l?: string }>
}) {
  const { s, l } = await searchParams

  const fastSubject =
    typeof s === 'string' && ALLOWED.includes(s as subjectFamily)
      ? (s as subjectFamily)
      : null
  const fastLevel = typeof l === 'string' && ALLOWED_LEVELS.has(l) ? l : null

  if (fastSubject && fastLevel) {
    return <GoalForm subject={fastSubject} level={fastLevel} />
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  let subject: subjectFamily | null = fastSubject
  let level: string | null = fastLevel
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('subject_family, level')
      .eq('user_id', user.id)
      .single()
    if (!subject) {
      const sub = profile?.subject_family
      if (typeof sub === 'string' && ALLOWED.includes(sub as subjectFamily)) {
        subject = sub as subjectFamily
      }
    }
    if (!level && typeof profile?.level === 'string') {
      level = profile.level
    }
  }

  return <GoalForm subject={subject} level={level} />
}
