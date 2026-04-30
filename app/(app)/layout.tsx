import { TopNav } from './_components/top-nav'
import { getAppShellData } from './_lib/app-shell-data'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const shell = await getAppShellData()

  return (
    <div className="min-h-screen cue-grid-surface">
      <TopNav name={shell.firstName} streak={shell.streak} />
      {children}
    </div>
  )
}
