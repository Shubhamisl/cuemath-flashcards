import Link from 'next/link'

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="cue-grid-surface min-h-screen flex flex-col text-ink-black">
      <header className="border-b-2 border-ink-black bg-cue-yellow">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <Link
            href="/"
            className="font-display inline-flex items-center gap-3 text-lg font-extrabold tracking-tight text-ink-black"
          >
            <span
              className="inline-flex h-8 w-8 items-center justify-center rounded-card border-2 border-ink-black bg-paper-white text-sm shadow-[2px_2px_0_#000]"
              aria-hidden="true"
            >
              C
            </span>
            Cuemath Flashcards
          </Link>
          <div className="font-display inline-flex w-fit items-center rounded-card border-2 border-ink-black bg-paper-white px-3 py-1 text-xs font-extrabold uppercase tracking-[0.06em] shadow-[2px_2px_0_#000]">
            Build your study loop
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 sm:px-6 md:py-10">
        {children}
      </main>
    </div>
  )
}
