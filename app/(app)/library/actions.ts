'use server'

import { createClient } from '@/lib/db/server'
import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'

const MAX_BYTES = 20 * 1024 * 1024
const ALLOWED_SUBJECTS = ['math', 'language', 'science', 'humanities', 'other'] as const
type Subject = (typeof ALLOWED_SUBJECTS)[number]

export async function createDeckFromUpload(formData: FormData): Promise<
  { ok: true; deckId: string; jobId: string } | { error: string }
> {
  const file = formData.get('file')
  const titleRaw = formData.get('title')
  const subjectRaw = formData.get('subject_family')

  if (!(file instanceof File)) return { error: 'No file uploaded' }
  if (file.type !== 'application/pdf') return { error: 'Only PDF files are supported' }
  if (file.size > MAX_BYTES) return { error: 'PDF must be under 20MB' }
  if (typeof titleRaw !== 'string' || titleRaw.trim().length === 0) return { error: 'Title required' }
  if (typeof subjectRaw !== 'string' || !ALLOWED_SUBJECTS.includes(subjectRaw as Subject)) {
    return { error: 'Invalid subject' }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  // 1. Create deck (ingesting)
  const { data: deck, error: deckErr } = await supabase
    .from('decks')
    .insert({
      user_id: user.id,
      title: titleRaw.trim().slice(0, 120),
      subject_family: subjectRaw,
      status: 'ingesting',
    })
    .select('id')
    .single()
  if (deckErr || !deck) return { error: `Deck create failed: ${deckErr?.message}` }

  // 2. Upload PDF to storage
  const pdfPath = `${user.id}/${deck.id}.pdf`
  const buffer = Buffer.from(await file.arrayBuffer())
  const { error: upErr } = await supabase.storage
    .from('pdfs')
    .upload(pdfPath, buffer, { contentType: 'application/pdf', upsert: false })
  if (upErr) {
    await supabase.from('decks').delete().eq('id', deck.id)
    return { error: `Upload failed: ${upErr.message}` }
  }

  // 3. Record path on deck
  await supabase.from('decks').update({ source_pdf_path: pdfPath }).eq('id', deck.id)

  // 4. Create ingest job
  const { data: job, error: jobErr } = await supabase
    .from('ingest_jobs')
    .insert({ deck_id: deck.id, stage: 'uploading', progress_pct: 0 })
    .select('id')
    .single()
  if (jobErr || !job) return { error: `Job create failed: ${jobErr?.message}` }

  // 5. Kick the pipeline via route handler (fire-and-forget)
  const h = await headers()
  const host = h.get('host') ?? 'localhost:3000'
  const proto = h.get('x-forwarded-proto') ?? 'http'
  void fetch(`${proto}://${host}/api/ingest/${job.id}`, { method: 'POST' }).catch((e) =>
    console.error('[actions] kick ingest failed', e),
  )

  revalidatePath('/library')
  return { ok: true, deckId: deck.id, jobId: job.id }
}

export async function deleteDeckFromLibrary(
  deckId: string,
): Promise<{ ok: true } | { error: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: deck } = await supabase
    .from('decks')
    .select('source_pdf_path')
    .eq('id', deckId)
    .eq('user_id', user.id)
    .single()

  if (deck?.source_pdf_path) {
    await supabase.storage.from('pdfs').remove([deck.source_pdf_path])
  }

  const { error } = await supabase
    .from('decks')
    .delete()
    .eq('id', deckId)
    .eq('user_id', user.id)

  if (error) return { error: error.message }
  revalidatePath('/library')
  return { ok: true }
}

export async function retryIngest(deckId: string): Promise<{ ok: true; jobId: string } | { error: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: deck } = await supabase
    .from('decks')
    .select('id, source_pdf_path')
    .eq('id', deckId)
    .eq('user_id', user.id)
    .single()
  if (!deck?.source_pdf_path) return { error: 'Deck missing PDF' }

  await supabase.from('decks').update({ status: 'ingesting' }).eq('id', deckId)

  const { data: job, error } = await supabase
    .from('ingest_jobs')
    .insert({ deck_id: deckId, stage: 'parsing', progress_pct: 0 })
    .select('id')
    .single()
  if (error || !job) return { error: 'Retry failed' }

  const h = await headers()
  const host = h.get('host') ?? 'localhost:3000'
  const proto = h.get('x-forwarded-proto') ?? 'http'
  void fetch(`${proto}://${host}/api/ingest/${job.id}`, { method: 'POST' }).catch(() => {})

  revalidatePath('/library')
  revalidatePath(`/deck/${deckId}`)
  return { ok: true, jobId: job.id }
}
