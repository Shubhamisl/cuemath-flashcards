import { parsePdfWithOcrFallback } from '../pdf/parse-with-ocr'
import { chunkPages } from '../pdf/chunk'
import { extractCards } from '../llm/extract-cards'
import { critiqueCards } from '../llm/critique-cards'
import { embed } from '../embeddings/openrouter'
import { updateJob, setDeckStatus } from './job'
import { adminDb } from '../db/admin'
import type { AtomicCard } from '../llm/types'

// Keep generations focused while allowing stronger mini models to produce
// enough useful coverage. Review gate still keeps all cards as drafts first.
const CARD_CAP = 100
const EXTRACTION_BATCH_PAGE_SIZE = 4

async function withRetry<T>(fn: () => Promise<T>, label: string): Promise<T> {
  try {
    return await fn()
  } catch (e) {
    console.warn(`[ingest] ${label} failed once, retrying`, e)
    return await fn()
  }
}

export async function runIngest(args: {
  jobId: string
  deckId: string
  userId: string
  pdfPath: string
}) {
  const { jobId, deckId, userId, pdfPath } = args
  const db = adminDb()

  try {
    // --- parse ---
    await updateJob(jobId, { stage: 'parsing', progress_pct: 5 })
    const { data: blob, error: dlErr } = await db.storage.from('pdfs').download(pdfPath)
    if (dlErr || !blob) throw new Error(`storage download: ${dlErr?.message}`)
    const buffer = Buffer.from(await blob.arrayBuffer())
    const pages = await withRetry(
      () =>
        parsePdfWithOcrFallback(buffer, {
          onOcrStart: () => updateJob(jobId, { stage: 'ocr', progress_pct: 8 }),
        }),
      'parsePdfWithOcrFallback',
    )
    if (pages.length === 0) throw new Error('PDF had no extractable text')

    // --- extract ---
    await updateJob(jobId, { stage: 'extracting', progress_pct: 15 })
    const batches = chunkPages(pages, EXTRACTION_BATCH_PAGE_SIZE)
    const alreadyCarded: string[] = []
    const allCards: AtomicCard[] = []

    for (let i = 0; i < batches.length; i++) {
      if (allCards.length >= CARD_CAP) break
      const remaining = CARD_CAP - allCards.length
      const batch = batches[i]
      const result = await withRetry(
        () =>
          extractCards({
            pages: batch.pages,
            alreadyCarded,
            remainingBudget: remaining,
            metadata: { stage: 'extracting', userId, deckId, jobId },
          }),
        `extract batch ${i}`,
      )
      for (const c of result.cards) {
        if (allCards.length >= CARD_CAP) break
        allCards.push(c)
        alreadyCarded.push(c.concept_tag)
      }
      const pct = 15 + Math.floor(((i + 1) / batches.length) * 45)
      await updateJob(jobId, { progress_pct: pct })
    }

    if (allCards.length === 0) throw new Error('No cards extracted from PDF')

    // --- critique ---
    await updateJob(jobId, { stage: 'critiquing', progress_pct: 65 })
    let finalCards = await withRetry(
      () => critiqueCards({
        cards: allCards,
        metadata: { stage: 'critiquing', userId, deckId, jobId },
      }),
      'critiqueCards',
    )

    if (finalCards.length === 0) {
      console.warn('[ingest] critique dropped every card; falling back to extracted candidates')
      finalCards = allCards
    }

    if (finalCards.length > CARD_CAP) {
      finalCards = finalCards.slice(0, CARD_CAP)
    }

    // --- embed ---
    await updateJob(jobId, { stage: 'embedding', progress_pct: 80 })
    const texts = finalCards.map((c) => `${c.front}\n${c.back}`)
    const { vectors, dim } = await withRetry(
      () => embed(texts, { stage: 'embedding', userId, deckId, jobId }),
      'embed',
    )
    if (vectors.length !== finalCards.length) {
      throw new Error(`embed count mismatch: ${vectors.length} vs ${finalCards.length}`)
    }

    // --- insert cards ---
    const rows = finalCards.map((c, i) => ({
      deck_id: deckId,
      user_id: userId,
      approved: false,
      format: 'qa',
      front: { text: c.front },
      back: { text: c.back },
      concept_tag: c.concept_tag,
      source_chunk_id: `page:${c.source_page}`,
      // pgvector via PostgREST expects the vector as a stringified array "[0.1,0.2,...]"
      embedding: JSON.stringify(vectors[i]),
      embedding_dim: dim,
    }))
    const { error: insErr } = await db.from('cards').insert(rows)
    if (insErr) throw insErr

    // --- done ---
    await setDeckStatus(deckId, 'draft', finalCards.length)
    await updateJob(jobId, {
      stage: 'ready',
      progress_pct: 100,
      finished_at: new Date().toISOString(),
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('[ingest] failed', msg)
    await setDeckStatus(deckId, 'failed')
    await updateJob(jobId, {
      stage: 'failed',
      error: msg,
      finished_at: new Date().toISOString(),
    })
  }
}
