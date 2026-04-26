import { adminDb } from '../db/admin'

export type IngestStage = 'uploading' | 'parsing' | 'extracting' | 'embedding' | 'ready' | 'failed'

export async function updateJob(
  jobId: string,
  patch: { stage?: IngestStage; progress_pct?: number; error?: string | null; finished_at?: string | null },
) {
  const db = adminDb()
  const { error } = await db.from('ingest_jobs').update(patch).eq('id', jobId)
  if (error) throw error
}

export async function setDeckStatus(
  deckId: string,
  status: 'ingesting' | 'draft' | 'ready' | 'failed' | 'archived',
  cardCount?: number,
) {
  const db = adminDb()
  const patch: { status: string; card_count?: number } = { status }
  if (cardCount !== undefined) patch.card_count = cardCount
  const { error } = await db.from('decks').update(patch).eq('id', deckId)
  if (error) throw error
}
