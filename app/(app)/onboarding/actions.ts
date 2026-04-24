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
  return { ok: true as const }
}
