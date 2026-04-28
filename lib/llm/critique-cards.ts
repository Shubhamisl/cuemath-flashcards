import { z } from 'zod'
import { openrouterChat } from './openrouter-chat'
import type { LlmCall, LlmProvider } from './provider'
import { atomicCardSchema, type AtomicCard } from './types'
import {
  getLlmProvider,
  OPENROUTER_EXTRACTION_FALLBACK_MODEL,
  shouldRetryExtractionWithFallback,
} from './extract-cards'

const CRITIQUE_SYSTEM = `You are a strict flashcard editor for spaced repetition.

Your job is to judge each candidate card before it reaches the learner.

For every candidate, choose exactly one decision:
- keep: already useful and atomic
- rewrite: promising but vague, broad, wordy, or poorly phrased
- drop: shallow, duplicated, obvious, copied from a heading, navigational, or not useful for long-term memory

Quality score:
1 = useless / wrong / pure fluff
2 = weak / too broad / mostly not worth studying
3 = acceptable after rewrite or minor cleanup
4 = strong card
5 = excellent teacher-quality card

Rules:
- Keep or rewrite only cards with quality_score >= 3.
- Drop cards with quality_score <= 2.
- One card = one testable idea.
- Front must be a direct, specific question.
- Back must be concise but complete.
- Prefer definitions, formulas, distinctions, cause-effect, steps, constraints, and common mistakes.
- For math, preserve formulas exactly.
- Do not keep cards like "What is discussed in this section?".
- Do not keep cards where the answer is obvious from the question wording.
- Merge or drop near-duplicates.
- Keep source_page from the original card.
Return ONLY valid JSON matching the requested schema. No prose, no markdown.`

const CRITIQUE_BATCH_SIZE = 20
const MIN_QUALITY_SCORE = 3

const critiqueDecisionSchema = z.object({
  decision: z.enum(['keep', 'rewrite', 'drop']),
  quality_score: z.coerce.number().int().min(1).max(5),
  reason: z.string().max(240).optional().default(''),
  card: atomicCardSchema.nullable().optional(),
})

const critiqueBatchSchema = z.object({
  decisions: z.array(critiqueDecisionSchema).max(80),
})

type CritiqueBatch = z.infer<typeof critiqueBatchSchema>

type CritiqueArgs = {
  cards: AtomicCard[]
  metadata?: LlmCall['metadata']
}

function chunkCards(cards: AtomicCard[], size: number): AtomicCard[][] {
  const chunks: AtomicCard[][] = []
  for (let i = 0; i < cards.length; i += size) {
    chunks.push(cards.slice(i, i + size))
  }
  return chunks
}

