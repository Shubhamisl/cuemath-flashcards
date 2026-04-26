'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/db/server'

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

  revalidatePath(`/deck/${card.deck_id}/cards`)
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
  const { data: deck } = await supabase
    .from('decks')
    .select('card_count')
    .eq('id', card.deck_id)
    .single()
  await supabase
    .from('decks')
    .update({ card_count: Math.max(0, (deck?.card_count ?? 1) - 1) })
    .eq('id', card.deck_id)

  revalidatePath(`/deck/${card.deck_id}/cards`)
  revalidatePath(`/deck/${card.deck_id}`)
  return { ok: true }
}
