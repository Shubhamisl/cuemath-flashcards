import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/db/server'
import { CueCard } from '@/lib/brand/primitives/card'
import { CueButton } from '@/lib/brand/primitives/button'
import { CuePill } from '@/lib/brand/primitives/pill'
import { MasteryRing } from '@/components/mastery-ring'
import { computeDeckStats, type StatCard } from '@/lib/progress/deck-stats'
import { tierToTone } from '@/lib/progress/tier-tone'

function StatTile({ value, label }: { value: string | number; label: string }) {
  return (
    <CueCard tone="cream" className="shadow-card-rest px-5 py-4 space-y-1">
      <div className="font-display font-extrabold text-2xl text-ink-black">{value}</div>
      <div className="text-xs uppercase tracking-[0.08em] text-ink-black/60">{label}</div>
    </CueCard>
  )
}

export default async function DeckPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('onboarded_at')
    .eq('user_id', user.id)
    .single()
  if (!profile?.onboarded_at) redirect('/onboarding/subject')

  const { data: deck } = await supabase
    .from('decks')
    .select('id, title, subject_family, card_count, status')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()
  if (!deck) notFound()

  const { data: cards } = await supabase
    .from('cards')
    .select('fsrs_state, suspended')
    .eq('deck_id', id)
    .eq('user_id', user.id)

  const stats = computeDeckStats((cards ?? []) as StatCard[], new Date())

  return (
    <main className="min-h-screen">
      <div className="max-w-[1100px] mx-auto px-6 py-8">
        <Link
          href="/library"
          className="inline-block text-sm font-body text-ink-black/60 hover:text-ink-black"
        >
          ← Library
        </Link>
      </div>

      <div className="max-w-[1100px] mx-auto px-6 pb-16 grid grid-cols-1 lg:grid-cols-[auto_1fr] gap-12 items-start">
        <div className="flex flex-col items-center lg:items-start gap-4">
          <div className="relative">
            <MasteryRing pct={stats.masteryPct} size={256} stroke={12} showLabel={false} />
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className="font-display font-extrabold text-5xl text-ink-black">
                {stats.masteryPct}%
              </div>
              <div className="text-xs uppercase tracking-[0.08em] text-ink-black/60 mt-1">
                Mastered
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-8">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <CuePill tone={tierToTone(stats.tier)}>{stats.tier}</CuePill>
            </div>
            <h1 className="font-display font-extrabold text-4xl md:text-5xl tracking-tight leading-tight">
              {deck.title}
            </h1>
          </div>

          <div className="grid grid-cols-3 gap-4 max-w-[600px]">
            <StatTile value={deck.card_count ?? 0} label="Total" />
            <StatTile value={stats.dueCount} label="Due" />
            <StatTile value={`${stats.masteryPct}%`} label="Mastery" />
          </div>

          <div className="space-y-3">
            <Link href={`/review?deck=${deck.id}`} className="inline-block w-full max-w-[480px]">
              <CueButton size="lg" className="w-full" disabled={stats.dueCount === 0}>
                {stats.dueCount > 0 ? 'Start sprint' : 'All caught up'}
              </CueButton>
            </Link>
            <p className="text-sm text-ink-black/70 max-w-[480px]">
              {stats.dueCount > 0
                ? `Up to 20 cards ready — keep your edge.`
                : `Nothing due right now. Check back later.`}
            </p>
          </div>
        </div>
      </div>
    </main>
  )
}
