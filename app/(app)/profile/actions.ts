'use server'

import { createClient } from '@/lib/db/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import type { TablesUpdate } from '@/lib/db/types'

type UpdateInput = {
  display_name?: string
  subject_family?: string
  level?: string
  daily_goal_cards?: number
}

export async function updateProfile(input: UpdateInput) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'unauthorized' as const }

  // Strip undefined keys so we never overwrite real data with NULL.
  const patch: TablesUpdate<'profiles'> = {}
  if (input.display_name !== undefined) patch.display_name = input.display_name.trim()
  if (input.subject_family !== undefined) patch.subject_family = input.subject_family
  if (input.level !== undefined) patch.level = input.level
  if (input.daily_goal_cards !== undefined) patch.daily_goal_cards = input.daily_goal_cards

  if (Object.keys(patch).length === 0) return { ok: true as const }

  const { error } = await supabase
    .from('profiles')
    .update(patch)
    .eq('user_id', user.id)

  if (error) return { error: error.message }
  revalidatePath('/library')
  revalidatePath('/profile')
  return { ok: true as const }
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}

export async function deleteAccount() {
  // Real deletion needs the Supabase admin API and cascade through auth.users.
  // Stubbed for now — the UI surfaces a "Coming soon" toast.
  return { error: 'not_implemented' as const }
}
