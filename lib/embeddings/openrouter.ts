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
