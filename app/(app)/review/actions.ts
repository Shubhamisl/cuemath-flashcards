'use server'

import { createClient } from '@/lib/db/server'
import { schedule, initialState, type FsrsCardState, type FsrsRating } from '@/lib/srs/schedule'

const LEECH_LAPSES = 6
const LEECH_REPS = 10

export async function submitRating(args: {
  cardId: string
  rating: FsrsRating
  elapsedMs: number
}): Promise<{ ok: true; intervalDays: number } | { error: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not signed in' }

  const { data: card, error: fetchErr } = await supabase
    .from('cards')
    .select('fsrs_state')
    .eq('id', args.cardId)
    .eq('user_id', user.id)
    .single()
  if (fetchErr || !card) return { error: 'Card not found' }

  const before: FsrsCardState = (card.fsrs_state as FsrsCardState | null) ?? initialState()
  const now = new Date()
  const { nextState, intervalDays } = schedule(before, args.rating, now)

  const scheduledDaysBefore = before.scheduled_days

  const shouldSuspend = nextState.lapses >= LEECH_LAPSES && nextState.reps >= LEECH_REPS

  const { error: insErr } = await supabase.from('reviews').insert({
    card_id: args.cardId,
    user_id: user.id,
    rated_at: now.toISOString(),
    rating: args.rating,
    elapsed_ms: args.elapsedMs,
    scheduled_days_before: scheduledDaysBefore,
    fsrs_state_before: before,
    fsrs_state_after: nextState,
  })
  if (insErr) return { error: insErr.message }

  const { error: upErr } = await supabase
    .from('cards')
    .update({
      fsrs_state: nextState,
      suspended: shouldSuspend,
    })
    .eq('id', args.cardId)
    .eq('user_id', user.id)
  if (upErr) return { error: upErr.message }

  return { ok: true, intervalDays }
}

export async function finalizeSession(args: {
  startedAt: string
  endedAt: string
  ratings: { rating: FsrsRating; elapsedMs: number }[]
  breakPromptedAt: string | null
}): Promise<{ ok: true } | { error: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not signed in' }

  const total = args.ratings.length
  const correct = args.ratings.filter((r) => r.rating >= 3).length
  const meanAccuracy = total > 0 ? correct / total : 0
  const meanResponseMs =
    total > 0 ? Math.round(args.ratings.reduce((a, r) => a + r.elapsedMs, 0) / total) : 0

  const { error } = await supabase.from('sessions').insert({
    user_id: user.id,
    started_at: args.startedAt,
    ended_at: args.endedAt,
    cards_reviewed: total,
    mean_accuracy: meanAccuracy,
    mean_response_ms: meanResponseMs,
    break_prompted_at: args.breakPromptedAt,
  })
  if (error) return { error: error.message }
  return { ok: true }
}
