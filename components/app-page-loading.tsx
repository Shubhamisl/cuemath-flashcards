type AppPageLoadingProps = {
  title: string
  showNavigationSkeleton?: boolean
}

function LoadingBar({ width, className = 'h-4' }: { width: string; className?: string }) {
  return (
    <div
      className={`${className} motion-premium-sheen rounded-full bg-ink-black/10 animate-pulse`}
      style={{ width }}
      aria-hidden="true"
    />
  )
}

export function AppPageLoading({ title, showNavigationSkeleton = true }: AppPageLoadingProps) {
  return (
    <main className="min-h-screen">
      {showNavigationSkeleton && (
        <div className="border-b border-ink-black/10">
          <div className="mx-auto max-w-[1200px] px-4 py-4 sm:px-6 sm:py-5">
            <div
              role="presentation"
              aria-label="Navigation loading"
              className="motion-premium-reveal rounded-[22px] border border-ink-black/10 bg-soft-cream/60 px-3 py-3 backdrop-blur-sm sm:rounded-[28px] sm:px-4"
            >
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:gap-4">
                  <LoadingBar width="108px" className="h-6" />
                  <div className="grid w-full grid-cols-3 gap-1 rounded-[18px] border border-ink-black/10 bg-paper-white/85 p-1 sm:inline-flex sm:w-auto sm:items-center sm:gap-2 sm:rounded-full">
                    <LoadingBar width="100%" className="h-9" />
                    <LoadingBar width="100%" className="h-9" />
                    <LoadingBar width="100%" className="h-9" />
                  </div>
                </div>
                <div className="flex w-full items-center justify-between gap-3 lg:w-auto lg:justify-end">
                  <div className="h-8 w-20 rounded-full bg-paper-white/90 animate-pulse" aria-hidden="true" />
                  <div className="h-9 w-9 rounded-full bg-paper-white animate-pulse" aria-hidden="true" />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="mx-auto max-w-[1100px] space-y-8 px-4 py-8 sm:px-6 sm:py-10 sm:space-y-10">
        <header className="space-y-3" aria-live="polite">
          <h1 className="font-display font-extrabold text-4xl md:text-5xl tracking-tight text-ink-black">
            {title}
          </h1>
          <p className="font-body text-sm text-ink-black/70">Just getting things ready...</p>
        </header>

        <section
          role="presentation"
          aria-label="Hero loading"
          className="motion-premium-reveal grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.9fr)]"
        >
          <div className="space-y-5 rounded-[22px] border border-ink-black/10 bg-paper-white px-4 py-5 shadow-card-rest sm:rounded-[28px] sm:px-6 sm:py-6">
            <LoadingBar width="88px" className="h-3" />
            <LoadingBar width="214px" className="h-10" />
            <div className="flex items-center gap-3">
              <div className="h-2.5 w-44 rounded-full bg-ink-black/10 animate-pulse" aria-hidden="true" />
              <LoadingBar width="96px" className="h-4" />
            </div>
          </div>
          <div className="space-y-5 rounded-[22px] border border-ink-black/10 bg-mint-green/55 px-4 py-5 shadow-card-rest sm:rounded-[28px] sm:px-6 sm:py-6">
            <div className="space-y-2">
              <LoadingBar width="82px" className="h-3" />
              <LoadingBar width="238px" className="h-4" />
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <div className="h-12 w-36 rounded-input bg-cue-yellow/40 animate-pulse" aria-hidden="true" />
              <div className="h-12 w-28 rounded-input bg-paper-white/80 animate-pulse" aria-hidden="true" />
              <div className="h-12 w-32 rounded-input bg-paper-white/90 animate-pulse" aria-hidden="true" />
            </div>
          </div>
        </section>

        <section
          role="presentation"
          aria-label="Controls loading"
          className="motion-premium-reveal rounded-[24px] border border-ink-black/10 bg-paper-white px-4 py-4 shadow-card-rest"
        >
          <div className="space-y-4">
            <div className="space-y-2 pb-1">
              <LoadingBar width="82px" className="h-3" />
              <LoadingBar width="232px" className="h-4" />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.15fr)_repeat(4,minmax(0,180px))]">
              <div className="h-11 rounded-input border-2 border-ink-black/10 bg-paper-white animate-pulse" aria-hidden="true" />
              <div className="h-11 rounded-input border-2 border-ink-black/10 bg-paper-white animate-pulse" aria-hidden="true" />
              <div className="h-11 rounded-input border-2 border-ink-black/10 bg-paper-white animate-pulse" aria-hidden="true" />
              <div className="h-11 rounded-input border-2 border-ink-black/10 bg-paper-white animate-pulse" aria-hidden="true" />
              <div className="h-11 rounded-input border-2 border-ink-black/10 bg-paper-white animate-pulse" aria-hidden="true" />
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div
              key={index}
              role="presentation"
              aria-label="Deck loading"
              className="motion-premium-list-item space-y-5 rounded-card border border-ink-black/10 bg-paper-white p-6 shadow-card-rest"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="h-16 w-16 rounded-full bg-ink-black/8 animate-pulse" aria-hidden="true" />
                <div className="flex flex-col items-end gap-2">
                  <div className="h-7 w-20 rounded-full bg-ink-black/8 animate-pulse" aria-hidden="true" />
                  <div className="h-7 w-16 rounded-full bg-cue-yellow/35 animate-pulse" aria-hidden="true" />
                </div>
              </div>
              <div className="space-y-3">
                <LoadingBar width="148px" />
                <LoadingBar width="118px" />
                <div className="flex gap-2 pt-1">
                  <div className="h-7 w-16 rounded-full bg-ink-black/8 animate-pulse" aria-hidden="true" />
                  <div className="h-7 w-20 rounded-full bg-ink-black/8 animate-pulse" aria-hidden="true" />
                </div>
              </div>
              <div className="pt-6">
                <LoadingBar width="112px" className="h-3" />
              </div>
            </div>
          ))}
        </section>
      </div>
    </main>
  )
}
