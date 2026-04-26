'use client'

import { useEffect, useState, useTransition } from 'react'
import Link from 'next/link'
import { CueCard } from '@/lib/brand/primitives/card'
import { CuePill } from '@/lib/brand/primitives/pill'
import { CueButton } from '@/lib/brand/primitives/button'
import { MasteryRing } from '@/components/mastery-ring'
import { createClient } from '@/lib/db/client'
import { deleteDeckFromLibrary, retryIngest } from '@/app/(app)/library/actions'
import { tierToTone } from '@/lib/progress/tier-tone'
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
  dueCount?: number
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

export function DeckCard({ id, title, subjectFamily, status, cardCount, tier, masteryPct, dueCount }: Props) {
  const [job, setJob] = useState<JobRow | null>(null)
  const [pending, startTransition] = useTransition()
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
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

  function onDelete() {
    if (pending) return
    setDeleteError(null)
    startTransition(async () => {
      const res = await deleteDeckFromLibrary(id)
      if ('error' in res) {
        setDeleteError('Could not delete deck. Try again.')
        setConfirmDelete(false)
        return
      }
      window.location.reload()
    })
  }

  const deleteConfirmUI = (
    <div className="absolute inset-0 z-20 flex items-center justify-center rounded-[inherit] bg-white/95 p-4">
      <div className="w-full space-y-3 text-center">
        <p className="font-display font-semibold text-sm text-ink-black leading-snug">
          Delete <span className="text-alert-coral">{title}</span>?
        </p>
        <p className="text-xs text-ink-black/60">All cards and history will be wiped. No undo.</p>
        {deleteError && <p className="text-xs text-alert-coral">{deleteError}</p>}
        <div className="flex items-center justify-center gap-2">
          <CueButton variant="ghost" size="sm" onClick={() => setConfirmDelete(false)} disabled={pending}>
            Cancel
          </CueButton>
          <button
            type="button"
            onClick={onDelete}
            disabled={pending}
            className="inline-flex min-h-[32px] items-center rounded-input bg-alert-coral px-3 font-display font-bold text-xs text-ink-black hover:brightness-95 active:scale-[0.98] transition-transform disabled:opacity-50"
          >
            {pending ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  )

  const trashButton = (
    <button
      type="button"
      aria-label="Delete deck"
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        setConfirmDelete(true)
      }}
      className="absolute top-2 right-2 z-10 opacity-0 group-hover/card:opacity-100 focus-visible:opacity-100 transition-opacity rounded-full p-1.5 bg-ink-black/5 hover:bg-alert-coral/15 text-ink-black/40 hover:text-alert-coral"
    >
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
        <path d="M2 3.5h10M5.5 3.5V2.5a.5.5 0 0 1 .5-.5h2a.5.5 0 0 1 .5.5v1M5.5 6v4M8.5 6v4M3 3.5l.6 7.1a.5.5 0 0 0 .5.4h5.8a.5.5 0 0 0 .5-.4l.6-7.1" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  )

  const cardBody = (
    <div className="flex flex-col gap-4 h-full min-h-[200px]">
      <div className="flex items-start justify-between">
        {status === 'ready' && typeof masteryPct === 'number' ? (
          <MasteryRing pct={masteryPct} size={64} stroke={6} showLabel={false} />
        ) : (
          <div className="size-16" />
        )}
        <div className="flex flex-col items-end gap-1.5">
          {status === 'ready' && tier && (
            <CuePill tone={tierToTone(tier)}>{tier}</CuePill>
          )}
          {status === 'ready' && typeof dueCount === 'number' && dueCount > 0 && (
            <CuePill tone="info">{dueCount} due</CuePill>
          )}
          {active && <CuePill tone="info">{`${job?.progress_pct ?? 0}%`}</CuePill>}
        </div>
      </div>

      <div className="space-y-1">
        <div className="font-display font-extrabold text-lg leading-tight truncate">{title}</div>
        {status === 'ready' && (
          <div className="text-sm text-ink-black/60">{cardCount} cards</div>
        )}
        {active && (
          <div className="text-sm text-ink-black/60">
            {STAGE_LABEL[job?.stage ?? 'uploading'] ?? 'Working...'}
            {typeof job?.progress_pct === 'number' ? ` - ${job.progress_pct}%` : ''}
          </div>
        )}
        {status === 'failed' && (
          <div className="text-sm text-red-700">
            Failed{job?.error ? `: ${job.error.slice(0, 120)}` : ''}
          </div>
        )}
      </div>

      {status === 'ready' && typeof masteryPct === 'number' && (
        <div className="mt-auto text-xs uppercase tracking-[0.08em] text-ink-black/60">
          {masteryPct}% mastered
        </div>
      )}

      {status === 'failed' && (
        <div className="mt-auto flex items-center gap-2">
          <CueButton variant="ghost" onClick={onRetry} disabled={pending}>
            {pending ? '...' : 'Retry'}
          </CueButton>
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            disabled={pending}
            className="font-body text-sm font-semibold text-alert-coral hover:underline disabled:opacity-50"
          >
            Delete
          </button>
        </div>
      )}
    </div>
  )

  if (status === 'ready') {
    return (
      <div className="relative group/card">
        {confirmDelete && deleteConfirmUI}
        {trashButton}
        <Link href={`/deck/${id}`} className="block group">
          <CueCard
            subject={subjectFamily}
            className="shadow-card-rest h-full transition-transform duration-tap group-hover:-translate-y-0.5"
          >
            {cardBody}
          </CueCard>
        </Link>
      </div>
    )
  }

  return (
    <div className="relative group/card">
      {confirmDelete && deleteConfirmUI}
      {status !== 'failed' && trashButton}
      <CueCard subject={subjectFamily} className="shadow-card-rest h-full">
        {cardBody}
      </CueCard>
    </div>
  )
}
