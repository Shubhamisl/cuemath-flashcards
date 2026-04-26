import { describe, expect, it } from 'vitest'
import { buildIngestDiagnostics, summarizeIngestError } from './diagnostics'

describe('ingest/diagnostics', () => {
  it('summarizes an active extraction job with stage and progress', () => {
    const diagnostics = buildIngestDiagnostics({
      status: 'ingesting',
      job: {
        stage: 'extracting',
        progress_pct: 15,
        error: null,
      },
    })
    if (!diagnostics) throw new Error('expected ingest diagnostics')

    expect(diagnostics).toMatchObject({
      title: 'Generating cards',
      stageLabel: 'Extracting cards',
      progressLabel: '15%',
      canRetry: false,
    })
    expect(diagnostics.detail).toContain('still working')
  })

  it('turns empty-text PDFs into a clearer message', () => {
    expect(summarizeIngestError('PDF had no extractable text')).toBe(
      'This PDF looks image-only or scanned. Try a text-based PDF or run OCR first.',
    )
  })

  it('marks failed jobs retryable and trims noisy error text', () => {
    const diagnostics = buildIngestDiagnostics({
      status: 'failed',
      job: {
        stage: 'embedding',
        progress_pct: 75,
        error: `OpenRouter embeddings 500: ${'x'.repeat(400)}`,
      },
    })
    if (!diagnostics) throw new Error('expected failed diagnostics')

    expect(diagnostics).toMatchObject({
      title: 'Generation failed',
      stageLabel: 'Embedding',
      canRetry: true,
    })
    expect(diagnostics.detail.length).toBeLessThanOrEqual(220)
  })
})
