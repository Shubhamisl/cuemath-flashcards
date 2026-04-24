export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-paper-white">
      <div className="h-1 w-full bg-soft-cream">
        <div
          className="h-1 bg-cue-yellow transition-all duration-progress"
          style={{ width: 'var(--onboarding-progress, 25%)' }}
        />
      </div>
      <main className="max-w-md mx-auto p-6 pt-12">{children}</main>
    </div>
  )
}