function stripJsonFences(raw: string): string {
  return raw
    .replace(/^\s*```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/i, '')
    .trim()
}

function parseCritiqueResponse(raw: string): CritiqueBatch {
  const json = JSON.parse(stripJsonFences(raw))
  return critiqueBatchSchema.parse(json)
}

function buildCritiquePrompt(cards: AtomicCard[], mode: 'strict' | 'rewrite-biased' = 'strict'): string {
  const modeInstruction =
    mode === 'rewrite-biased'
      ? 'If a card is weak but based on a useful idea, prefer rewriting it instead of dropping it. Still drop pure fluff and duplicates.'
      : 'Be strict. Drop weak cards instead of preserving them.'

  return `Critique this candidate flashcard batch.

${modeInstruction}

Return one decision per candidate card when possible.
For keep or rewrite, include a final improved card object.
For drop, omit card or set card to null.
Do not invent concepts that are not represented in the candidate cards.
Preserve source_page values.
Use short snake_case concept_tag values.

Candidate cards:
${JSON.stringify({ cards })}

Respond with JSON:
{"decisions":[{"decision":"keep","quality_score":4,"reason":"specific and atomic","card":{"front":"...","back":"...","concept_tag":"...","source_page":N}}]}`
}

async function runCritiqueWithProvider(
  provider: LlmProvider,
  cards: AtomicCard[],
  metadata?: LlmCall['metadata'],
  mode: 'strict' | 'rewrite-biased' = 'strict',
): Promise<CritiqueBatch> {
  const call: LlmCall = {
    system: CRITIQUE_SYSTEM,
    messages: [{ role: 'user', content: buildCritiquePrompt(cards, mode) }],
    maxTokens: 4096,
    metadata: metadata ? { ...metadata, stage: 'critiquing' } : { stage: 'critiquing' },
  }

  const raw = await provider.generate(call)
  return parseCritiqueResponse(raw)
}

async function critiqueBatch(
  cards: AtomicCard[],
  metadata?: LlmCall['metadata'],
  mode: 'strict' | 'rewrite-biased' = 'strict',
): Promise<AtomicCard[]> {
  const primary = getLlmProvider()

  try {
    const result = await runCritiqueWithProvider(primary, cards, metadata, mode)
    return cardsFromCritique(result)
  } catch (error) {
    const providerEnv = process.env.LLM_PROVIDER ?? 'openrouter'
    const fallbackModel = process.env.LLM_EXTRACTION_FALLBACK_MODEL ?? OPENROUTER_EXTRACTION_FALLBACK_MODEL
    const shouldFallback =
      providerEnv === 'openrouter' &&
      primary.name !== fallbackModel &&
      shouldRetryExtractionWithFallback(error)

    if (!shouldFallback) throw error

    console.warn(`[critique-cards] ${primary.name} produced unusable critique output; retrying with ${fallbackModel}`)
    const result = await runCritiqueWithProvider(openrouterChat(fallbackModel), cards, metadata, mode)
    return cardsFromCritique(result)
  }
}

function cardsFromCritique(result: CritiqueBatch): AtomicCard[] {
  const accepted: AtomicCard[] = []

  for (const item of result.decisions) {
    if (item.decision === 'drop') continue
    if (item.quality_score < MIN_QUALITY_SCORE) continue
    if (!item.card) continue
    accepted.push(item.card)
  }

  return accepted
}

function dedupeCards(cards: AtomicCard[]): AtomicCard[] {
  const accepted: AtomicCard[] = []
  const seen = new Set<string>()

  for (const card of cards) {
    const front = card.front.trim().toLowerCase().replace(/\s+/g, ' ')
    const back = card.back.trim().toLowerCase().replace(/\s+/g, ' ')
    const tag = card.concept_tag.trim().toLowerCase()
    const key = `${tag}::${front}::${back}`
    if (seen.has(key)) continue
    seen.add(key)
    accepted.push(card)
  }

  return accepted
}

export async function critiqueCards({ cards, metadata }: CritiqueArgs): Promise<AtomicCard[]> {
  if (cards.length === 0) return []

  const strictAccepted: AtomicCard[] = []

  for (const batch of chunkCards(cards, CRITIQUE_BATCH_SIZE)) {
    strictAccepted.push(...(await critiqueBatch(batch, metadata, 'strict')))
  }

  const strictDeduped = dedupeCards(strictAccepted)

  // If the strict pass is too aggressive, do one gentler rewrite-biased pass.
  // This avoids falling back to raw weak cards while still protecting quality.
  if (strictDeduped.length >= Math.ceil(cards.length * 0.35) || cards.length <= 3) {
    return strictDeduped
  }

  console.warn(
    `[critique-cards] strict critique kept ${strictDeduped.length}/${cards.length}; retrying with rewrite-biased mode`,
  )

  const rewriteAccepted: AtomicCard[] = []
  for (const batch of chunkCards(cards, CRITIQUE_BATCH_SIZE)) {
    rewriteAccepted.push(...(await critiqueBatch(batch, metadata, 'rewrite-biased')))
  }

  return dedupeCards(rewriteAccepted)
}
