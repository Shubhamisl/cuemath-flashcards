'use server'

import { createClient } from '@/lib/db/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

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
