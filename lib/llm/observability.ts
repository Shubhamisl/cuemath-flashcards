import { adminDb } from '@/lib/db/admin'
import type { Database } from '@/lib/db/types'

const MAX_ERROR_MESSAGE_LENGTH = 500

export type LlmLogContext = {
  stage: string
  userId?: string | null
  deckId?: string | null
  jobId?: string | null
}

type LlmCallLogArgs = LlmLogContext & {
  provider: string
  model: string
  latencyMs: number | null
  inputTokens?: number | null
  outputTokens?: number | null
  error?: unknown
}

type LlmCallInsert = Database['public']['Tables']['llm_calls']['Insert']

export function classifyLlmError(error: unknown): string | null {
  const message = error instanceof Error ? error.message : String(error)

  if (message.includes('_API_KEY missing')) return 'auth_missing'
  if (message.includes('truncated') || message.includes('finish_reason=length')) {
    return 'truncated_output'
  }
  if (message.includes('malformed response') || message.includes('No text block')) {
    return 'malformed_response'
  }
  if (/(\bOpenRouter\b|\bAnthropic\b).*\b\d{3}\b/.test(message) || /\b\d{3}\b/.test(message)) {
    return 'http_error'
  }

  return message ? 'unknown' : null
}

function sanitizeErrorMessage(error: unknown): string | null {
  const message = error instanceof Error ? error.message : String(error ?? '')
  const trimmed = message.trim()
  if (!trimmed) return null
  return trimmed.slice(0, MAX_ERROR_MESSAGE_LENGTH)
}

export function buildLlmCallLogEntry(args: LlmCallLogArgs): LlmCallInsert {
  return {
    provider: args.provider,
    model: args.model,
    stage: args.stage,
    user_id: args.userId ?? null,
    deck_id: args.deckId ?? null,
    job_id: args.jobId ?? null,
    latency_ms: args.latencyMs,
    input_tokens: args.inputTokens ?? 0,
    output_tokens: args.outputTokens ?? 0,
    error_class: classifyLlmError(args.error),
    error_message: sanitizeErrorMessage(args.error),
  }
}

export async function logLlmCall(args: LlmCallLogArgs): Promise<void> {
  try {
    const { error } = await adminDb().from('llm_calls').insert(buildLlmCallLogEntry(args))
    if (error) {
      console.warn('[llm-observability] insert failed', error.message)
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.warn('[llm-observability] logging skipped', message)
  }
}
