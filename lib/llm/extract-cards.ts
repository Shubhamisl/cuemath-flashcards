import { anthropicChat, CLAUDE_MODEL } from './claude'
import { openrouterChat } from './openrouter-chat'
import type { LlmCall, LlmProvider } from './provider'
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

export const OPENROUTER_EXTRACTION_FALLBACK_MODEL = 'google/gemma-4-31b-it:free'

type BuildArgs = {
  pages: ParsedPage[]
  alreadyCarded: string[]
  remainingBudget: number
  metadata?: LlmCall['metadata']
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

export function getLlmProvider(): LlmProvider {
  const providerEnv = process.env.LLM_PROVIDER ?? 'openrouter'
  if (providerEnv === 'anthropic') {
    return anthropicChat(process.env.LLM_MODEL ?? CLAUDE_MODEL)
  }
  return openrouterChat(process.env.LLM_MODEL ?? 'minimax/minimax-m2.5:free')
}

export function shouldRetryExtractionWithFallback(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error)
  return (
    message.includes('OpenRouter chat truncated') ||
    (message.includes('OpenRouter chat malformed response') &&
      message.includes('"finish_reason":"length"') &&
      message.includes('"content":null'))
  )
}

export async function extractCards(args: BuildArgs): Promise<ExtractionBatch> {
  const prompt = buildExtractionPrompt(args)
  const call: LlmCall = {
    system: SYSTEM,
    messages: [{ role: 'user', content: prompt }],
    maxTokens: 4096,
    metadata: args.metadata,
  }
  const primary = getLlmProvider()

  try {
    const raw = await primary.generate(call)
    return parseExtractionResponse(raw)
  } catch (error) {
    const providerEnv = process.env.LLM_PROVIDER ?? 'openrouter'
    const fallbackModel = process.env.LLM_EXTRACTION_FALLBACK_MODEL ?? OPENROUTER_EXTRACTION_FALLBACK_MODEL
    const shouldFallback =
      providerEnv === 'openrouter' &&
      primary.name !== fallbackModel &&
      shouldRetryExtractionWithFallback(error)

    if (!shouldFallback) throw error

    console.warn(`[extract-cards] ${primary.name} exhausted output budget; retrying with ${fallbackModel}`)
    const raw = await openrouterChat(fallbackModel).generate(call)
    return parseExtractionResponse(raw)
  }
}
