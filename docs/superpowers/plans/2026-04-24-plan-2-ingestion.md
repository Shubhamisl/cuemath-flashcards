# Plan 2 — PDF Ingestion Pipeline

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upload a PDF, extract atomic flashcards via Claude, embed them via OpenRouter, and surface a `ready` deck with cards in the library.

**Architecture:** Client uploads PDF to Supabase Storage → server action inserts `decks` + `ingest_jobs` rows → route handler `POST /api/ingest/[jobId]` runs the pipeline async (parse pages → chunk into batches → Claude extracts cards per batch → embed each card → insert into `cards` → mark deck `ready`). Library polls `ingest_jobs` every 2s and renders stage + % on the deck card.

**Tech Stack:** Next.js 16 route handler + server action, Supabase Storage, `pdf-parse` 1.1.1, `@anthropic-ai/sdk` 0.34+, OpenRouter embeddings endpoint (OpenAI-compatible), `zod` 4 for LLM JSON validation.

**Key decisions (from brainstorming):**
- Embedding provider: OpenRouter (`nvidia/llama-nemotron-embed-vl-1b-v2:free` dev default; swap via `EMBEDDING_MODEL` env). Column widened from `vector(1536)` to `vector` with companion `embedding_dim int`.
- Chunking: 10 pages per Claude call, running "concepts already carded" list passed to dedupe across batches.
- Caps: 20MB PDF max, 200 cards per deck max.
- Progress UI: poll-based (2s interval), 5 stages (`uploading → parsing → extracting → embedding → ready`). Realtime deferred.
- Failure: per-stage retry-once; terminal failure → `status='failed'` with `Retry` button that re-queues without re-upload.

**Follow for every task:** AGENTS.md — "This is NOT the Next.js you know. Read relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices."

---

## File Structure

**New files:**
- `supabase/migrations/20260424000004_embedding_flex.sql` — widen `cards.embedding`, add `embedding_dim`
- `supabase/migrations/20260424000005_storage_bucket.sql` — `pdfs` storage bucket + RLS
- `lib/pdf/parse.ts` — `pdf-parse` wrapper, page-level text extraction
- `lib/pdf/chunk.ts` — group pages into batches
- `lib/llm/claude.ts` — Anthropic SDK client
- `lib/llm/extract-cards.ts` — card-extraction prompt + zod schema + batch call
- `lib/llm/types.ts` — shared LLM types (`AtomicCard`, `ExtractionBatch`)
- `lib/embeddings/openrouter.ts` — OpenAI-compatible embeddings client
- `lib/embeddings/types.ts` — `EmbedResult` type
- `lib/ingest/job.ts` — job progress mutator (`updateJob(jobId, { stage, progress_pct })`)
- `lib/ingest/pipeline.ts` — orchestrator `runIngest(jobId, deckId, userId, pdfPath)`
- `app/(app)/library/actions.ts` — `createDeckFromUpload(formData)` server action
- `app/api/ingest/[jobId]/route.ts` — POST handler that runs the pipeline
- `components/upload-modal.tsx` — client component (dropzone + title + subject picker)
- `components/deck-card.tsx` — client component (polls job, renders stage/pct/retry)
- `lib/pdf/chunk.test.ts` — chunk boundary tests
- `lib/llm/extract-cards.test.ts` — prompt shape + zod parse tests

**Modified:**
- `app/(app)/library/page.tsx` — render `<UploadModal>` trigger, render `<DeckCard>` per deck
- `lib/db/types.ts` — regenerated after migrations
- `.env.local.example` — add `OPENROUTER_API_KEY`, `ANTHROPIC_API_KEY`, `EMBEDDING_MODEL`
- `package.json` — add `pdf-parse`, `@anthropic-ai/sdk`

---

## Task 1: Install dependencies + env scaffolding

**Files:**
- Modify: `package.json`, `.env.local.example`

- [ ] **Step 1: Install runtime deps**

Run: `pnpm add pdf-parse @anthropic-ai/sdk`
Expected: both added to `dependencies`.

- [ ] **Step 2: Install types**

Run: `pnpm add -D @types/pdf-parse`
Expected: added to `devDependencies`.

- [ ] **Step 3: Create `.env.local.example`**

