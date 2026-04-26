'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/db/server'

function revalidateDeckSurfaces(deckId: string) {
  revalidatePath(`/deck/${deckId}`)
  revalidatePath(`/deck/${deckId}/cards`)
  revalidatePath('/library')
  revalidatePath('/review')
}

export async function updateCard(args: {
  cardId: string
  front: string
  back: string
}): Promise<{ ok: true } | { error: string }> {
  const front = args.front.trim()
  const back = args.back.trim()
  if (!front) return { error: 'Front cannot be empty' }
  if (!back) return { error: 'Back cannot be empty' }
  if (front.length > 2000) return { error: 'Front is too long (max 2000 chars)' }
  if (back.length > 2000) return { error: 'Back is too long (max 2000 chars)' }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  // Verify ownership before update
  const { data: card } = await supabase
    .from('cards')
    .select('deck_id')
    .eq('id', args.cardId)
    .eq('user_id', user.id)
    .single()
  if (!card) return { error: 'Card not found' }

  const { error } = await supabase
    .from('cards')
    .update({
      front: { text: front },
      back: { text: back },
    })
    .eq('id', args.cardId)
    .eq('user_id', user.id)

  if (error) return { error: error.message }

  revalidateDeckSurfaces(card.deck_id)
  return { ok: true }
}

export async function setCardApproved(args: {
  cardId: string
  approved: boolean
}): Promise<{ ok: true } | { error: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: card } = await supabase
    .from('cards')
    .select('deck_id, approved')
    .eq('id', args.cardId)
    .eq('user_id', user.id)
    .single()
  if (!card) return { error: 'Card not found' }

  const { error } = await supabase
    .from('cards')
    .update({ approved: args.approved })
    .eq('id', args.cardId)
    .eq('user_id', user.id)

  if (error) return { error: error.message }

  const { error: syncError } = await supabase.rpc('sync_deck_review_gate', {
    p_deck_id: card.deck_id,
  })
  if (syncError) {
    return { error: syncError.message }
  }

  revalidateDeckSurfaces(card.deck_id)
  return { ok: true }
}

export async function approveAllCards(args: {
  deckId: string
}): Promise<{ ok: true } | { error: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: deck } = await supabase
    .from('decks')
    .select('id')
    .eq('id', args.deckId)
    .eq('user_id', user.id)
    .single()
  if (!deck) return { error: 'Deck not found' }

  const { error } = await supabase
    .from('cards')
    .update({ approved: true })
    .eq('deck_id', args.deckId)
    .eq('user_id', user.id)
    .eq('suspended', false)
    .eq('approved', false)

  if (error) return { error: error.message }

  revalidateDeckSurfaces(args.deckId)
  return { ok: true }
}

export async function deleteCard(args: {
  cardId: string
}): Promise<{ ok: true } | { error: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: card } = await supabase
    .from('cards')
    .select('deck_id')
    .eq('id', args.cardId)
    .eq('user_id', user.id)
    .single()
  if (!card) return { error: 'Card not found' }

  const { error } = await supabase
    .from('cards')
    .delete()
    .eq('id', args.cardId)
    .eq('user_id', user.id)

  if (error) return { error: error.message }

  // Keep card_count in sync
  const { error: syncError } = await supabase.rpc('sync_deck_review_gate', {
    p_deck_id: card.deck_id,
  })
  if (syncError) return { error: syncError.message }

  revalidateDeckSurfaces(card.deck_id)
  return { ok: true }
}
