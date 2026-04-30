'use client'

import { useEffect, useState, useTransition } from 'react'
import Link from 'next/link'
import { motion } from 'motion/react'
import { CueCard } from '@/lib/brand/primitives/card'
import { CuePill } from '@/lib/brand/primitives/pill'
import { CueButton } from '@/lib/brand/primitives/button'
import { MasteryRing } from '@/components/mastery-ring'
import { createClient } from '@/lib/db/client'
import { deleteDeckFromLibrary, retryIngest } from '@/app/(app)/library/actions'
import { tierToTone } from '@/lib/progress/tier-tone'
import { buildIngestDiagnostics, getIngestStageLabel, type IngestJobSnapshot } from '@/lib/ingest/diagnostics'
import type { subjectFamily } from '@/lib/brand/tokens'
import type { Tier } from '@/lib/progress/deck-stats'

type Props = {
  id: string
  title: string
  subjectFamily: subjectFamily
  status: 'ingesting' | 'draft' | 'ready' | 'failed' | 'archived'
  cardCount: number
  tags?: string[]
  tier?: Tier
  masteryPct?: number
  dueCount?: number
  initialJob?: IngestJobSnapshot | null
}

type JobRow = IngestJobSnapshot

const SUBJECT_LABELS: Record<subjectFamily, string> = {
  math: 'Math',
  language: 'Language',
  science: 'Science',
  humanities: 'Humanities',
  other: 'Other',
}

function DeckProgressPanel({
  masteryPct,
  dueCount,
}: {
  masteryPct: number
  dueCount?: number
}) {
  return (
    <div
      data-testid="deck-progress-panel"
      className="flex min-w-0 flex-1 items-center gap-3 rounded-[6px] border border-ink-black bg-paper-white p-3"
    >
      <MasteryRing pct={masteryPct} size={54} stroke={6} showLabel={false} />
      <div className="min-w-0 space-y-1">
        <div className="font-display text-[10px] font-extrabold uppercase tracking-[0.1em] text-ink-black/55">
          Mastery
        </div>
        <div className="font-display text-2xl font-extrabold leading-none text-ink-black">
          {masteryPct}%
        </div>
        <div className="text-xs font-bold uppercase tracking-[0.06em] text-ink-black/55">
          {typeof dueCount === 'number' && dueCount > 0 ? `${dueCount} due` : 'clear queue'}
        </div>
      </div>
    </div>
  )
}

