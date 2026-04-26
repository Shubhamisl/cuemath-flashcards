'use server'

import { headers } from 'next/headers'
import { createClient } from '@/lib/db/server'

async function resolvePostAuthDestination() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return '/login'

  const { data: profile } = await supabase
    .from('profiles')
    .select('onboarded_at')
    .eq('user_id', user.id)
    .single()

  return profile?.onboarded_at ? '/library' : '/onboarding/subject'
}

export async function sendMagicLink(formData: FormData) {
  const email = String(formData.get('email') ?? '').trim()
  if (!email) return { error: 'Email required' }

  const supabase = await createClient()
  const origin = (await headers()).get('origin') ?? 'http://localhost:3000'

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: `${origin}/auth/callback` },
  })

  if (error) return { error: error.message }
  return { ok: true as const }
}

export async function signInWithGoogle() {
  const supabase = await createClient()
  const origin = (await headers()).get('origin') ?? 'http://localhost:3000'

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: `${origin}/auth/callback` },
  })

  if (error) return { error: error.message }
  return { url: data.url }
}

export async function signInWithPassword(
  formData: FormData,
): Promise<{ ok: true; destination: string } | { error: string }> {
  const email = String(formData.get('email') ?? '').trim()
  const password = String(formData.get('password') ?? '')

  if (!email || !password) return { error: 'Email and password required' }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) return { error: error.message }

  return {
    ok: true as const,
    destination: await resolvePostAuthDestination(),
  }
}

export async function signUpWithPassword(
  formData: FormData,
): Promise<
  | { ok: true; requiresConfirmation: true; destination: null }
  | { ok: true; requiresConfirmation: false; destination: string }
  | { error: string }
> {
  const email = String(formData.get('email') ?? '').trim()
  const password = String(formData.get('password') ?? '')

  if (!email || !password) return { error: 'Email and password required' }
  if (password.length < 8) return { error: 'Password must be at least 8 characters' }

  const supabase = await createClient()
  const origin = (await headers()).get('origin') ?? 'http://localhost:3000'
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${origin}/auth/callback`,
    },
  })

  if (error) return { error: error.message }

  if (!data.session) {
    return {
      ok: true as const,
      requiresConfirmation: true,
      destination: null,
    }
  }

  return {
    ok: true as const,
    requiresConfirmation: false,
    destination: await resolvePostAuthDestination(),
  }
}
