export default function OnboardingLoading() {
  return (
    <div className="motion-premium-reveal space-y-8" aria-hidden="true">
      <nav
        aria-label="Onboarding progress"
        className="flex items-center gap-2"
      >
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex flex-1 items-center gap-2">
            <div className="flex min-w-0 flex-1 items-center gap-2 rounded-full bg-ink-black/5 px-3 py-1.5">
              <span className="inline-flex h-5 w-5 flex-shrink-0 rounded-full bg-ink-black/10" />
              <span className="h-3 w-20 rounded-full bg-ink-black/10" />
            </div>
          </div>
        ))}
      </nav>

      <div className="space-y-3">
        <div className="h-9 w-3/4 rounded-md bg-ink-black/8" />
        <div className="h-4 w-2/3 rounded-md bg-ink-black/6" />
      </div>

      <div className="grid grid-cols-1 gap-3">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-[72px] rounded-card border border-ink-black/8 bg-ink-black/[0.03]"
          />
        ))}
      </div>
    </div>
  )
}
