export type DeckStatus = 'ingesting' | 'draft' | 'ready' | 'failed' | 'archived'

export type IngestJobSnapshot = {
  stage: string
  progress_pct: number
  error: string | null
  started_at?: string | null
  finished_at?: string | null
}

type IngestDiagnostics = {
  title: string
  detail: string
  stageLabel: string | null
  progressLabel: string | null
  canRetry: boolean
}

const STAGE_LABELS: Record<string, string> = {
  uploading: 'Uploading',
  parsing: 'Parsing PDF',
  extracting: 'Extracting cards',
  embedding: 'Embedding',
  ready: 'Ready',
  failed: 'Failed',
}

const MAX_ERROR_LENGTH = 220

export function getIngestStageLabel(stage: string | null | undefined): string | null {
  if (!stage) return null
  return STAGE_LABELS[stage] ?? 'Working'
}

export function summarizeIngestError(error: string | null | undefined): string | null {
  const trimmed = error?.trim()
  if (!trimmed) return null

  if (trimmed.includes('PDF had no extractable text')) {
    return 'This PDF looks image-only or scanned. Try a text-based PDF or run OCR first.'
  }
  if (trimmed.includes('No cards extracted from PDF')) {
    return 'We could not find enough learning material to build cards from this PDF.'
  }
  if (trimmed.includes('OpenRouter chat truncated')) {
    return 'The generation model ran out of output budget. Retry the deck to try again with the fallback path.'
  }

  return trimmed.slice(0, MAX_ERROR_LENGTH)
}

export function buildIngestDiagnostics(args: {
  status: DeckStatus
  job?: IngestJobSnapshot | null
}): IngestDiagnostics | null {
  const { status, job } = args

  if (status === 'ingesting') {
    return {
      title: 'Generating cards',
      detail: 'We are still working through the PDF. This page should move forward on its own after the current stage finishes.',
      stageLabel: getIngestStageLabel(job?.stage ?? 'uploading'),
      progressLabel:
        typeof job?.progress_pct === 'number'
          ? `${Math.max(0, Math.min(100, job.progress_pct))}%`
          : null,
      canRetry: false,
    }
  }

  if (status === 'failed') {
    return {
      title: 'Generation failed',
      detail:
        summarizeIngestError(job?.error) ??
        'The latest ingest attempt failed before the deck became reviewable.',
      stageLabel: getIngestStageLabel(job?.stage ?? 'failed'),
      progressLabel:
        typeof job?.progress_pct === 'number'
          ? `${Math.max(0, Math.min(100, job.progress_pct))}%`
          : null,
      canRetry: true,
    }
  }

  return null
}
