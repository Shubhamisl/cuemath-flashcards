import Anthropic from '@anthropic-ai/sdk'
import type { LlmCall, LlmProvider } from './provider'
import { logLlmCall } from './observability'

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

export function anthropicChat(model = CLAUDE_MODEL): LlmProvider {
  return {
    name: model,
    async generate(call: LlmCall): Promise<string> {
      const startedAt = Date.now()
      let inputTokens = 0
      let outputTokens = 0

      try {
        const res = await claude().messages.create({
          model,
          max_tokens: call.maxTokens,
          system: call.system,
          messages: call.messages,
        })

        inputTokens = res.usage.input_tokens
        outputTokens = res.usage.output_tokens

        const block = res.content.find((b) => b.type === 'text')
        if (!block || block.type !== 'text') throw new Error('No text block in Anthropic response')

        await logLlmCall({
          provider: 'anthropic',
          model,
          stage: call.metadata?.stage ?? 'unknown',
          userId: call.metadata?.userId,
          deckId: call.metadata?.deckId,
          jobId: call.metadata?.jobId,
          latencyMs: Date.now() - startedAt,
          inputTokens,
          outputTokens,
        })

        return block.text
      } catch (error) {
        await logLlmCall({
          provider: 'anthropic',
          model,
          stage: call.metadata?.stage ?? 'unknown',
          userId: call.metadata?.userId,
          deckId: call.metadata?.deckId,
          jobId: call.metadata?.jobId,
          latencyMs: Date.now() - startedAt,
          inputTokens,
          outputTokens,
          error,
        })
        throw error
      }
    },
  }
}
