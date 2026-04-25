export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-paper-white">
      <main className="max-w-md mx-auto p-6 pt-12">{children}</main>
    </div>
  )
}
