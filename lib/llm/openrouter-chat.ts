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
        choices?: { message: { content: string } }[]
        error?: { message?: string; code?: number }
      }
      if (json.error) {
        throw new Error(`OpenRouter chat error: ${JSON.stringify(json.error).slice(0, 500)}`)
      }
      const content = json.choices?.[0]?.message?.content
      if (!content) {
        throw new Error(`OpenRouter chat malformed response: ${JSON.stringify(json).slice(0, 500)}`)
      }
      return content
    },
  }
}
