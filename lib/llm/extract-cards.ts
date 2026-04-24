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
