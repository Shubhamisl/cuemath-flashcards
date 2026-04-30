import Link from 'next/link'

const PROOF_BLOCKS = [
  {
    label: 'Smart cards',
    body: 'One idea per card, tuned from the source instead of copied as a wall of text.',
    tone: 'bg-soft-cream',
    mark: '01',
  },
  {
    label: 'Spaced review',
    body: 'A daily queue keeps the next right card in front of the learner.',
    tone: 'bg-bubble-pink',
    mark: '02',
  },
  {
    label: 'Built for focus',
    body: 'Short sprints, visible progress, and fewer decisions before study starts.',
    tone: 'bg-trust-blue',
    mark: '03',
  },
]

const STEPS = [
  {
    n: '01',
    title: 'Upload the lesson',
    body: 'Drop in a PDF, class note, or worksheet up to 20MB.',
    tone: 'bg-soft-cream',
  },
  {
    n: '02',
    title: 'Shape the deck',
    body: 'The app splits the material into atomic prompts and answers.',
    tone: 'bg-bubble-pink',
  },
  {
    n: '03',
    title: 'Run the sprint',
    body: 'Students review what is due and build confidence without guesswork.',
    tone: 'bg-mint-green',
  },
]

const PRODUCT_TILES = [
  { label: 'PDF upload', value: 'Chapter 4: Quadratics', tone: 'bg-soft-cream' },
  { label: 'Smart extract', value: '18 cards ready', tone: 'bg-trust-blue' },
  { label: 'Review queue', value: '9 due today', tone: 'bg-bubble-pink' },
  { label: 'Mastery', value: '78% locked in', tone: 'bg-mint-green' },
]

