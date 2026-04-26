'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useState } from 'react'

export function SearchSortBar({
  initialQ,
  initialSort,
}: {
  initialQ: string
  initialSort: string
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

  return (
    <div className="flex gap-3">
      <input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') push({ q, sort: initialSort })
        }}
        onBlur={() => push({ q, sort: initialSort })}
        placeholder="Search decks…"
        className="flex-1 min-w-0 rounded-input border-2 border-ink-black/20 bg-paper-white px-4 py-2 font-body text-sm focus:outline-none focus:ring-2 focus:ring-cue-yellow"
      />
      <select
        value={initialSort}
        onChange={(e) => push({ q, sort: e.target.value })}
        className="rounded-input border-2 border-ink-black/20 bg-paper-white px-3 py-2 font-body text-sm focus:outline-none focus:border-ink-black"
      >
        <option value="created">Newest</option>
        <option value="title">A–Z</option>
        <option value="due">Most due</option>
        <option value="mastery">Least mastered</option>
      </select>
    </div>
  )
}
