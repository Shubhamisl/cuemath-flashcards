import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/db/server'
import { CueCard } from '@/lib/brand/primitives/card'
import { CuePill } from '@/lib/brand/primitives/pill'
import { CueButton } from '@/lib/brand/primitives/button'
import { MasteryRing } from '@/components/mastery-ring'
import { TopNav } from '../_components/top-nav'
import { computeProgressDashboard } from '@/lib/progress/dashboard'
import { tierToTone } from '@/lib/progress/tier-tone'

function StatTile({ value, label }: { value: string | number; label: string }) {
  return (
    <CueCard tone="cream" className="shadow-card-rest px-5 py-4 space-y-1">
      <div className="font-display font-extrabold text-2xl text-ink-black">{value}</div>
      <div className="text-xs uppercase tracking-[0.08em] text-ink-black/60">{label}</div>
    </CueCard>
  )
}

export default async function ProgressPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name, onboarded_at')
    .eq('user_id', user.id)
    .single()

  if (!profile?.onboarded_at) redirect('/onboarding/subject')

  const now = new Date()
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 86400000)

  const [{ data: sessions }, { data: cards }, { data: decks }] = await Promise.all([
    supabase
      .from('sessions')
      .select('id, started_at, cards_reviewed, mean_accuracy, mean_response_ms, mode')
      .eq('user_id', user.id)
      .gte('started_at', ninetyDaysAgo.toISOString()),
    supabase
      .from('cards')
      .select('deck_id, concept_tag, fsrs_state, suspended, approved')
      .eq('user_id', user.id),
    supabase
      .from('decks')
      .select('id, title, status, subject_family, card_count')
      .eq('user_id', user.id),
  ])

  const dashboard = computeProgressDashboard({
    cards: (cards ?? []) as Array<{
      deck_id: string
      concept_tag: string | null
      fsrs_state: { due?: string; stability?: number; lapses?: number } | null
      suspended: boolean
      approved: boolean
    }>,
    decks: (decks ?? []) as Array<{
      id: string
      title: string
      status: string
      subject_family: string
      card_count: number
    }>,
    sessions: (sessions ?? []) as Array<{
      id: string
      started_at: string
      cards_reviewed: number | null
      mean_accuracy: number | null
      mean_response_ms: number | null
      mode: string | null
    }>,
    now,
  })

  const name = (profile.display_name ?? 'there').split(' ')[0] ?? 'there'
  const maxActivity = Math.max(...dashboard.activity.map((day) => day.cardsReviewed), 1)

  return (
    <main className="min-h-screen">
      <TopNav name={name} streak={dashboard.summary.streak} />

      <div className="max-w-[1100px] mx-auto px-6 py-10 space-y-10">
        <header className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.08em] text-ink-black/60 font-display font-semibold">
              Progress
            </p>
            <h1 className="font-display font-extrabold text-4xl md:text-5xl tracking-tight text-ink-black">
              Keep the curve moving.
            </h1>
            <p className="max-w-[640px] text-sm md:text-base text-ink-black/70">
              A clean view of mastery, retention, recent sessions, and the concepts that still need another pass.
            </p>
          </div>

          <div className="flex items-center gap-4">
            <MasteryRing pct={dashboard.summary.masteryPct} size={96} stroke={8} />
            <div className="space-y-1">
              <div className="text-sm text-ink-black/60">Overall mastery</div>
              <div className="font-display font-extrabold text-4xl text-ink-black">
                {dashboard.summary.masteryPct}%
              </div>
            </div>
          </div>
        </header>

        <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatTile value={dashboard.summary.dueNowCount} label="Due now" />
          <StatTile
            value={dashboard.summary.retentionPct === null ? '-' : `${dashboard.summary.retentionPct}%`}
            label="Retention"
          />
          <StatTile value={dashboard.summary.cardsReviewed7d} label="Cards this week" />
          <StatTile value={dashboard.summary.sessions7d} label="Sessions this week" />
        </section>

        <section className="grid grid-cols-1 xl:grid-cols-[1.2fr_0.8fr] gap-6 items-start">
          <CueCard tone="paper" className="shadow-card-rest space-y-5">
            <div className="space-y-1">
              <p className="text-xs uppercase tracking-[0.08em] text-ink-black/60 font-display font-semibold">
                Last 7 days
              </p>
              <h2 className="font-display font-bold text-2xl text-ink-black">Study rhythm</h2>
            </div>

            <div className="grid grid-cols-7 gap-3 items-end min-h-[180px]">
              {dashboard.activity.map((day) => {
                const height = Math.max(18, Math.round((day.cardsReviewed / maxActivity) * 140))
                return (
                  <div key={day.isoDate} className="flex flex-col items-center gap-3">
                    <div className="text-xs text-ink-black/60">{day.cardsReviewed}</div>
                    <div
                      className="w-full rounded-t-[10px] bg-cue-yellow/80"
                      style={{ height }}
                      aria-label={`${day.label}: ${day.cardsReviewed} cards reviewed`}
                    />
                    <div className="text-xs font-display font-semibold text-ink-black/60">
                      {day.label}
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm text-ink-black/70">
              <div>
                <span className="font-display font-bold text-ink-black">{dashboard.summary.activeCards}</span> active cards
              </div>
              <div>
                <span className="font-display font-bold text-ink-black">{dashboard.summary.totalCards}</span> total cards
              </div>
              <div>
                <span className="font-display font-bold text-ink-black">{dashboard.summary.streak}</span> day streak
              </div>
              <div>
                <span className="font-display font-bold text-ink-black">
                  {dashboard.summary.avgResponseMs === null
                    ? '-'
                    : `${Math.round(dashboard.summary.avgResponseMs / 100) / 10}s`}
                </span>{' '}
                average response
              </div>
            </div>
          </CueCard>

          <CueCard tone="blue" className="shadow-card-rest space-y-4">
            <div className="space-y-1">
              <p className="text-xs uppercase tracking-[0.08em] text-ink-black/60 font-display font-semibold">
                Focus areas
              </p>
              <h2 className="font-display font-bold text-2xl text-ink-black">Weak concepts</h2>
            </div>

            {dashboard.weakConcepts.length === 0 ? (
              <p className="text-sm text-ink-black/70">
                No weak concepts are standing out yet. Keep reviewing and this page will start to sharpen.
              </p>
            ) : (
              <div className="space-y-3">
                {dashboard.weakConcepts.map((concept) => (
                  <div
                    key={concept.tag}
                    className="flex items-center justify-between gap-3 rounded-card bg-paper-white/70 px-4 py-3"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="font-display font-semibold text-ink-black">{concept.tag}</div>
                      <div className="text-xs text-ink-black/60">
                        {concept.lapses} lapse{concept.lapses === 1 ? '' : 's'}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <CuePill tone={concept.dueNowCount > 0 ? 'highlight' : 'neutral'}>
                        {concept.dueNowCount > 0
                          ? `${concept.dueNowCount} due now`
                          : 'Not due yet'}
                      </CuePill>
                      {concept.dueNowCount > 0 && (
                        <Link
                          href={
                            concept.dueNowCount <= 5
                              ? `/review?concept=${encodeURIComponent(concept.tag)}&mode=quick`
                              : `/review?concept=${encodeURIComponent(concept.tag)}`
                          }
                        >
                          <CueButton variant="ghost" className="min-h-[40px] px-4">
                            Drill now
                          </CueButton>
                        </Link>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CueCard>
        </section>

        <section className="grid grid-cols-1 xl:grid-cols-[0.95fr_1.05fr] gap-6 items-start">
          <CueCard tone="paper" className="shadow-card-rest space-y-4">
            <div className="space-y-1">
              <p className="text-xs uppercase tracking-[0.08em] text-ink-black/60 font-display font-semibold">
                Recent sessions
              </p>
              <h2 className="font-display font-bold text-2xl text-ink-black">Session history</h2>
            </div>

            {dashboard.recentSessions.length === 0 ? (
              <p className="text-sm text-ink-black/70">
                No sessions yet. Once you finish a sprint, the trail shows up here.
              </p>
            ) : (
              <div className="space-y-3">
                {dashboard.recentSessions.map((session) => (
                  <div
                    key={session.id}
                    className="grid grid-cols-[auto_1fr_auto] gap-4 items-center rounded-card bg-soft-cream/60 px-4 py-3"
                  >
                    <CuePill tone={session.modeLabel === 'Quick 5' ? 'highlight' : 'neutral'}>
                      {session.modeLabel}
                    </CuePill>
                    <div className="min-w-0">
                      <div className="font-display font-semibold text-ink-black">
                        {new Date(session.startedAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </div>
                      <div className="text-xs text-ink-black/60">
                        {session.cardsReviewed} cards reviewed
                        {session.meanResponseMs !== null
                          ? ` - ${Math.round(session.meanResponseMs / 100) / 10}s avg`
                          : ''}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-display font-bold text-ink-black">
                        {session.accuracyPct === null ? '-' : `${session.accuracyPct}%`}
                      </div>
                      <div className="text-xs text-ink-black/60">accuracy</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CueCard>

          <CueCard tone="paper" className="shadow-card-rest space-y-4">
            <div className="space-y-1">
              <p className="text-xs uppercase tracking-[0.08em] text-ink-black/60 font-display font-semibold">
                Decks
              </p>
              <h2 className="font-display font-bold text-2xl text-ink-black">Where to spend time</h2>
            </div>

            {dashboard.deckSnapshots.length === 0 ? (
              <p className="text-sm text-ink-black/70">
                Ready decks will show up here once they have approved cards.
              </p>
            ) : (
              <div className="space-y-3">
                {dashboard.deckSnapshots.map((deck) => (
                  <Link
                    key={deck.id}
                    href={`/deck/${deck.id}`}
                    className="block rounded-card bg-paper-white hover:bg-soft-cream/70 transition-colors px-4 py-4"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-2 min-w-0">
                        <div className="font-display font-semibold text-ink-black truncate">
                          {deck.title}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <CuePill tone={tierToTone(deck.tier)}>{deck.tier}</CuePill>
                          <CuePill tone={deck.dueCount > 0 ? 'highlight' : 'neutral'}>
                            {deck.dueCount} due
                          </CuePill>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="font-display font-bold text-ink-black">{deck.masteryPct}%</div>
                        <div className="text-xs text-ink-black/60">mastery</div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CueCard>
        </section>
      </div>
    </main>
  )
}
