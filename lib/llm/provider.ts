export type LlmMessage = { role: 'user' | 'assistant'; content: string }

export type LlmCall = {
  system: string
  messages: LlmMessage[]
  maxTokens: number
}

export interface LlmProvider {
  generate(call: LlmCall): Promise<string>
  name: string
}
