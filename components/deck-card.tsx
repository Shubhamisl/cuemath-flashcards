'use client'

import { useEffect, useState, useTransition } from 'react'
import Link from 'next/link'
import { CueCard } from '@/lib/brand/primitives/card'
import { CuePill } from '@/lib/brand/primitives/pill'
import { CueButton } from '@/lib/brand/primitives/button'
import { MasteryRing } from '@/components/mastery-ring'
import { createClient } from '@/lib/db/client'
import { retryIngest } from '@/app/(app)/library/actions'
import type { subjectFamily } from '@/lib/brand/tokens'
import type { Tier } from '@/lib/progress/deck-stats'

type Props = {
  id: string
  title: string
  subjectFamily: subjectFamily
  status: 'ingesting' | 'ready' | 'failed'
  cardCount: number
  tier?: Tier
  masteryPct?: number
}

type JobRow = { stage: string; progress_pct: number; error: string | null }

const STAGE_LABEL: Record<string, string> = {
  uploading: 'Uploading',
  parsing: 'Parsing PDF',
  extracting: 'Extracting cards',
  embedding: 'Embedding',
  ready: 'Ready',
  failed: 'Failed',
}

export function DeckCard({ id, title, subjectFamily, status, cardCount, tier, masteryPct }: Props) {
  const [job, setJob] = useState<JobRow | null>(null)
  const [pending, startTransition] = useTransition()
  const active = status === 'ingesting'

  useEffect(() => {
    if (!active) return
    const supabase = createClient()
    let cancelled = false

    async function poll() {
      const { data } = await supabase
        .from('ingest_jobs')
        .select('stage, progress_pct, error')
        .eq('deck_id', id)
        .order('started_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (cancelled) return
      if (data) setJob(data)
      if (data?.stage === 'ready' || data?.stage === 'failed') {
        window.location.reload()
        return
      }
      setTimeout(poll, 2000)
    }
    poll()
    return () => { cancelled = true }
  }, [id, active])

  function onRetry() {
    startTransition(async () => {
      await retryIngest(id)
      window.location.reload()
    })
  }

  return (
    <CueCard subject={subjectFamily} className="shadow-card-rest">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="font-bold truncate">{title}</div>
          {status === 'ready' && (
            <div className="flex items-center gap-2 text-sm opacity-70">
              <span>{cardCount} cards</span>
              {tier && <CuePill tone="highlight">{tier}</CuePill>}
            </div>
          )}
          {active && (
            <div className="text-sm opacity-70">
              {STAGE_LABEL[job?.stage ?? 'uploading'] ?? 'Working…'}
              {typeof job?.progress_pct === 'number' ? ` · ${job.progress_pct}%` : ''}
            </div>
          )}
          {status === 'failed' && (
            <div className="text-sm text-red-700">Failed{job?.error ? `: ${job.error.slice(0, 120)}` : ''}</div>
          )}
        </div>
        {status === 'ready' && (
          <div className="flex items-center gap-3">
            {typeof masteryPct === 'number' && <MasteryRing pct={masteryPct} />}
            <Link href={`/deck/${id}`}>
              <CuePill>View</CuePill>
            </Link>
          </div>
        )}
        {active && <CuePill tone="info">{`${job?.progress_pct ?? 0}%`}</CuePill>}
        {status === 'failed' && (
          <CueButton variant="ghost" onClick={onRetry} disabled={pending}>
            {pending ? '…' : 'Retry'}
          </CueButton>
        )}
      </div>
    </CueCard>
  )
}
