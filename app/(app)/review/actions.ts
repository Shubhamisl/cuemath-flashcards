'use server'

import { createClient } from '@/lib/db/server'
import { schedule, initialState, type FsrsCardState, type FsrsRating } from '@/lib/srs/schedule'
import { getReviewBlockReason } from '@/lib/decks/review-gate'
import { computeSessionPreview, type SessionPreview } from '@/lib/review/session-preview'

const LEECH_LAPSES = 6
const LEECH_REPS = 10

export async function submitRating(args: {
  cardId: string
  rating: FsrsRating
  elapsedMs: number
  hintUsed: boolean
}): Promise<{ ok: true; intervalDays: number } | { error: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not signed in' }

  const { data: card, error: fetchErr } = await supabase
    .from('cards')
    .select('deck_id, fsrs_state, approved')
    .eq('id', args.cardId)
    .eq('user_id', user.id)
    .single()
  if (fetchErr || !card) return { error: 'Card not found' }
  if (!card.approved) return { error: 'Approve this card before reviewing it.' }

  const { data: deck } = await supabase
    .from('decks')
    .select('status')
    .eq('id', card.deck_id)
    .eq('user_id', user.id)
    .single()
  const reviewBlock = getReviewBlockReason({
    deckStatus: deck?.status ?? 'missing',
    approved: card.approved,
  })
  if (reviewBlock) {
    return { error: reviewBlock }
  }

  const before: FsrsCardState = (card.fsrs_state as FsrsCardState | null) ?? initialState()
  const now = new Date()
  const { nextState, intervalDays } = schedule(before, args.rating, now)

  const scheduledDaysBefore = before.scheduled_days

  const shouldSuspend = nextState.lapses >= LEECH_LAPSES && nextState.reps >= LEECH_REPS

  // Both writes are independent given `nextState` — the review is append-only
  // and the card update is keyed on cardId. Run them in parallel.
  const [insRes, upRes] = await Promise.all([
    supabase.from('reviews').insert({
      card_id: args.cardId,
      user_id: user.id,
      rated_at: now.toISOString(),
      rating: args.rating,
      elapsed_ms: args.elapsedMs,
      hint_used: args.hintUsed,
      scheduled_days_before: scheduledDaysBefore,
      fsrs_state_before: before,
      fsrs_state_after: nextState,
    }),
    supabase
      .from('cards')
      .update({
        fsrs_state: nextState,
        suspended: shouldSuspend,
      })
      .eq('id', args.cardId)
      .eq('user_id', user.id),
  ])
  if (insRes.error) return { error: insRes.error.message }
  if (upRes.error) return { error: upRes.error.message }

  return { ok: true, intervalDays }
}

export async function finalizeSession(args: {
  startedAt: string
  endedAt: string
  ratings: { rating: FsrsRating; elapsedMs: number; hintUsed: boolean }[]
  breakPromptedAt: string | null
  mode: 'standard' | 'quick'
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
    mode: args.mode,
    mean_accuracy: meanAccuracy,
    mean_response_ms: meanResponseMs,
    break_prompted_at: args.breakPromptedAt,
  })
  if (error) return { error: error.message }
  return { ok: true }
}

export async function getSessionPreview(args?: {
  deckId?: string
  conceptTag?: string
}): Promise<SessionPreview | { error: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not signed in' }

  let query = supabase
    .from('cards')
    .select('concept_tag, fsrs_state')
    .eq('user_id', user.id)
    .eq('approved', true)
    .eq('suspended', false)

  if (args?.deckId) {
    query = query.eq('deck_id', args.deckId)
  } else {
    const { data: readyDecks, error: decksError } = await supabase
      .from('decks')
      .select('id')
      .eq('user_id', user.id)
      .eq('status', 'ready')

    if (decksError) return { error: decksError.message }
    const readyDeckIds = (readyDecks ?? []).map((deck) => deck.id as string)
    if (readyDeckIds.length === 0) {
      return computeSessionPreview([], new Date())
    }
    query = query.in('deck_id', readyDeckIds)
  }

  if (args?.conceptTag) {
    query = query.eq('concept_tag', args.conceptTag)
  }

  const { data, error } = await query

  if (error) return { error: error.message }
  return computeSessionPreview((data ?? []) as Array<{ concept_tag: string | null; fsrs_state: { due?: string; lapses?: number } | null }>, new Date())
}