Write `D:\CUEMATH\Flashcard\.env.local.example`:
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_PROJECT_REF=
ANTHROPIC_API_KEY=
OPENROUTER_API_KEY=
EMBEDDING_MODEL=nvidia/llama-nemotron-embed-vl-1b-v2:free
```

- [ ] **Step 4: Ensure user's `.env.local` has `ANTHROPIC_API_KEY` and `OPENROUTER_API_KEY`**

Ask the user to paste the keys into `.env.local` if not already present. Do NOT log or echo the keys. Do not commit `.env.local`.

- [ ] **Step 5: Commit**

```
git add package.json pnpm-lock.yaml .env.local.example
git commit -m "feat(ingest): add pdf-parse + anthropic sdk + env scaffolding"
```

---

## Task 2: Migration — widen embedding column + add embedding_dim

**Files:**
- Create: `supabase/migrations/20260424000004_embedding_flex.sql`

- [ ] **Step 1: Write migration**

Write `D:\CUEMATH\Flashcard\supabase\migrations\20260424000004_embedding_flex.sql`:
```sql
-- Widen cards.embedding to allow any dimension (free-tier models vary)
alter table public.cards drop column embedding;
alter table public.cards add column embedding vector;
alter table public.cards add column embedding_dim int;
create index idx_cards_embedding_dim on public.cards(embedding_dim);
```

Note: dropping `embedding` is safe because no cards exist yet (Plan 1 only seeded auth/profile data).

- [ ] **Step 2: Apply to cloud**

Run (from `D:\CUEMATH\Flashcard`):
```
npx --yes supabase@latest db push
```
Expected: "Applying migration 20260424000004_embedding_flex.sql..." then success.

- [ ] **Step 3: Regenerate types**

Run:
```
npx --yes supabase@latest gen types typescript --project-id vsihbffjpgbhfrlfywsv --schema public | Out-File -Encoding utf8 lib\db\types.ts
```
Expected: `lib/db/types.ts` contains `embedding_dim: number | null` under `cards`.

- [ ] **Step 4: Commit**

```
git add supabase/migrations/20260424000004_embedding_flex.sql lib/db/types.ts
git commit -m "feat(db): widen cards.embedding to flexible dim + embedding_dim column"
```

---

## Task 3: Migration — Supabase Storage bucket + RLS

**Files:**
- Create: `supabase/migrations/20260424000005_storage_bucket.sql`

- [ ] **Step 1: Write migration**

Write `D:\CUEMATH\Flashcard\supabase\migrations\20260424000005_storage_bucket.sql`:
```sql
-- Private bucket for user PDFs; objects keyed by {user_id}/{deck_id}.pdf
insert into storage.buckets (id, name, public)
values ('pdfs', 'pdfs', false)
on conflict (id) do nothing;

