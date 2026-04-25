import type { LlmProvider, LlmCall } from './provider'

export function openrouterChat(model: string): LlmProvider {
  return {
    name: model,
    async generate(call: LlmCall): Promise<string> {
      const apiKey = process.env.OPENROUTER_API_KEY
      if (!apiKey) throw new Error('OPENROUTER_API_KEY missing')

      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
          'HTTP-Referer': 'https://cuemath-flashcards.local',
          'X-Title': 'Cuemath Flashcards',
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: call.system },
            ...call.messages.map((m) => ({ role: m.role, content: m.content })),
          ],
          max_tokens: call.maxTokens,
          temperature: 0,
        }),
      })

      if (!res.ok) {
        const body = await res.text()
        throw new Error(`OpenRouter chat ${res.status}: ${body.slice(0, 500)}`)
      }

      const json = (await res.json()) as {
        choices?: {
          message: { content: string | null; reasoning?: string | null }
          finish_reason?: string
        }[]
        error?: { message?: string; code?: number }
      }
      if (json.error) {
        throw new Error(`OpenRouter chat error: ${JSON.stringify(json.error).slice(0, 500)}`)
      }
      const choice = json.choices?.[0]
      const finishReason = choice?.finish_reason
      // Reasoning-style models (e.g. tencent/hy3-preview) put chain-of-thought
      // in `reasoning` and the final answer in `content`. If they run out of
      // tokens mid-reasoning, `content` is null. Surface that explicitly so
      // the operator knows to swap models or raise max_tokens.
      const content = choice?.message?.content
      if (!content) {
        if (finishReason === 'length') {
          throw new Error(
            `OpenRouter chat truncated (finish_reason=length, content=null). ` +
              `The model exhausted its output budget — likely a reasoning model. ` +
              `Swap LLM_MODEL to a non-reasoning model (e.g. google/gemma-4-31b-it:free).`,
          )
        }
        throw new Error(`OpenRouter chat malformed response: ${JSON.stringify(json).slice(0, 500)}`)
      }
      return content
    },
  }
}
