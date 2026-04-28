import Link from 'next/link'

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-paper-white flex flex-col">
      <header className="px-6 pt-6 pb-2 max-w-2xl mx-auto w-full">
        <Link
          href="/"
          className="font-display font-extrabold text-base tracking-tight text-ink-black inline-flex items-center gap-2"
        >
          <span className="inline-block w-2 h-2 rounded-full bg-cue-yellow" aria-hidden="true" />
          Cuemath
        </Link>
      </header>
      <main className="flex-1 max-w-2xl mx-auto w-full px-6 py-8 md:py-12">
        {children}
      </main>
    </div>
  )
}
