'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useState } from 'react'
import type { subjectFamily } from '@/lib/brand/tokens'
import type {
  LibraryMasteryFilter,
  LibrarySort,
  LibraryStatusFilter,
} from '@/lib/library/library-view'

export function SearchSortBar({
  initialQ,
  initialSort,
  initialSubject,
  initialStatus,
  initialMastery,
}: {
  initialQ: string
  initialSort: LibrarySort
  initialSubject: 'all' | subjectFamily
  initialStatus: LibraryStatusFilter
  initialMastery: LibraryMasteryFilter
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [q, setQ] = useState(initialQ)

  const push = useCallback(
    (overrides: Record<string, string>) => {
      const sp = new URLSearchParams(searchParams.toString())
      for (const [k, v] of Object.entries(overrides)) {
        if (v) sp.set(k, v)
        else sp.delete(k)
      }
      router.push(`/library?${sp.toString()}`)
    },
    [router, searchParams],
  )

  const baseFilters = {
    sort: initialSort,
    subject: initialSubject,
    status: initialStatus,
    mastery: initialMastery,
  }

  return (
    <section className="space-y-3">
      <p className="text-xs font-display font-semibold uppercase tracking-[0.08em] text-ink-black/55">
        Your decks
      </p>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1.15fr)_repeat(4,minmax(0,180px))]">
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') push({ q, ...baseFilters })
          }}
          onBlur={() => push({ q, ...baseFilters })}
          placeholder="Search decks, tags, or subjects..."
          className="flex-1 min-w-0 rounded-input border-2 border-ink-black/20 bg-paper-white px-4 py-2 font-body text-sm focus:outline-none focus:ring-2 focus:ring-cue-yellow"
        />
        <select
          value={initialSort}
          onChange={(e) => push({ q, ...baseFilters, sort: e.target.value })}
          className="rounded-input border-2 border-ink-black/20 bg-paper-white px-3 py-2 font-body text-sm focus:outline-none focus:border-ink-black"
        >
          <option value="created">Newest</option>
          <option value="title">A-Z</option>
          <option value="due">Most due</option>
          <option value="mastery">Least mastered</option>
        </select>
        <select
          value={initialSubject}
          onChange={(e) => push({ q, ...baseFilters, subject: e.target.value })}
          className="rounded-input border-2 border-ink-black/20 bg-paper-white px-3 py-2 font-body text-sm focus:outline-none focus:border-ink-black"
        >
          <option value="all">All subjects</option>
          <option value="math">Math</option>
          <option value="language">Language</option>
          <option value="science">Science</option>
          <option value="humanities">Humanities</option>
          <option value="other">Other</option>
        </select>
        <select
          value={initialStatus}
          onChange={(e) => push({ q, ...baseFilters, status: e.target.value })}
          className="rounded-input border-2 border-ink-black/20 bg-paper-white px-3 py-2 font-body text-sm focus:outline-none focus:border-ink-black"
        >
          <option value="active">Active decks</option>
          <option value="ready">Ready</option>
          <option value="draft">Draft</option>
          <option value="ingesting">Processing</option>
          <option value="failed">Failed</option>
          <option value="archived">Archived</option>
        </select>
        <select
          value={initialMastery}
          onChange={(e) => push({ q, ...baseFilters, mastery: e.target.value })}
          className="rounded-input border-2 border-ink-black/20 bg-paper-white px-3 py-2 font-body text-sm focus:outline-none focus:border-ink-black"
        >
          <option value="all">All mastery</option>
          <option value="Curious">Curious</option>
          <option value="Practicing">Practicing</option>
          <option value="Confident">Confident</option>
          <option value="SharpMind">SharpMind</option>
        </select>
      </div>
    </section>
  )
}
