import { logLlmCall } from '../llm/observability'
import type { LlmLogMetadata } from '../llm/provider'
import type { EmbedResult } from './types'

const DEFAULT_MODEL = 'nvidia/llama-nemotron-embed-vl-1b-v2:free'

export async function embed(texts: string[], metadata?: LlmLogMetadata): Promise<EmbedResult> {
  if (texts.length === 0) return { vectors: [], dim: 0, model: '' }

  const startedAt = Date.now()
  const apiKey = process.env.OPENROUTER_API_KEY
  const model = process.env.EMBEDDING_MODEL ?? DEFAULT_MODEL
  let inputTokens = 0

  try {
    if (!apiKey) throw new Error('OPENROUTER_API_KEY missing')

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

    const json = (await res.json()) as {
      data: { embedding: number[]; index: number }[]
      usage?: { prompt_tokens?: number; total_tokens?: number }
    }
    inputTokens = json.usage?.prompt_tokens ?? json.usage?.total_tokens ?? 0

    const ordered = [...json.data].sort((a, b) => a.index - b.index)
    const vectors = ordered.map((d) => d.embedding)
    const dim = vectors[0]?.length ?? 0

    await logLlmCall({
      provider: 'openrouter',
      model,
      stage: metadata?.stage ?? 'embedding',
      userId: metadata?.userId,
      deckId: metadata?.deckId,
      jobId: metadata?.jobId,
      latencyMs: Date.now() - startedAt,
      inputTokens,
      outputTokens: 0,
    })

    return { vectors, dim, model }
  } catch (error) {
    await logLlmCall({
      provider: 'openrouter',
      model,
      stage: metadata?.stage ?? 'embedding',
      userId: metadata?.userId,
      deckId: metadata?.deckId,
      jobId: metadata?.jobId,
      latencyMs: Date.now() - startedAt,
      inputTokens,
      outputTokens: 0,
      error,
    })
    throw error
  }
}