-- RLS: users can read/write only their own folder
create policy "pdfs_own_read"
  on storage.objects for select
  using (bucket_id = 'pdfs' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "pdfs_own_insert"
  on storage.objects for insert
  with check (bucket_id = 'pdfs' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "pdfs_own_delete"
  on storage.objects for delete
  using (bucket_id = 'pdfs' and auth.uid()::text = (storage.foldername(name))[1]);
```

- [ ] **Step 2: Apply**

Run: `npx --yes supabase@latest db push`
Expected: migration applies cleanly.

- [ ] **Step 3: Verify bucket exists**

Open Supabase dashboard → Storage → confirm `pdfs` bucket exists and is private.

- [ ] **Step 4: Commit**

```
git add supabase/migrations/20260424000005_storage_bucket.sql
git commit -m "feat(db): add pdfs storage bucket with per-user RLS"
```

---

## Task 4: PDF parsing (page-level text extraction)

**Files:**
- Create: `lib/pdf/parse.ts`

- [ ] **Step 1: Implement parser**

Write `D:\CUEMATH\Flashcard\lib\pdf\parse.ts`:
```ts
import pdf from 'pdf-parse'

export type ParsedPage = { index: number; text: string }

export async function parsePdf(buffer: Buffer): Promise<ParsedPage[]> {
  const pages: ParsedPage[] = []
  await pdf(buffer, {
    pagerender: async (pageData) => {
      const textContent = await pageData.getTextContent()
      const text = textContent.items
        .map((it: { str: string }) => it.str)
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim()
      pages.push({ index: pages.length, text })
      return text
    },
  })
  return pages
}
```

- [ ] **Step 2: Smoke test manually**

Create a one-off script (do not commit):
```
node -e "require('fs').readFile('sample.pdf', async (_, b) => { const {parsePdf} = await import('./lib/pdf/parse.ts'); console.log((await parsePdf(b)).length) })"
```
Skip if no sample PDF handy; the real smoke test is Task 14.

- [ ] **Step 3: Commit**

```
git add lib/pdf/parse.ts
git commit -m "feat(pdf): page-level text extraction via pdf-parse"
```

---

## Task 5: Chunking — group pages into batches

**Files:**
- Create: `lib/pdf/chunk.ts`, `lib/pdf/chunk.test.ts`

- [ ] **Step 1: Write failing test**

Write `D:\CUEMATH\Flashcard\lib\pdf\chunk.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { chunkPages } from './chunk'

describe('chunkPages', () => {
  const mk = (n: number) => Array.from({ length: n }, (_, i) => ({ index: i, text: `p${i}` }))

  it('groups into batches of 10 by default', () => {
    expect(chunkPages(mk(25))).toHaveLength(3)
  })

  it('respects custom batch size', () => {
    expect(chunkPages(mk(6), 2)).toHaveLength(3)
  })

  it('returns empty array for empty input', () => {
    expect(chunkPages([])).toEqual([])
  })

  it('each batch carries its start page index', () => {
    const batches = chunkPages(mk(25), 10)
    expect(batches[0].startPage).toBe(0)
    expect(batches[1].startPage).toBe(10)
    expect(batches[2].startPage).toBe(20)
  })
})
```

- [ ] **Step 2: Run — expect FAIL**

Run: `pnpm test -- lib/pdf/chunk.test.ts`
Expected: "Cannot find module './chunk'".

- [ ] **Step 3: Implement**

Write `D:\CUEMATH\Flashcard\lib\pdf\chunk.ts`:
```ts
import type { ParsedPage } from './parse'

export type PageBatch = { startPage: number; pages: ParsedPage[] }

export function chunkPages(pages: ParsedPage[], size = 10): PageBatch[] {
  const out: PageBatch[] = []
  for (let i = 0; i < pages.length; i += size) {
    out.push({ startPage: i, pages: pages.slice(i, i + size) })
  }
  return out
}
```

- [ ] **Step 4: Run — expect PASS**

Run: `pnpm test -- lib/pdf/chunk.test.ts`
Expected: 4 passed.

- [ ] **Step 5: Commit**

```
git add lib/pdf/chunk.ts lib/pdf/chunk.test.ts
git commit -m "feat(pdf): chunkPages batches with page-index tracking"
```

---

## Task 6: LLM types + Anthropic client

**Files:**
- Create: `lib/llm/types.ts`, `lib/llm/claude.ts`

- [ ] **Step 1: Define shared types**

Write `D:\CUEMATH\Flashcard\lib\llm\types.ts`:
```ts
import { z } from 'zod'

export const atomicCardSchema = z.object({
  front: z.string().min(3).max(400),
  back: z.string().min(1).max(600),
  concept_tag: z.string().min(1).max(80),
  source_page: z.number().int().min(0),
})

export const extractionBatchSchema = z.object({
  cards: z.array(atomicCardSchema).max(50),
})

export type AtomicCard = z.infer<typeof atomicCardSchema>
export type ExtractionBatch = z.infer<typeof extractionBatchSchema>
```

- [ ] **Step 2: Anthropic client**

Write `D:\CUEMATH\Flashcard\lib\llm\claude.ts`:
```ts
import Anthropic from '@anthropic-ai/sdk'

let _client: Anthropic | null = null

export function claude(): Anthropic {
  if (!_client) {
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) throw new Error('ANTHROPIC_API_KEY missing')
    _client = new Anthropic({ apiKey })
  }
  return _client
}

export const CLAUDE_MODEL = 'claude-sonnet-4-6'
```

- [ ] **Step 3: Commit**

```
git add lib/llm/types.ts lib/llm/claude.ts
git commit -m "feat(llm): anthropic client + atomic card zod schema"
```

---

## Task 7: Extract cards — prompt + batch call

**Files:**
- Create: `lib/llm/extract-cards.ts`, `lib/llm/extract-cards.test.ts`

- [ ] **Step 1: Write failing test**

Write `D:\CUEMATH\Flashcard\lib\llm\extract-cards.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { buildExtractionPrompt, parseExtractionResponse } from './extract-cards'

describe('buildExtractionPrompt', () => {
  it('embeds page texts with page markers', () => {
    const p = buildExtractionPrompt({
      pages: [{ index: 3, text: 'Hello' }, { index: 4, text: 'World' }],
      alreadyCarded: [],
      remainingBudget: 200,
    })
    expect(p).toContain('--- Page 3 ---')
    expect(p).toContain('Hello')
    expect(p).toContain('--- Page 4 ---')
    expect(p).toContain('World')
  })

  it('includes already-carded list when non-empty', () => {
    const p = buildExtractionPrompt({
      pages: [{ index: 0, text: 'x' }],
      alreadyCarded: ['mitosis', 'photosynthesis'],
      remainingBudget: 50,
    })
    expect(p).toContain('mitosis')
    expect(p).toContain('photosynthesis')
  })

  it('passes remaining budget into prompt', () => {
    const p = buildExtractionPrompt({ pages: [], alreadyCarded: [], remainingBudget: 17 })
    expect(p).toContain('17')
  })
})

describe('parseExtractionResponse', () => {
  it('parses well-formed JSON', () => {
    const raw = JSON.stringify({
      cards: [{ front: 'Q1', back: 'A1', concept_tag: 'topic', source_page: 2 }],
    })
    const parsed = parseExtractionResponse(raw)
    expect(parsed.cards).toHaveLength(1)
    expect(parsed.cards[0].front).toBe('Q1')
  })

  it('strips markdown code fences before parsing', () => {
    const raw = '```json\n{"cards":[{"front":"Q","back":"A","concept_tag":"t","source_page":0}]}\n```'
    expect(parseExtractionResponse(raw).cards).toHaveLength(1)
  })

  it('throws on malformed JSON', () => {
    expect(() => parseExtractionResponse('not json')).toThrow()
  })
})
```

- [ ] **Step 2: Run — expect FAIL**

Run: `pnpm test -- lib/llm/extract-cards.test.ts`
Expected: module not found.

- [ ] **Step 3: Implement**

Write `D:\CUEMATH\Flashcard\lib\llm\extract-cards.ts`:
```ts
import { claude, CLAUDE_MODEL } from './claude'
import { extractionBatchSchema, type ExtractionBatch } from './types'
import type { ParsedPage } from '../pdf/parse'

const SYSTEM = `You are an expert at creating atomic flashcards for spaced repetition.
Rules (Wozniak's 20 Rules, condensed):
- One idea per card. Never combine.
- Minimum information principle: the shortest question that elicits the right answer.
- Never create a card that restates the question.
- Prefer cloze-style only if a term is canonical; otherwise plain Q&A.
- Skip trivia, page numbers, publishing info, tables of contents, and references.
Return ONLY valid JSON matching the requested schema. No prose, no markdown.`

type BuildArgs = {
  pages: ParsedPage[]
  alreadyCarded: string[]
  remainingBudget: number
}

export function buildExtractionPrompt({ pages, alreadyCarded, remainingBudget }: BuildArgs): string {
  const pageBlocks = pages.map((p) => `--- Page ${p.index} ---\n${p.text}`).join('\n\n')
  const dedupeBlock = alreadyCarded.length
    ? `\n\nConcepts already carded (do NOT re-card these):\n${alreadyCarded.map((c) => `- ${c}`).join('\n')}`
    : ''
  return `Extract atomic flashcards from the following pages.

Budget: create AT MOST ${remainingBudget} cards from this batch.
If the content has fewer learning-critical atoms than the budget, return fewer.${dedupeBlock}

${pageBlocks}

Respond with JSON:
{"cards":[{"front":"...","back":"...","concept_tag":"...","source_page":N}]}`
}

export function parseExtractionResponse(raw: string): ExtractionBatch {
  const stripped = raw
    .replace(/^\s*```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/i, '')
    .trim()
  const json = JSON.parse(stripped)
  return extractionBatchSchema.parse(json)
}

export async function extractCards(args: BuildArgs): Promise<ExtractionBatch> {
  const prompt = buildExtractionPrompt(args)
  const res = await claude().messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 4096,
    system: SYSTEM,
    messages: [{ role: 'user', content: prompt }],
  })
  const block = res.content.find((b) => b.type === 'text')
  if (!block || block.type !== 'text') throw new Error('No text block in Claude response')
  return parseExtractionResponse(block.text)
}
```

- [ ] **Step 4: Run — expect PASS**

Run: `pnpm test -- lib/llm/extract-cards.test.ts`
Expected: 6 passed.

- [ ] **Step 5: Commit**

```
git add lib/llm/extract-cards.ts lib/llm/extract-cards.test.ts
git commit -m "feat(llm): atomic card extraction with dedupe + budget + zod"
```

---

## Task 8: Embeddings — OpenRouter client

**Files:**
- Create: `lib/embeddings/types.ts`, `lib/embeddings/openrouter.ts`

- [ ] **Step 1: Types**

Write `D:\CUEMATH\Flashcard\lib\embeddings\types.ts`:
```ts
export type EmbedResult = { vectors: number[][]; dim: number; model: string }
```

- [ ] **Step 2: Client**

Write `D:\CUEMATH\Flashcard\lib\embeddings\openrouter.ts`:
```ts
import type { EmbedResult } from './types'

const DEFAULT_MODEL = 'nvidia/llama-nemotron-embed-vl-1b-v2:free'

export async function embed(texts: string[]): Promise<EmbedResult> {
  if (texts.length === 0) return { vectors: [], dim: 0, model: '' }
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) throw new Error('OPENROUTER_API_KEY missing')
  const model = process.env.EMBEDDING_MODEL ?? DEFAULT_MODEL

  const res = await fetch('https://openrouter.ai/api/v1/embeddings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
      'HTTP-Referer': 'https://cuemath-flashcards.local',
      'X-Title': 'Cuemath Flashcards',
    },
    body: JSON.stringify({ model, input: texts }),
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`OpenRouter embeddings ${res.status}: ${body.slice(0, 500)}`)
  }

  const json = (await res.json()) as { data: { embedding: number[]; index: number }[] }
  const ordered = [...json.data].sort((a, b) => a.index - b.index)
  const vectors = ordered.map((d) => d.embedding)
  const dim = vectors[0]?.length ?? 0
  return { vectors, dim, model }
}
```

- [ ] **Step 3: Commit**

```
git add lib/embeddings/types.ts lib/embeddings/openrouter.ts
git commit -m "feat(embeddings): OpenRouter client with model + dim reporting"
```

---

## Task 9: Ingest job progress helper

**Files:**
- Create: `lib/ingest/job.ts`

- [ ] **Step 1: Implement**

Write `D:\CUEMATH\Flashcard\lib\ingest\job.ts`:
```ts
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

export async function setDeckStatus(deckId: string, status: 'ingesting' | 'ready' | 'failed', cardCount?: number) {
  const db = admin()
  const patch: { status: string; card_count?: number } = { status }
  if (cardCount !== undefined) patch.card_count = cardCount
  const { error } = await db.from('decks').update(patch).eq('id', deckId)
  if (error) throw error
}

export function adminDb() {
  return admin()
}
```

- [ ] **Step 2: Commit**

```
git add lib/ingest/job.ts
git commit -m "feat(ingest): job + deck status mutators (service-role)"
```

---

## Task 10: Ingest pipeline orchestrator

**Files:**
- Create: `lib/ingest/pipeline.ts`

- [ ] **Step 1: Implement**

Write `D:\CUEMATH\Flashcard\lib\ingest\pipeline.ts`:
```ts
import { parsePdf } from '../pdf/parse'
import { chunkPages } from '../pdf/chunk'
import { extractCards } from '../llm/extract-cards'
import { embed } from '../embeddings/openrouter'
import { updateJob, setDeckStatus, adminDb } from './job'
import type { AtomicCard } from '../llm/types'

const CARD_CAP = 200

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
    const pages = await withRetry(() => parsePdf(buffer), 'parsePdf')
    if (pages.length === 0) throw new Error('PDF had no extractable text')

    // --- extract ---
    await updateJob(jobId, { stage: 'extracting', progress_pct: 15 })
    const batches = chunkPages(pages, 10)
    const alreadyCarded: string[] = []
    const allCards: AtomicCard[] = []

    for (let i = 0; i < batches.length; i++) {
      if (allCards.length >= CARD_CAP) break
      const remaining = CARD_CAP - allCards.length
      const batch = batches[i]
      const result = await withRetry(
        () => extractCards({ pages: batch.pages, alreadyCarded, remainingBudget: remaining }),
        `extract batch ${i}`,
      )
      for (const c of result.cards) {
        if (allCards.length >= CARD_CAP) break
        allCards.push(c)
        alreadyCarded.push(c.concept_tag)
      }
      const pct = 15 + Math.floor(((i + 1) / batches.length) * 55)
      await updateJob(jobId, { progress_pct: pct })
    }

    if (allCards.length === 0) throw new Error('No cards extracted from PDF')

    // --- embed ---
    await updateJob(jobId, { stage: 'embedding', progress_pct: 75 })
    const texts = allCards.map((c) => `${c.front}\n${c.back}`)
    const { vectors, dim } = await withRetry(() => embed(texts), 'embed')
    if (vectors.length !== allCards.length) {
      throw new Error(`embed count mismatch: ${vectors.length} vs ${allCards.length}`)
    }

    // --- insert cards ---
    const rows = allCards.map((c, i) => ({
      deck_id: deckId,
      user_id: userId,
      format: 'qa',
      front: { text: c.front },
      back: { text: c.back },
      concept_tag: c.concept_tag,
      source_chunk_id: `page:${c.source_page}`,
      embedding: vectors[i] as unknown as string, // pgvector accepts number[] via PostgREST
      embedding_dim: dim,
    }))
    const { error: insErr } = await db.from('cards').insert(rows)
    if (insErr) throw insErr

    // --- done ---
    await setDeckStatus(deckId, 'ready', allCards.length)
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
```

- [ ] **Step 2: Commit**

```
git add lib/ingest/pipeline.ts
git commit -m "feat(ingest): pipeline orchestrator (parse→extract→embed→insert)"
```

---

## Task 11: Route handler — POST /api/ingest/[jobId]

**Files:**
- Create: `app/api/ingest/[jobId]/route.ts`

- [ ] **Step 1: Read Next 16 route handler docs**

Read: `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/route.md` — confirm `params` is `Promise<...>`.

- [ ] **Step 2: Implement**

Write `D:\CUEMATH\Flashcard\app\api\ingest\[jobId]\route.ts`:
```ts
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
```

- [ ] **Step 3: Commit**

```
git add app/api/ingest/[jobId]/route.ts
git commit -m "feat(ingest): POST /api/ingest/[jobId] kicks off pipeline"
```

---

## Task 12: Server action — createDeckFromUpload

**Files:**
- Create: `app/(app)/library/actions.ts`

- [ ] **Step 1: Implement**

Write `D:\CUEMATH\Flashcard\app\(app)\library\actions.ts`:
```ts
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
  return { ok: true, jobId: job.id }
}
```

- [ ] **Step 2: Commit**

```
git add "app/(app)/library/actions.ts"
git commit -m "feat(library): createDeckFromUpload + retryIngest server actions"
```

---

## Task 13: Upload modal component

**Files:**
- Create: `components/upload-modal.tsx`

- [ ] **Step 1: Implement**

Write `D:\CUEMATH\Flashcard\components\upload-modal.tsx`:
```tsx
'use client'

import { useState, useTransition } from 'react'
import { CueButton } from '@/lib/brand/primitives/button'
import { CueCard } from '@/lib/brand/primitives/card'
import { createDeckFromUpload } from '@/app/(app)/library/actions'

const SUBJECTS = [
  { id: 'math', label: 'Math' },
  { id: 'science', label: 'Science' },
  { id: 'language', label: 'Language' },
  { id: 'humanities', label: 'Humanities' },
  { id: 'other', label: 'Other' },
] as const

export function UploadModal() {
  const [open, setOpen] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [title, setTitle] = useState('')
  const [subject, setSubject] = useState<(typeof SUBJECTS)[number]['id']>('other')
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function pick(f: File) {
    if (f.type !== 'application/pdf') { setError('PDF only'); return }
    if (f.size > 20 * 1024 * 1024) { setError('Max 20MB'); return }
    setFile(f)
    setTitle(f.name.replace(/\.pdf$/i, ''))
    setError(null)
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault()
    const f = e.dataTransfer.files[0]
    if (f) pick(f)
  }

  function submit() {
    if (!file) { setError('Choose a PDF first'); return }
    const fd = new FormData()
    fd.set('file', file)
    fd.set('title', title)
    fd.set('subject_family', subject)
    startTransition(async () => {
      const res = await createDeckFromUpload(fd)
      if ('error' in res) { setError(res.error); return }
      setOpen(false); setFile(null); setTitle(''); setSubject('other'); setError(null)
    })
  }

  if (!open) {
    return <CueButton onClick={() => setOpen(true)} className="w-full">Upload PDF</CueButton>
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => !pending && setOpen(false)}>
      <CueCard className="w-full max-w-md space-y-4" onClick={(e) => e.stopPropagation()}>
        <h2 className="font-display text-xl font-bold">New deck</h2>

        <label
          onDragOver={(e) => e.preventDefault()}
          onDrop={onDrop}
          className="block border-2 border-dashed border-ink-black rounded-card p-6 text-center cursor-pointer"
        >
          <input type="file" accept="application/pdf" className="hidden"
            onChange={(e) => e.target.files?.[0] && pick(e.target.files[0])} />
          <span className="text-sm">{file ? file.name : 'Drop a PDF or click to choose'}</span>
        </label>

        <label className="block">
          <span className="text-sm font-medium">Title</span>
          <input value={title} onChange={(e) => setTitle(e.target.value)}
            className="mt-1 w-full rounded-input border-2 border-ink-black px-4 py-2" />
        </label>

        <div>
          <span className="text-sm font-medium">Subject</span>
          <div className="mt-1 grid grid-cols-3 gap-2">
            {SUBJECTS.map((s) => (
              <button key={s.id} type="button" onClick={() => setSubject(s.id)}
                className={`rounded-input border-2 border-ink-black px-3 py-2 text-sm ${subject === s.id ? 'bg-cue-yellow' : 'bg-transparent'}`}>
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {error && <p className="text-sm text-red-700">{error}</p>}

        <div className="flex gap-2">
          <CueButton variant="ghost" onClick={() => setOpen(false)} disabled={pending} className="flex-1">Cancel</CueButton>
          <CueButton onClick={submit} disabled={pending || !file} className="flex-1">
            {pending ? 'Uploading…' : 'Create deck'}
          </CueButton>
        </div>
      </CueCard>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```
git add components/upload-modal.tsx
git commit -m "feat(library): UploadModal with drag-drop + title + subject"
```

---

## Task 14: Deck card with progress polling

**Files:**
- Create: `components/deck-card.tsx`

- [ ] **Step 1: Implement**

Write `D:\CUEMATH\Flashcard\components\deck-card.tsx`:
```tsx
'use client'

import { useEffect, useState, useTransition } from 'react'
import { CueCard } from '@/lib/brand/primitives/card'
import { CuePill } from '@/lib/brand/primitives/pill'
import { CueButton } from '@/lib/brand/primitives/button'
import { createClient } from '@/lib/db/client'
import { retryIngest } from '@/app/(app)/library/actions'
import type { subjectFamily } from '@/lib/brand/tokens'

type Props = {
  id: string
  title: string
  subjectFamily: subjectFamily
  status: 'ingesting' | 'ready' | 'failed'
  cardCount: number
}

type JobRow = { stage: string; progress_pct: number; error: string | null }

const STAGE_LABEL: Record<string, string> = {
  uploading: 'Uploading',
  parsing: 'Parsing PDF',
  extracting: 'Extracting cards',
  embedding: 'Embedding',
  ready: 'Ready',
  failed: 'Failed',
}

export function DeckCard({ id, title, subjectFamily, status, cardCount }: Props) {
  const [job, setJob] = useState<JobRow | null>(null)
  const [pending, startTransition] = useTransition()
  const active = status === 'ingesting'

  useEffect(() => {
    if (!active) return
    const supabase = createClient()
    let cancelled = false

    async function poll() {
      const { data } = await supabase
        .from('ingest_jobs')
        .select('stage, progress_pct, error')
        .eq('deck_id', id)
        .order('started_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (cancelled) return
      if (data) setJob(data)
      if (data?.stage === 'ready' || data?.stage === 'failed') {
        window.location.reload()
        return
      }
      setTimeout(poll, 2000)
    }
    poll()
    return () => { cancelled = true }
  }, [id, active])

  function onRetry() {
    startTransition(async () => {
      await retryIngest(id)
      window.location.reload()
    })
  }

  return (
    <CueCard subject={subjectFamily}>
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="font-bold truncate">{title}</div>
          {status === 'ready' && <div className="text-sm opacity-70">{cardCount} cards · ready</div>}
          {active && (
            <div className="text-sm opacity-70">
              {STAGE_LABEL[job?.stage ?? 'uploading'] ?? 'Working…'}
              {typeof job?.progress_pct === 'number' ? ` · ${job.progress_pct}%` : ''}
            </div>
          )}
          {status === 'failed' && (
            <div className="text-sm text-red-700">Failed{job?.error ? `: ${job.error.slice(0, 120)}` : ''}</div>
          )}
        </div>
        {status === 'ready' && <CuePill>View</CuePill>}
        {active && <CuePill tone="info">{job?.progress_pct ?? 0}%</CuePill>}
        {status === 'failed' && (
          <CueButton variant="ghost" onClick={onRetry} disabled={pending}>
            {pending ? '…' : 'Retry'}
          </CueButton>
        )}
      </div>
    </CueCard>
  )
}
```

- [ ] **Step 2: Commit**

```
git add components/deck-card.tsx
git commit -m "feat(library): DeckCard with 2s job polling + retry"
```

---

## Task 15: Wire library page to modal + DeckCard

**Files:**
- Modify: `app/(app)/library/page.tsx`

- [ ] **Step 1: Replace body**

Overwrite `D:\CUEMATH\Flashcard\app\(app)\library\page.tsx`:
```tsx
import { createClient } from '@/lib/db/server'
import { CueCard } from '@/lib/brand/primitives/card'
import { CuePill } from '@/lib/brand/primitives/pill'
import { UploadModal } from '@/components/upload-modal'
import { DeckCard } from '@/components/deck-card'
import type { subjectFamily } from '@/lib/brand/tokens'

export default async function LibraryPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name, daily_goal_cards')
    .eq('user_id', user!.id)
    .single()

  const { data: decks } = await supabase
    .from('decks')
    .select('id, title, subject_family, status, card_count')
    .eq('user_id', user!.id)
    .order('created_at', { ascending: false })

  const name = profile?.display_name?.split(' ')[0] ?? 'there'

  return (
    <main className="max-w-2xl mx-auto p-6 space-y-8">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">Hi, {name}</h1>
          <p className="text-sm opacity-70">Goal: {profile?.daily_goal_cards ?? 20} cards today</p>
        </div>
        <CuePill tone="highlight">Day 1</CuePill>
      </header>

      <div><UploadModal /></div>

      {(!decks || decks.length === 0) && (
        <CueCard className="text-center space-y-2">
          <h2 className="font-display text-xl font-bold">No decks yet</h2>
          <p className="text-sm opacity-80">Drop a PDF above to get started.</p>
        </CueCard>
      )}

      {decks && decks.length > 0 && (
        <div className="grid grid-cols-1 gap-4">
          {decks.map((d) => (
            <DeckCard
              key={d.id}
              id={d.id}
              title={d.title}
              subjectFamily={d.subject_family as subjectFamily}
              status={d.status as 'ingesting' | 'ready' | 'failed'}
              cardCount={d.card_count}
            />
          ))}
        </div>
      )}
    </main>
  )
}
```

- [ ] **Step 2: Commit**

```
git add "app/(app)/library/page.tsx"
git commit -m "feat(library): wire UploadModal + DeckCard"
```

---

## Task 16: End-to-end smoke test

- [ ] **Step 1: Start dev server**

Run: `pnpm dev`
Expected: server boots on http://localhost:3000 with no errors.

- [ ] **Step 2: Log in and upload a small PDF (3–10 pages)**

1. Navigate to `/library` (log in if prompted).
2. Click Upload PDF → choose a real PDF → set title → pick subject → Create.
3. Modal closes; deck card appears with progress pill.
4. Watch stages cycle: `Parsing PDF → Extracting cards → Embedding → Ready`.
5. On success, page reloads; deck shows `N cards · ready`.

- [ ] **Step 3: Verify in Supabase dashboard**

- `decks` row: `status='ready'`, `card_count > 0`, `source_pdf_path` set.
- `cards` table: N rows for this deck, `embedding_dim` populated (note the value — we'll use it to plan the prod swap).
- `ingest_jobs`: `stage='ready'`, `progress_pct=100`, `finished_at` set.
- Storage `pdfs` bucket: file exists at `{user_id}/{deck_id}.pdf`.

- [ ] **Step 4: Verify failure path**

1. Upload a tiny text-less PDF (e.g., a scan) or temporarily break `ANTHROPIC_API_KEY`.
2. Deck card should end at `Failed: ...` with a `Retry` button.
3. Fix the env and click Retry → verify it re-ingests without re-uploading.

- [ ] **Step 5: Run full test suite**

Run: `pnpm test`
Expected: all existing tests + new chunk/extract-cards tests pass. 0 failures.

- [ ] **Step 6: Build check**

Run: `pnpm build`
Expected: build completes with no type or lint errors.

- [ ] **Step 7: Final commit**

Any fixes from smoke test get committed as `fix(ingest): ...` commits before moving on.

---

## Self-review notes

- **Spec coverage:** brainstorming Q1–Q8 answers all map to tasks. Q1 (scope B) → Tasks 4–10. Q2 (page chunking, 10 pages) → Task 5. Q3 (upload UX) → Task 13. Q4 (2s polling) → Task 14. Q5 (200 card cap) → Task 10. Q6 (Supabase Storage `{user_id}/{deck_id}.pdf`) → Tasks 3, 12. Q7 (retry-once + failed state + Retry button) → Tasks 10, 12, 14. Q8 (route handler execution) → Task 11.
- **Plan 1 pattern match:** frequent commits, TDD for pure-logic files (chunk, extract-cards), manual smoke-test for integration, uses same CueButton/CueCard/CuePill primitives and subject-tint pattern.
- **Deferred cleanly to Plan 3+:** interference pairs, realtime progress, deck delete, partial-batch persistence, prod timeout hardening, visual polish.
