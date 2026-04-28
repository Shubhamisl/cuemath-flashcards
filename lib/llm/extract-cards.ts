import { anthropicChat, CLAUDE_MODEL } from './claude'
import { openrouterChat } from './openrouter-chat'
import type { LlmCall, LlmProvider } from './provider'
import { extractionBatchSchema, type ExtractionBatch } from './types'
import type { ParsedPage } from '../pdf/parse'

const SYSTEM = `You create high-quality spaced-repetition flashcards.

Rules:
- One card = one testable idea.
- Prefer precise questions with short, complete answers.
- Prefer important definitions, formulas, distinctions, cause-effect relationships, steps, constraints, and common mistakes.
- For math, preserve formulas exactly and separate formula, variable meaning, usage condition, and common mistake into separate cards.
- Skip headings, introductions, examples without reusable learning value, references, page numbers, navigation text, and fluff.
- Never create vague cards like "What is discussed in this section?" or "What does the text say about X?".
- Never create cards that simply restate a source sentence without testing understanding.
- Never create cards whose answer is obvious from the wording of the question.
- Avoid duplicates and near-duplicates, including concepts already listed by the user.
- If a page has no useful study material, return no cards for it.
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
  const batchBudget = Math.min(remainingBudget, Math.max(6, pages.length * 6))
  const dedupeBlock = alreadyCarded.length
    ? `\n\nConcepts already carded (do NOT re-card these):\n${alreadyCarded.map((c) => `- ${c}`).join('\n')}`
    : ''
  return `Extract only the highest-value atomic flashcards from the following pages.

Budget: create AT MOST ${batchBudget} cards from this batch.
If the content has fewer learning-critical atoms than the budget, return fewer.${dedupeBlock}

Quality bar:
- Each card must help a learner remember or apply a specific concept.
- Prefer fewer strong cards over many weak cards.
- Use direct questions, not vague summary prompts.
- Keep answers concise but complete.
- Use concept_tag as a short snake_case label for the tested idea.

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
    error instanceof SyntaxError ||
    message.includes('Unterminated string') ||
    message.includes('Unexpected end of JSON') ||
    message.includes('Expected') ||
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

    console.warn(`[extract-cards] ${primary.name} produced unusable extraction output; retrying with ${fallbackModel}`)
    const raw = await openrouterChat(fallbackModel).generate(call)
    return parseExtractionResponse(raw)
  }
}
