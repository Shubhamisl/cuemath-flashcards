import { describe, expect, it } from 'vitest'
import { buildLlmCallLogEntry, classifyLlmError } from './observability'

describe('llm/observability', () => {
  it('classifies truncated output errors from OpenRouter explicitly', () => {
    const error = new Error(
      'OpenRouter chat truncated (finish_reason=length, content=null). The model exhausted its output budget.',
    )

    expect(classifyLlmError(error)).toBe('truncated_output')
  })

  it('classifies missing provider credentials as auth_missing', () => {
    expect(classifyLlmError(new Error('OPENROUTER_API_KEY missing'))).toBe('auth_missing')
    expect(classifyLlmError(new Error('ANTHROPIC_API_KEY missing'))).toBe('auth_missing')
  })

  it('classifies transport and payload failures separately', () => {
    expect(classifyLlmError(new Error('OpenRouter chat 429: rate limited'))).toBe('http_error')
    expect(classifyLlmError(new Error('OpenRouter chat malformed response: {}'))).toBe(
      'malformed_response',
    )
  })

  it('builds a log entry with provider metadata, counters, and a trimmed error', () => {
    const entry = buildLlmCallLogEntry({
      provider: 'openrouter',
      model: 'google/gemma-4-31b-it:free',
      stage: 'extracting',
      userId: 'user-1',
      deckId: 'deck-1',
      jobId: 'job-1',
      latencyMs: 842,
      inputTokens: 1200,
      outputTokens: 321,
      error: new Error(`OpenRouter chat 500: ${'x'.repeat(900)}`),
    })

    expect(entry).toMatchObject({
      provider: 'openrouter',
      model: 'google/gemma-4-31b-it:free',
      stage: 'extracting',
      user_id: 'user-1',
      deck_id: 'deck-1',
      job_id: 'job-1',
      latency_ms: 842,
      input_tokens: 1200,
      output_tokens: 321,
      error_class: 'http_error',
    })
    expect(entry.error_message?.length).toBeLessThanOrEqual(500)
  })

  it('defaults missing counters and unknown errors conservatively', () => {
    const entry = buildLlmCallLogEntry({
      provider: 'anthropic',
      model: 'claude-sonnet-4-6',
      stage: 'extracting',
      latencyMs: null,
      error: 'something odd happened',
    })

    expect(entry).toMatchObject({
      provider: 'anthropic',
      model: 'claude-sonnet-4-6',
      stage: 'extracting',
      input_tokens: 0,
      output_tokens: 0,
      latency_ms: null,
      error_class: 'unknown',
      error_message: 'something odd happened',
    })
  })
})
