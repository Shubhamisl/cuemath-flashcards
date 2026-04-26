export type LlmMessage = { role: 'user' | 'assistant'; content: string }

export type LlmLogMetadata = {
  stage: string
  userId?: string | null
  deckId?: string | null
  jobId?: string | null
}

export type LlmCall = {
  system: string
  messages: LlmMessage[]
  maxTokens: number
  metadata?: LlmLogMetadata
}

export interface LlmProvider {
  generate(call: LlmCall): Promise<string>
  name: string
}
