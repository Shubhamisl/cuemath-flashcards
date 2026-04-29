import { z } from 'zod'
import { anthropicChat, CLAUDE_MODEL } from './claude'
import { openrouterChat } from './openrouter-chat'
import type { LlmCall, LlmProvider } from './provider'
import { extractionBatchSchema, type ExtractionBatch } from './types'
import type { ParsedPage } from '../pdf/parse'

const LEARNING_UNIT_SYSTEM = `You extract learning units from study material before flashcards are written.

Identify only material that is worth remembering or applying later.
Do not write flashcards yet.

Allowed type values ONLY:
- concept
- formula
- relationship
- worked_example
- common_mistake

Extract:
- concepts and definitions
- formulas and what variables mean
- relationships and distinctions
- worked examples and reusable solution steps
- constraints, conditions, and common mistakes

Skip headings, introductions, page numbers, references, navigation text, and fluff.
Return ONLY valid JSON matching the requested schema. No prose, no markdown.`

const CARD_SYSTEM = `You create high-quality spaced-repetition flashcards from structured learning units.

Rules:
- One card = one testable idea.
- Prefer precise questions with short, complete answers.
- Prefer important definitions, formulas, distinctions, cause-effect relationships, steps, constraints, and common mistakes.
- For math, preserve formulas exactly and separate formula, variable meaning, usage condition, and common mistake into separate cards.
- Never create vague cards like "What is discussed in this section?" or "What does the text say about X?".
- Never create cards that simply restate a source sentence without testing understanding.
- Never create cards whose answer is obvious from the wording of the question.
- Avoid duplicates and near-duplicates, including concepts already listed by the user.
- If a learning unit is not useful enough for review, create no card from it.
Return ONLY valid JSON matching the requested schema. No prose, no markdown.`

export const OPENROUTER_EXTRACTION_FALLBACK_MODEL = 'google/gemma-4-31b-it:free'

const LEARNING_UNIT_TYPES = [
  'concept',
  'formula',
  'relationship',
  'worked_example',
  'common_mistake',
] as const

type LearningUnitType = (typeof LEARNING_UNIT_TYPES)[number]

function normalizeLearningUnitType(value: unknown): LearningUnitType {
  const raw = String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_')

  if (raw === 'formula' || raw === 'equation' || raw === 'rule') return 'formula'
  if (raw === 'relationship' || raw === 'distinction' || raw === 'comparison' || raw === 'cause_effect') {
    return 'relationship'
  }
  if (raw === 'worked_example' || raw === 'example' || raw === 'method' || raw === 'procedure' || raw === 'solution_steps') {
    return 'worked_example'
  }
  if (raw === 'common_mistake' || raw === 'mistake' || raw === 'misconception' || raw === 'pitfall') {
    return 'common_mistake'
  }
  return 'concept'
}

const learningUnitSchema = z.object({
  type: z.preprocess(normalizeLearningUnitType, z.enum(LEARNING_UNIT_TYPES)),
  name: z.string().min(1).max(120),
  teaching_point: z.string().min(1).max(900),
  source_page: z.number().int().min(0).catch(0),
  importance: z.coerce.number().int().min(1).max(3).catch(2),
  related_terms: z.array(z.string().min(1).max(80)).max(8).optional().default([]),
})

const learningUnitBatchSchema = z.object({
  units: z.array(learningUnitSchema).max(80),
})

type LearningUnit = z.infer<typeof learningUnitSchema>
type LearningUnitBatch = z.infer<typeof learningUnitBatchSchema>

type BuildArgs = {
  pages: ParsedPage[]
  alreadyCarded: string[]
  remainingBudget: number
  metadata?: LlmCall['metadata']
}

