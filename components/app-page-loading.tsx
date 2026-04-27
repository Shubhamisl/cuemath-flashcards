type AppPageLoadingProps = {
  title: string
}

function LoadingBar({ width }: { width: string }) {
  return (
    <div
      className="h-4 rounded-full bg-ink-black/10 animate-pulse"
      style={{ width }}
      aria-hidden="true"
    />
  )
}

export function AppPageLoading({ title }: AppPageLoadingProps) {
  return (
    <main className="min-h-screen">
      <div className="border-b border-ink-black/10">
        <div className="max-w-[1100px] mx-auto px-6 py-5 flex items-center justify-between gap-4">
          <LoadingBar width="140px" />
          <div className="flex items-center gap-3">
            <div className="h-10 w-16 rounded-full bg-ink-black/8 animate-pulse" aria-hidden="true" />
            <div className="h-10 w-10 rounded-full bg-ink-black/8 animate-pulse" aria-hidden="true" />
          </div>
        </div>
      </div>

      <div className="max-w-[1100px] mx-auto px-6 py-10 space-y-8">
        <header className="space-y-3" aria-live="polite">
          <h1 className="font-display font-extrabold text-4xl md:text-5xl tracking-tight text-ink-black">
            {title}
          </h1>
          <p className="font-body text-sm text-ink-black/70">Just getting things ready...</p>
        </header>

        <section className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex-1 space-y-3">
            <LoadingBar width="220px" />
            <LoadingBar width="360px" />
          </div>
          <div className="flex gap-3">
            <div className="h-12 w-36 rounded-input bg-cue-yellow/40 animate-pulse" aria-hidden="true" />
            <div className="h-12 w-28 rounded-input bg-ink-black/8 animate-pulse" aria-hidden="true" />
          </div>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, index) => (
            <div
              key={index}
              className="rounded-card border border-ink-black/10 bg-paper-white p-6 space-y-5 shadow-card-rest"
              aria-hidden="true"
            >
              <div className="flex items-start justify-between gap-3">
                <LoadingBar width="120px" />
                <div className="h-7 w-20 rounded-full bg-ink-black/8 animate-pulse" />
              </div>
              <LoadingBar width="72px" />
              <div className="pt-10">
                <LoadingBar width="110px" />
              </div>
            </div>
          ))}
        </section>
      </div>
    </main>
  )
}
