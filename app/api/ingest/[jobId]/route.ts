import type { NextRequest } from 'next/server'
import { runIngest } from '@/lib/ingest/pipeline'
import { adminDb } from '@/lib/ingest/job'

export const runtime = 'nodejs'
export const maxDuration = 300

export async function POST(_req: NextRequest, ctx: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await ctx.params

  const db = adminDb()
  const { data: job, error } = await db
    .from('ingest_jobs')
    .select('id, deck_id, decks(id, user_id, source_pdf_path)')
    .eq('id', jobId)
    .single()

  if (error || !job) return Response.json({ error: 'job not found' }, { status: 404 })
  const deck = Array.isArray(job.decks) ? job.decks[0] : job.decks
  if (!deck?.source_pdf_path) return Response.json({ error: 'deck missing pdf path' }, { status: 400 })

  // Fire-and-forget: respond immediately, let pipeline run.
  void runIngest({
    jobId,
    deckId: deck.id,
    userId: deck.user_id,
    pdfPath: deck.source_pdf_path,
  })

  return Response.json({ ok: true })
}