function stripJsonFences(raw: string): string {
  return raw
    .replace(/^\s*```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/i, '')
    .trim()
}

export function buildLearningUnitPrompt(pages: ParsedPage[]): string {
  const pageBlocks = pages.map((p) => `--- Page ${p.index} ---\n${p.text}`).join('\n\n')
  const unitBudget = Math.max(8, pages.length * 8)

  return `Extract the highest-value learning units from these pages.

Budget: AT MOST ${unitBudget} learning units.
Prefer fewer strong units over many weak ones.
Use importance: 3 = must-study, 2 = useful, 1 = optional.

The type field MUST be exactly one of:
concept, formula, relationship, worked_example, common_mistake

${pageBlocks}

Respond with JSON:
{"units":[{"type":"concept","name":"...","teaching_point":"...","source_page":N,"importance":3,"related_terms":["..."]}]}`
}

export function buildExtractionPrompt({
  alreadyCarded,
  remainingBudget,
}: BuildArgs & { units?: LearningUnit[] }): string {
  const batchBudget = Math.min(remainingBudget, Math.max(6, remainingBudget))
  const dedupeBlock = alreadyCarded.length
    ? `\n\nConcepts already carded (do NOT re-card these):\n${alreadyCarded.map((c) => `- ${c}`).join('\n')}`
    : ''

  return `Generate high-quality atomic flashcards from the supplied learning units.

Budget: create AT MOST ${batchBudget} cards.
If the units have fewer learning-critical atoms than the budget, return fewer.${dedupeBlock}

Quality bar:
- Each card must help a learner remember or apply a specific concept.
- Prefer fewer strong cards over many weak cards.
- Use direct questions, not vague summary prompts.
- Keep answers concise but complete.
- Use concept_tag as a short snake_case label for the tested idea.

Respond with JSON:
{"cards":[{"front":"...","back":"...","concept_tag":"...","source_page":N}]}`
}

function buildCardGenerationPrompt(args: BuildArgs & { units: LearningUnit[] }): string {
  const unitsByImportance = [...args.units].sort((a, b) => b.importance - a.importance)
  const batchBudget = Math.min(args.remainingBudget, Math.max(6, args.units.length * 2))
  const dedupeBlock = args.alreadyCarded.length
    ? `\n\nConcepts already carded (do NOT re-card these):\n${args.alreadyCarded.map((c) => `- ${c}`).join('\n')}`
    : ''

  return `Generate high-quality atomic flashcards from these extracted learning units.

Budget: create AT MOST ${batchBudget} cards.
If the units have fewer learning-critical atoms than the budget, return fewer.${dedupeBlock}

Card strategy:
- importance 3 units usually deserve 1-3 cards.
- formulas usually deserve separate cards for formula, variable meaning, and usage condition.
- worked examples should become reusable step or method cards, not copied problem statements.
- common mistakes should become contrast or warning cards.
- relationships should test the distinction or cause-effect link.

Learning units:
${JSON.stringify({ units: unitsByImportance })}

Respond with JSON:
{"cards":[{"front":"...","back":"...","concept_tag":"...","source_page":N}]}`
}

function parseLearningUnitResponse(raw: string): LearningUnitBatch {
  const json = JSON.parse(stripJsonFences(raw))
  return learningUnitBatchSchema.parse(json)
}

export function parseExtractionResponse(raw: string): ExtractionBatch {
  const json = JSON.parse(stripJsonFences(raw))
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

async function generateParsed<T>(args: {
  provider: LlmProvider
  fallbackLabel: string
  call: LlmCall
  parse: (raw: string) => T
}): Promise<T> {
  const { provider, fallbackLabel, call, parse } = args

  try {
    const raw = await provider.generate(call)
    return parse(raw)
  } catch (error) {
    const providerEnv = process.env.LLM_PROVIDER ?? 'openrouter'
    const fallbackModel = process.env.LLM_EXTRACTION_FALLBACK_MODEL ?? OPENROUTER_EXTRACTION_FALLBACK_MODEL
    const shouldFallback =
      providerEnv === 'openrouter' &&
      provider.name !== fallbackModel &&
      shouldRetryExtractionWithFallback(error)

    if (!shouldFallback) throw error

    console.warn(`[extract-cards] ${provider.name} produced unusable ${fallbackLabel} output; retrying with ${fallbackModel}`)
    const raw = await openrouterChat(fallbackModel).generate(call)
    return parse(raw)
  }
}

export async function extractCards(args: BuildArgs): Promise<ExtractionBatch> {
  const primary = getLlmProvider()

  const units = await generateParsed({
    provider: primary,
    fallbackLabel: 'learning-unit extraction',
    call: {
      system: LEARNING_UNIT_SYSTEM,
      messages: [{ role: 'user', content: buildLearningUnitPrompt(args.pages) }],
      maxTokens: 4096,
      metadata: args.metadata ? { ...args.metadata, stage: 'extracting' } : { stage: 'extracting' },
    },
    parse: parseLearningUnitResponse,
  })

  if (units.units.length === 0) {
    return { cards: [] }
  }

  return generateParsed({
    provider: primary,
    fallbackLabel: 'card-generation',
    call: {
      system: CARD_SYSTEM,
      messages: [{ role: 'user', content: buildCardGenerationPrompt({ ...args, units: units.units }) }],
      maxTokens: 4096,
      metadata: args.metadata ? { ...args.metadata, stage: 'extracting' } : { stage: 'extracting' },
    },
    parse: parseExtractionResponse,
  })
}