export function DeckCard({
  id,
  title,
  subjectFamily,
  status,
  cardCount,
  tags = [],
  tier,
  masteryPct,
  dueCount,
  initialJob = null,
}: Props) {
  const [job, setJob] = useState<JobRow | null>(initialJob)
  const [pending, startTransition] = useTransition()
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const active = status === 'ingesting'
  const diagnostics = buildIngestDiagnostics({ status, job })

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
    <div className="flex h-full min-h-[220px] flex-col">
      <div className="flex items-center justify-between border-b border-ink-black bg-paper-white px-4 py-2">
        <span className="text-xs font-display font-bold text-ink-black">
          {SUBJECT_LABELS[subjectFamily]}
        </span>
        <span aria-hidden="true" className="text-xs font-display font-bold text-ink-black/45">
          {status.toUpperCase()}
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-5 p-5">
        <div className="flex items-start justify-between gap-3">
          {status === 'ready' && typeof masteryPct === 'number' ? (
            <DeckProgressPanel masteryPct={masteryPct} dueCount={dueCount} />
          ) : (
            <div className="size-16" />
          )}
          <div className="flex flex-col items-end gap-1.5">
          {status === 'draft' && <CuePill tone="warning">Draft</CuePill>}
          {status === 'archived' && <CuePill tone="neutral">Archived</CuePill>}
          {status === 'ready' && tier && (
            <CuePill tone={tierToTone(tier)}>{tier}</CuePill>
          )}
          {status === 'ready' && typeof dueCount === 'number' && dueCount > 0 && (
            <CuePill tone="info">{dueCount} due</CuePill>
          )}
          {active && <CuePill tone="info">{`${job?.progress_pct ?? 0}%`}</CuePill>}
          </div>
        </div>

        <div className="space-y-2">
          <div className="font-display text-[20px] font-extrabold leading-tight text-ink-black">
            {title}
          </div>
          {status === 'ready' && (
            <div className="flex flex-wrap items-center gap-2 text-sm text-ink-black/62">
              <span>{cardCount} cards</span>
              {typeof dueCount === 'number' && dueCount > 0 ? <span aria-hidden="true">-</span> : null}
              {typeof dueCount === 'number' && dueCount > 0 ? <span>{dueCount} due now</span> : null}
            </div>
          )}
          {status === 'draft' && (
            <div className="text-sm text-ink-black/60">{cardCount} cards - review before study</div>
          )}
          {status === 'archived' && (
            <div className="text-sm text-ink-black/60">{cardCount} cards - hidden from active study</div>
          )}
          {active && (
            <div className="text-sm text-ink-black/60">
              {diagnostics?.stageLabel ?? getIngestStageLabel(job?.stage ?? 'uploading') ?? 'Working...'}
              {diagnostics?.progressLabel ? ` - ${diagnostics.progressLabel}` : ''}
            </div>
          )}
          {status === 'failed' && (
            <div className="space-y-1">
              <div className="text-sm font-semibold text-red-700">{diagnostics?.title ?? 'Generation failed'}</div>
              {diagnostics?.detail && (
                <div className="text-sm text-red-700/90">{diagnostics.detail}</div>
              )}
            </div>
          )}
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-2">
              {tags.slice(0, 3).map((tag) => (
                <CuePill key={tag} tone="neutral">{tag}</CuePill>
              ))}
            </div>
          )}
        </div>

        {status === 'ready' && typeof masteryPct === 'number' && (
          <div className="mt-auto border-t border-dashed border-ink-black/30 pt-4 text-xs uppercase tracking-[0.08em] text-ink-black/60">
            {masteryPct}% mastered
          </div>
        )}

        {status === 'draft' && (
          <div className="mt-auto text-xs uppercase tracking-[0.08em] text-ink-black/60">
            Review gate pending
          </div>
        )}

        {status === 'archived' && (
          <div className="mt-auto text-xs uppercase tracking-[0.08em] text-ink-black/60">
            Archived
          </div>
        )}

        {status === 'failed' && (
          <div className="mt-auto flex flex-wrap items-center gap-2">
            <CueButton variant="ghost" onClick={onRetry} disabled={pending}>
              {pending ? '...' : 'Retry'}
            </CueButton>
            <Link href={`/deck/${id}`} className="font-body text-sm font-semibold text-ink-black/70 hover:underline">
              View details
            </Link>
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
    </div>
  )

  if (status === 'ready' || status === 'draft' || status === 'archived') {
    return (
      <motion.div
        data-testid={`deck-card-${id}`}
        data-motion="deck-card"
        className="relative group/card"
        layout
        initial={{ opacity: 0, y: 14 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.2 }}
        whileHover={{ y: -3 }}
        transition={{ duration: 0.28 }}
      >
        {confirmDelete && deleteConfirmUI}
        {trashButton}
        <Link href={`/deck/${id}`} className="motion-premium-list-item cue-deck-card-link block group">
          <CueCard
            subject={subjectFamily}
            className="cue-hard-card h-full overflow-hidden p-0 group-hover:-translate-y-0.5 group-hover:[box-shadow:3px_3px_0_var(--color-ink-black)]"
          >
            {cardBody}
          </CueCard>
        </Link>
      </motion.div>
    )
  }

  return (
    <motion.div
      data-testid={`deck-card-${id}`}
      data-motion="deck-card"
      className="relative group/card"
      layout
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.28 }}
    >
      {confirmDelete && deleteConfirmUI}
      {status !== 'failed' && trashButton}
      <CueCard subject={subjectFamily} className="cue-hard-card h-full overflow-hidden p-0">
        {cardBody}
      </CueCard>
    </motion.div>
  )
}
