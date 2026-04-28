import { createClient } from '@/lib/db/server'
import type { subjectFamily } from '@/lib/brand/tokens'
import { LevelOptions } from './level-options'

const ALLOWED: subjectFamily[] = ['math', 'language', 'science', 'humanities', 'other']

export default async function LevelPage({
  searchParams,
}: {
  searchParams: Promise<{ s?: string }>
}) {
  const { s } = await searchParams

  if (typeof s === 'string' && ALLOWED.includes(s as subjectFamily)) {
    return <LevelOptions subject={s as subjectFamily} />
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  let subject: subjectFamily | null = null
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('subject_family')
      .eq('user_id', user.id)
      .single()
    const value = profile?.subject_family
    if (typeof value === 'string' && ALLOWED.includes(value as subjectFamily)) {
      subject = value as subjectFamily
    }
  }

  return <LevelOptions subject={subject} />
}
