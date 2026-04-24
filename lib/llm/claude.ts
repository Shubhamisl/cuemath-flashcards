import Anthropic from '@anthropic-ai/sdk'
import type { LlmProvider, LlmCall } from './provider'

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
      const res = await claude().messages.create({
        model,
        max_tokens: call.maxTokens,
        system: call.system,
        messages: call.messages,
      })
      const block = res.content.find((b) => b.type === 'text')
      if (!block || block.type !== 'text') throw new Error('No text block in Anthropic response')
      return block.text
    },
  }
}
