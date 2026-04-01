import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db'
import { headers } from 'next/headers'
import { HostSidebar } from '@/components/host/sidebar'
import { Topbar } from '@/components/layout/topbar'
import { BugReportButton } from '@/components/layout/bug-report-button'

export default async function HostLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions)

  if (!session) redirect('/login')
  if (session.user.role !== 'HOST' && session.user.role !== 'ADMIN') redirect('/login')

  const host = session.user.role === 'HOST'
    ? await prisma.host.findUnique({ where: { userId: session.user.id }, select: { nomeAzienda: true, id: true, moduliAttivi: true, onboardingCompletato: true } })
    : await prisma.host.findFirst({ select: { nomeAzienda: true, id: true, moduliAttivi: true, onboardingCompletato: true } })

  // Check if we're on the onboarding page
  const headersList = await headers()
  const pathname = headersList.get('x-pathname') || ''
  const isOnboardingPage = pathname.startsWith('/host/onboarding')

  // Redirect HOST to onboarding if not completed (skip if already on onboarding page)
  if (session.user.role === 'HOST' && host && !host.onboardingCompletato && !isOnboardingPage) {
    redirect('/host/onboarding')
  }

  // Onboarding page renders without sidebar/topbar (full-screen wizard)
  if (isOnboardingPage) {
    return <>{children}</>
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <HostSidebar
        nomeUtente={session.user.name ?? ''}
        nomeAzienda={host?.nomeAzienda ?? 'La mia azienda'}
        moduliAttivi={host?.moduliAttivi ?? {}}
      />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Topbar
          nomeUtente={session.user.name ?? ''}
          ruolo="HOST"
          settingsHref="/host/profilo"
        />
        <main className="flex-1 overflow-y-auto bg-slate-100 dark:bg-slate-950 p-6">
          {children}
        </main>
      </div>
      <BugReportButton />
    </div>
  )
}
