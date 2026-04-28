import Link from 'next/link'
import { CueButton } from '@/lib/brand/primitives/button'
import { CueCard } from '@/lib/brand/primitives/card'
import { CuePill } from '@/lib/brand/primitives/pill'

const STATS = [
  { value: '700M+', label: 'reviews backing the science' },
  { value: '~20s', label: 'from upload to first card' },
  { value: 'FSRS v5', label: 'the spacing engine, not a guess' },
]

const STEPS = [
  {
    n: '01',
    title: 'Drop a PDF',
    body: 'Notes, a chapter, a textbook — anything up to 20MB.',
    subject: 'math' as const,
  },
  {
    n: '02',
    title: 'Get atomic cards',
    body: 'One idea per card, written the way a great teacher would.',
    subject: 'language' as const,
  },
  {
    n: '03',
    title: 'Run short sprints',
    body: 'Spaced repetition keeps your edge without burning you out.',
    subject: 'science' as const,
  },
]

const OUTCOMES = [
  'Cards that match how you actually take notes',
  'A schedule that respects your real life',
  'Progress you can see, not just feel',
]

export default function Home() {
  return (
    <main className="flex-1 flex flex-col">
      {/* ============ HERO ============ */}
      <section className="px-6 pt-14 pb-20 lg:pt-24 lg:pb-28 max-w-[1200px] mx-auto w-full">
        <div className="grid grid-cols-1 lg:grid-cols-[1.15fr_1fr] gap-12 lg:gap-16 items-center">
          {/* LEFT */}
          <div className="space-y-7">
            <CuePill tone="highlight">SharpMind journey</CuePill>
            <h1
              className="font-display font-extrabold text-ink-black"
              style={{
                fontSize: 'clamp(56px, 11vw, 128px)',
                lineHeight: 0.92,
                letterSpacing: '-0.03em',
              }}
            >
              PDF in.
              <br />
              Memory forever.
            </h1>
            <p className="text-lg lg:text-xl text-ink-black/75 max-w-[480px] leading-relaxed">
              Cuemath Flashcards turns any document into cognitively-tuned practice — the
              same science behind 700M+ reviews a year.
            </p>
            <div className="flex flex-wrap items-center gap-5 pt-2">
              <Link href="/login" className="inline-block">
                <CueButton size="lg" className="px-10 text-lg">
                  Start my journey
                </CueButton>
              </Link>
              <Link
                href="#how"
                className="font-display font-semibold text-ink-black/60 hover:text-ink-black"
              >
                See how it works ↓
              </Link>
            </div>
          </div>

          {/* RIGHT — deck preview stack */}
          <div className="lg:pl-8">
            <DeckPreview />
          </div>
        </div>
      </section>

      {/* ============ PROOF STRIP ============ */}
      <section className="bg-soft-cream py-12 lg:py-14 border-y-2 border-ink-black/5">
        <div className="max-w-[1100px] mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12 text-center">
          {STATS.map((s) => (
            <div key={s.label}>
              <div
                className="font-display font-extrabold tracking-tight text-ink-black"
                style={{ fontSize: 'clamp(40px, 6vw, 64px)', lineHeight: 1 }}
              >
                {s.value}
              </div>
              <div className="text-sm text-ink-black/70 mt-2 max-w-[220px] mx-auto">
                {s.label}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ============ HOW IT WORKS ============ */}
      <section id="how" className="px-6 py-20 lg:py-28 max-w-[1100px] mx-auto w-full">
        <div className="text-center space-y-3 mb-12 lg:mb-16">
          <div className="text-xs uppercase tracking-[0.14em] font-display font-bold text-ink-black/50">
            How it works
          </div>
          <h2
            className="font-display font-extrabold tracking-tight"
            style={{ fontSize: 'clamp(36px, 5vw, 56px)', lineHeight: 1.05 }}
          >
            Three steps,{' '}
            <span className="bg-cue-yellow px-2 inline-block">zero friction</span>.
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {STEPS.map((s) => (
            <CueCard
              key={s.n}
              subject={s.subject}
              className="space-y-3 shadow-card-rest p-7 min-h-[200px]"
            >
              <div className="font-display font-extrabold text-3xl text-ink-black/35">
                {s.n}
              </div>
              <h3 className="font-display text-2xl font-extrabold leading-tight">
                {s.title}
              </h3>
              <p className="text-ink-black/75 leading-relaxed">{s.body}</p>
            </CueCard>
          ))}
        </div>
      </section>

      {/* ============ OUTCOMES ============ */}
      <section className="px-6 pb-20 lg:pb-24 max-w-[900px] mx-auto w-full">
        <div className="space-y-8">
          <h2
            className="font-display font-extrabold text-center tracking-tight"
            style={{ fontSize: 'clamp(28px, 4vw, 40px)', lineHeight: 1.1 }}
          >
            What you get
          </h2>
          <ul className="space-y-4 max-w-[640px] mx-auto">
            {OUTCOMES.map((o, i) => (
              <li key={i} className="flex items-start gap-4 text-lg text-ink-black/85">
                <span
                  aria-hidden="true"
                  className="font-display font-extrabold text-cue-yellow text-3xl leading-none mt-0.5"
                >
                  →
                </span>
                <span>{o}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ============ CLOSING CTA — full-bleed yellow ============ */}
      <section className="bg-cue-yellow">
        <div className="max-w-[900px] mx-auto px-6 py-20 lg:py-28 text-center space-y-7">
          <h2
            className="font-display font-extrabold tracking-tight text-ink-black"
            style={{ fontSize: 'clamp(40px, 6vw, 72px)', lineHeight: 1 }}
          >
            Ready to remember more?
          </h2>
          <p className="text-lg text-ink-black/80 max-w-[520px] mx-auto">
            One PDF. Five minutes. A study habit that actually sticks.
          </p>
          <Link href="/login" className="inline-block">
            <button
              type="button"
              className="inline-flex items-center justify-center min-h-[56px] px-10 rounded-input bg-ink-black text-cue-yellow font-display font-bold text-lg transition-transform duration-tap active:scale-[0.98] hover:bg-ink-black/90"
            >
              Start my journey
            </button>
          </Link>
        </div>
      </section>

      {/* ============ FOOTER ============ */}
      <footer className="px-6 py-8 text-center text-xs text-ink-black/50 font-body">
        Cuemath · Built for the SharpMind generation
      </footer>
    </main>
  )
}

/* ──────────────────────────────────────────────────────────
   DeckPreview — static stacked cards illustrating the loop
   PDF → deck card → review card. Uses real brand tokens and
   the same MasteryRing component the in-app library uses.
   No JS, no animation — pure CSS transforms.
   ──────────────────────────────────────────────────────────*/
function DeckPreview() {
  return (
    <div
      className="relative h-[380px] sm:h-[440px] lg:h-[480px] mx-auto max-w-[420px] lg:max-w-none"
      aria-hidden="true"
    >
      {/* BACK card — peeking, blue tint */}
      <div
        className="absolute top-2 right-2 sm:top-4 sm:right-6 w-[240px] sm:w-[260px] rounded-card p-5 shadow-card-rest bg-trust-blue opacity-80"
        style={{ transform: 'rotate(-7deg)' }}
      >
        <div className="text-[10px] uppercase tracking-[0.12em] text-ink-black/55 font-display font-bold mb-2">
          Algebra II · Ch. 4
        </div>
        <div className="font-display font-extrabold text-base leading-tight text-ink-black">
          What does FSRS do that SM-2 cannot?
        </div>
      </div>

      {/* MIDDLE card — pink tint */}
      <div
        className="absolute top-12 left-0 sm:top-16 sm:left-2 w-[260px] sm:w-[280px] rounded-card p-5 shadow-card-flip bg-bubble-pink"
        style={{ transform: 'rotate(4deg)' }}
      >
        <div className="text-[10px] uppercase tracking-[0.12em] text-ink-black/55 font-display font-bold mb-2">
          Spanish · verbos
        </div>
        <div className="font-display font-extrabold text-lg leading-tight text-ink-black">
          Conjugate <span className="italic">tener</span> in the preterite, 1st person
          plural.
        </div>
        <div className="mt-4 text-xs text-ink-black/55 font-body">tap to flip →</div>
      </div>

      {/* FRONT card — math/cream tint with mastery ring (mirrors DeckCard) */}
      <div className="absolute bottom-0 right-0 w-[280px] sm:w-[300px] rounded-card p-5 shadow-card-flip bg-soft-cream">
        <div className="flex items-start justify-between mb-3">
          <LandingMasteryRing pct={78} />
          <span className="px-3 py-1 rounded-full text-xs font-display font-bold bg-mint-green text-ink-black">
            Confident
          </span>
        </div>
        <div className="font-display font-extrabold text-xl leading-tight text-ink-black">
          Calculus · Limits
        </div>
        <div className="text-sm text-ink-black/60 mt-1 font-body">
          42 cards · 9 due today
        </div>
        <div className="mt-4 text-[11px] uppercase tracking-[0.08em] text-ink-black/60 font-display font-semibold">
          78% mastered
        </div>
      </div>
    </div>
  )
}

/* Inline mastery ring for the landing preview only.
   Uses hex colors directly because the global var(--cue-yellow)
   token isn't exported by Tailwind v4 @theme on this codebase. */
function LandingMasteryRing({ pct, size = 52, stroke = 5 }: { pct: number; size?: number; stroke?: number }) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const offset = c * (1 - Math.max(0, Math.min(100, pct)) / 100)
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#F2E2B0" strokeWidth={stroke} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="#FFBA07"
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={offset}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
    </svg>
  )
}
