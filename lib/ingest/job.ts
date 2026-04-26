import { createClient } from '@supabase/supabase-js'
import type { Database } from '../db/types'

export type IngestStage = 'uploading' | 'parsing' | 'extracting' | 'embedding' | 'ready' | 'failed'

// Service-role client — used only inside the ingest route handler (server-only).
function admin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!
  return createClient<Database>(url, key, { auth: { persistSession: false } })
}

export async function updateJob(
  jobId: string,
  patch: { stage?: IngestStage; progress_pct?: number; error?: string | null; finished_at?: string | null },
) {
  const db = admin()
  const { error } = await db.from('ingest_jobs').update(patch).eq('id', jobId)
  if (error) throw error
}

export async function setDeckStatus(
  deckId: string,
  status: 'ingesting' | 'draft' | 'ready' | 'failed' | 'archived',
  cardCount?: number,
) {
  const db = admin()
  const patch: { status: string; card_count?: number } = { status }
  if (cardCount !== undefined) patch.card_count = cardCount
  const { error } = await db.from('decks').update(patch).eq('id', deckId)
  if (error) throw error
}

export function adminDb() {
  return admin()
}
