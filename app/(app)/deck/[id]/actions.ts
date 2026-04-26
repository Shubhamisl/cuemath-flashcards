'use server'

import { createClient } from '@/lib/db/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { canArchiveDeck, canRestoreDeck, restoreStatusForArchivedDeck } from '@/lib/decks/archive'
import { canMarkDeckReady, summarizeReviewGate } from '@/lib/decks/review-gate'
import { normalizeDeckTags } from '@/lib/decks/tags'

export async function renameDeck(
  deckId: string,
  title: string,
): Promise<{ ok: true } | { error: string }> {
  const trimmed = title.trim()
  if (!trimmed) return { error: 'Title cannot be empty' }
  if (trimmed.length > 200) return { error: 'Title is too long (max 200 chars)' }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('decks')
    .update({ title: trimmed })
    .eq('id', deckId)
    .eq('user_id', user.id)

  if (error) return { error: error.message }

  revalidatePath(`/deck/${deckId}`)
  revalidatePath('/library')
  return { ok: true }
}

export async function deleteDeck(deckId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'unauthorized' as const }

  // Best-effort: also delete the source PDF from storage. Look up source_pdf_path first.
  const { data: deck } = await supabase
    .from('decks')
    .select('source_pdf_path')
    .eq('id', deckId)
    .eq('user_id', user.id)
    .single()

  if (deck?.source_pdf_path) {
    await supabase.storage.from('pdfs').remove([deck.source_pdf_path])
  }

  // Cards, ingest_jobs, sessions, reviews cascade-delete via FK.
  const { error } = await supabase
    .from('decks')
    .delete()
    .eq('id', deckId)
    .eq('user_id', user.id)

  if (error) return { error: error.message }
  revalidatePath('/library')
  redirect('/library')
}

export async function markDeckReady(
  deckId: string,
): Promise<{ ok: true } | { error: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: deck } = await supabase
    .from('decks')
    .select('id, status')
    .eq('id', deckId)
    .eq('user_id', user.id)
    .single()
  if (!deck) return { error: 'Deck not found' }

  const { data: markedReady, error } = await supabase.rpc('mark_deck_ready_if_reviewed', {
    p_deck_id: deckId,
  })
  if (error) return { error: error.message }

  if (!markedReady) {
    const { data: cards, error: cardsError } = await supabase
      .from('cards')
      .select('approved, suspended')
      .eq('deck_id', deckId)
      .eq('user_id', user.id)
    if (cardsError) return { error: cardsError.message }

    const summary = summarizeReviewGate(cards ?? [])
    if (!canMarkDeckReady(deck.status, summary)) {
      if (summary.reviewableCount === 0) {
        return { error: 'This deck has no reviewable cards yet.' }
      }
      if (summary.pendingCount > 0) {
        return { error: `Approve ${summary.pendingCount} more card(s) before starting review.` }
      }
      return { error: 'This deck cannot be marked ready right now.' }
    }
    return { error: 'The deck changed while we were preparing it. Try again.' }
  }

  revalidatePath(`/deck/${deckId}`)
  revalidatePath(`/deck/${deckId}/cards`)
  revalidatePath('/library')
  revalidatePath('/review')
  return { ok: true }
}

export async function updateDeckTags(
  deckId: string,
  tags: string[],
): Promise<{ ok: true } | { error: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const normalized = normalizeDeckTags(tags.join(','))

  const { error } = await supabase
    .from('decks')
    .update({ tags: normalized })
    .eq('id', deckId)
    .eq('user_id', user.id)

  if (error) return { error: error.message }

  revalidatePath(`/deck/${deckId}`)
  revalidatePath('/library')
  return { ok: true }
}

export async function archiveDeck(
  deckId: string,
): Promise<{ ok: true } | { error: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: deck } = await supabase
    .from('decks')
    .select('status')
    .eq('id', deckId)
    .eq('user_id', user.id)
    .single()
  if (!deck) return { error: 'Deck not found' }
  if (!canArchiveDeck(deck.status)) {
    return { error: 'Only ready decks can be archived right now.' }
  }

  const { error } = await supabase
    .from('decks')
    .update({ status: 'archived' })
    .eq('id', deckId)
    .eq('user_id', user.id)
  if (error) return { error: error.message }

  revalidatePath(`/deck/${deckId}`)
  revalidatePath('/library')
  revalidatePath('/progress')
  revalidatePath('/review')
  return { ok: true }
}

export async function restoreDeck(
  deckId: string,
): Promise<{ ok: true } | { error: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: deck } = await supabase
    .from('decks')
    .select('status')
    .eq('id', deckId)
    .eq('user_id', user.id)
    .single()
  if (!deck) return { error: 'Deck not found' }
  if (!canRestoreDeck(deck.status)) {
    return { error: 'This deck is not archived.' }
  }

  const { error } = await supabase
    .from('decks')
    .update({ status: restoreStatusForArchivedDeck(deck.status) })
    .eq('id', deckId)
    .eq('user_id', user.id)
  if (error) return { error: error.message }

  revalidatePath(`/deck/${deckId}`)
  revalidatePath('/library')
  revalidatePath('/progress')
  revalidatePath('/review')
  return { ok: true }
}
