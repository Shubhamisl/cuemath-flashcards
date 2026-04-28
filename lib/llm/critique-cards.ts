import { openrouterChat } from './openrouter-chat'
import type { LlmCall, LlmProvider } from './provider'
import { extractionBatchSchema, type AtomicCard, type ExtractionBatch } from './types'
import {
  getLlmProvider,
  OPENROUTER_EXTRACTION_FALLBACK_MODEL,
  parseExtractionResponse,
  shouldRetryExtractionWithFallback,
} from './extract-cards'

const CRITIQUE_SYSTEM = `You are a strict flashcard editor for spaced repetition.

Your job is to improve a candidate flashcard batch before it reaches the learner.

Keep only cards that are useful for long-term memory.
Rewrite cards that are promising but vague.
Drop cards that are shallow, duplicated, too broad, obvious, purely navigational, or copied from headings.

Quality rules:
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

const CRITIQUE_BATCH_SIZE = 25

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

function buildCritiquePrompt(cards: AtomicCard[]): string {
  return `Critique and improve this candidate flashcard batch.

Return a filtered and rewritten card list. Keep fewer cards if needed.
Do not invent new concepts that are not represented in the candidate cards.
Preserve source_page values.
Use short snake_case concept_tag values.

Candidate cards:
${JSON.stringify({ cards })}

Respond with JSON:
{"cards":[{"front":"...","back":"...","concept_tag":"...","source_page":N}]}`
}

async function runCritiqueWithProvider(
  provider: LlmProvider,
  cards: AtomicCard[],
  metadata?: LlmCall['metadata'],
): Promise<ExtractionBatch> {
  const call: LlmCall = {
    system: CRITIQUE_SYSTEM,
    messages: [{ role: 'user', content: buildCritiquePrompt(cards) }],
    maxTokens: 4096,
    metadata: metadata ? { ...metadata, stage: 'critiquing' } : { stage: 'critiquing' },
  }

  const raw = await provider.generate(call)
  const parsed = parseExtractionResponse(raw)
  return extractionBatchSchema.parse(parsed)
}

async function critiqueBatch(
  cards: AtomicCard[],
  metadata?: LlmCall['metadata'],
): Promise<AtomicCard[]> {
  const primary = getLlmProvider()

  try {
    const result = await runCritiqueWithProvider(primary, cards, metadata)
    return result.cards
  } catch (error) {
    const providerEnv = process.env.LLM_PROVIDER ?? 'openrouter'
    const fallbackModel = process.env.LLM_EXTRACTION_FALLBACK_MODEL ?? OPENROUTER_EXTRACTION_FALLBACK_MODEL
    const shouldFallback =
      providerEnv === 'openrouter' &&
      primary.name !== fallbackModel &&
      shouldRetryExtractionWithFallback(error)

    if (!shouldFallback) throw error

    console.warn(`[critique-cards] ${primary.name} produced unusable critique output; retrying with ${fallbackModel}`)
    const result = await runCritiqueWithProvider(openrouterChat(fallbackModel), cards, metadata)
    return result.cards
  }
}

export async function critiqueCards({ cards, metadata }: CritiqueArgs): Promise<AtomicCard[]> {
  if (cards.length === 0) return []

  const accepted: AtomicCard[] = []
  const seen = new Set<string>()

  for (const batch of chunkCards(cards, CRITIQUE_BATCH_SIZE)) {
    const critiqued = await critiqueBatch(batch, metadata)
    for (const card of critiqued) {
      const key = `${card.concept_tag.trim().toLowerCase()}::${card.front.trim().toLowerCase()}`
      if (seen.has(key)) continue
      seen.add(key)
      accepted.push(card)
    }
  }

  return accepted
}