export default function Home() {
  return (
    <main className="cue-grid-surface min-h-screen text-ink-black">
      <header className="cue-nav-shell">
        <div className="mx-auto flex h-[70px] max-w-[1440px] items-center justify-between pl-6 lg:pl-8">
          <Link href="/" className="font-display text-[32px] font-extrabold leading-none">
            CUEMATH
          </Link>

          <nav aria-label="Landing" className="hidden h-full items-center md:flex">
            {['How it works', 'Proof', 'Inside the app'].map((item) => (
              <a
                key={item}
                href={`#${item.toLowerCase().replaceAll(' ', '-')}`}
                className="flex h-full min-w-[160px] items-center justify-center border-l border-ink-black px-6 font-display text-sm font-bold hover:bg-soft-cream"
              >
                {item}
              </a>
            ))}
          </nav>

          <Link
            href="/login"
            className="flex h-full min-w-[180px] items-center justify-center border-l border-ink-black bg-cue-yellow px-6 font-display text-base font-extrabold hover:brightness-95"
          >
            Get started
          </Link>
        </div>
      </header>

      <section aria-label="Proof" id="proof" className="mx-auto max-w-[1280px] px-5 pt-10 sm:px-6 lg:pt-14">
        <div className="grid cue-hard-panel overflow-hidden bg-paper-white md:grid-cols-3">
          {PROOF_BLOCKS.map((block) => (
            <article key={block.label} className={`${block.tone} relative min-h-[150px] border-ink-black p-7 md:border-r md:last:border-r-0`}>
              <div className="absolute right-5 top-4 rounded-[4px] border border-ink-black bg-paper-white px-2 py-1 font-display text-xs font-extrabold">
                {block.mark}
              </div>
              <h2 className="font-display text-2xl font-extrabold uppercase leading-tight">
                {block.label}
              </h2>
              <p className="mt-3 max-w-[360px] text-base font-semibold leading-relaxed text-ink-black/80">
                {block.body}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto grid max-w-[1280px] grid-cols-1 gap-10 px-5 py-12 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:gap-12 lg:py-16">
        <div className="flex flex-col justify-center">
          <div className="mb-6 inline-flex w-fit border border-ink-black bg-paper-white px-3 py-2 font-display text-xs font-extrabold uppercase">
            SharpMind study loop
          </div>
          <h1
            className="max-w-[720px] font-display font-extrabold leading-[0.96]"
            style={{ fontSize: 'clamp(48px, 7vw, 102px)', letterSpacing: '0' }}
          >
            Turn study material into MathFit memory sprints
          </h1>
          <p className="mt-7 max-w-[560px] text-xl font-semibold leading-relaxed text-ink-black/75">
            Convert PDFs, notes, and class material into focused flashcard sessions that keep
            learners moving from first exposure to confident recall.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Link
              href="/login"
              className="cue-primary-block inline-flex min-h-[58px] items-center justify-center bg-cue-yellow px-10 font-display text-lg font-extrabold hover:brightness-95"
            >
              Start a sprint
            </Link>
            <a href="#inside-the-app" className="font-display text-base font-extrabold underline decoration-2 underline-offset-4">
              View the loop
            </a>
          </div>

          <dl className="mt-10 grid max-w-[560px] grid-cols-3 border border-ink-black bg-paper-white">
            {[
              ['20MB', 'PDF limit'],
              ['1 idea', 'per card'],
              ['Daily', 'review queue'],
            ].map(([value, label]) => (
              <div key={label} className="border-r border-ink-black p-4 last:border-r-0">
                <dt className="font-display text-2xl font-extrabold">{value}</dt>
                <dd className="mt-1 text-xs font-bold uppercase text-ink-black/60">{label}</dd>
              </div>
            ))}
          </dl>
        </div>

        <ProductCollage />
      </section>

      <section id="how-it-works" className="mx-auto max-w-[1180px] px-5 pb-16 sm:px-6 lg:pb-24">
        <div className="mb-7 flex items-end justify-between gap-6">
          <h2 className="max-w-[680px] font-display text-4xl font-extrabold leading-tight sm:text-5xl">
            From lesson material to long-term confidence.
          </h2>
          <div className="hidden h-20 w-20 border border-ink-black bg-cue-yellow lg:block" aria-hidden="true" />
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          {STEPS.map((step) => (
            <article key={step.n} className={`cue-hard-card ${step.tone} min-h-[240px] p-7`}>
              <div className="mb-10 font-display text-5xl font-extrabold leading-none text-ink-black/25">
                {step.n}
              </div>
              <h3 className="font-display text-3xl font-extrabold leading-tight">{step.title}</h3>
              <p className="mt-4 text-lg font-semibold leading-relaxed text-ink-black/75">{step.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="inside-the-app" className="border-y border-ink-black bg-ink-black text-paper-white">
        <div className="mx-auto grid max-w-[1280px] gap-0 px-5 py-16 sm:px-6 lg:grid-cols-[1fr_420px] lg:py-20">
          <div className="max-w-[760px]">
            <p className="font-display text-sm font-extrabold uppercase text-cue-yellow">Inside the app</p>
            <h2 className="mt-4 font-display text-5xl font-extrabold leading-tight sm:text-6xl">
              Keep the learning loop clear.
            </h2>
            <p className="mt-6 max-w-[620px] text-lg font-semibold leading-relaxed text-paper-white/75">
              Students see what is due, answer in short bursts, and leave each session with a
              clearer sense of what they know and what needs another pass.
            </p>
          </div>
          <Link
            href="/login"
            className="mt-10 flex min-h-[160px] items-center justify-center border border-cue-yellow bg-cue-yellow px-8 text-center font-display text-3xl font-extrabold text-ink-black hover:brightness-95 lg:mt-0"
          >
            Get Started
          </Link>
        </div>
      </section>

      <footer className="px-6 py-8 text-center font-display text-xs font-bold uppercase text-ink-black/60">
        Cuemath Flashcards / Built for the SharpMind generation
      </footer>
    </main>
  )
}

function ProductCollage() {
  return (
    <div
      data-testid="landing-product-collage"
      className="cue-hard-panel bg-paper-white p-3 sm:p-4 lg:min-h-[620px]"
    >
      <div className="grid h-full gap-3 md:grid-cols-2">
        <div className="cue-hard-card bg-cue-yellow p-6 md:col-span-2">
          <div className="flex items-start justify-between gap-6">
            <div>
              <p className="font-display text-xs font-extrabold uppercase">Today sprint</p>
              <h2 className="mt-3 max-w-[420px] font-display text-4xl font-extrabold leading-tight sm:text-5xl">
                Fractions, ratios, and the next right question.
              </h2>
            </div>
            <div className="hidden border border-ink-black bg-paper-white p-3 font-display text-sm font-extrabold md:block">
              09 due
            </div>
          </div>
        </div>

        {PRODUCT_TILES.map((tile) => (
          <article key={tile.label} className={`cue-hard-card ${tile.tone} min-h-[150px] p-5`}>
            <p className="font-display text-xs font-extrabold uppercase text-ink-black/60">{tile.label}</p>
            <h3 className="mt-4 font-display text-2xl font-extrabold leading-tight">{tile.value}</h3>
          </article>
        ))}

        <div className="cue-hard-card bg-ink-black p-5 text-paper-white md:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-5">
            <div>
              <p className="font-display text-xs font-extrabold uppercase text-cue-yellow">Progress cells</p>
              <p className="mt-2 font-display text-2xl font-extrabold">Confidence builds one answer at a time.</p>
            </div>
            <div aria-hidden="true" className="flex gap-1">
              {['complete', 'complete', 'complete', 'current', 'empty', 'empty', 'empty'].map((state, index) => (
                <span
                  key={`${state}-${index}`}
                  className={`cue-progress-cell ${
                    state === 'complete' ? 'cue-progress-complete' : state === 'current' ? 'cue-progress-current' : ''
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
