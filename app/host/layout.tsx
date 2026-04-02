import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db'
import { headers } from 'next/headers'
import { HostShell } from '@/components/host/host-shell'

export default async function HostLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions)

  if (!session) redirect('/login')
  if (session.user.role !== 'HOST' && session.user.role !== 'ADMIN' && session.user.role !== 'SUPERADMIN') redirect('/login')

  const host = session.user.role === 'HOST'
    ? await prisma.host.findUnique({ where: { userId: session.user.id }, select: { nomeAzienda: true, id: true, moduliAttivi: true, onboardingCompletato: true, logo: true } })
    : await prisma.host.findFirst({ select: { nomeAzienda: true, id: true, moduliAttivi: true, onboardingCompletato: true, logo: true } })

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
    <HostShell
      nomeUtente={session.user.name ?? ''}
      nomeAzienda={host?.nomeAzienda ?? 'La mia azienda'}
      moduliAttivi={host?.moduliAttivi ?? {}}
      logo={host?.logo}
      ruolo={session.user.role as 'HOST' | 'ADMIN' | 'SUPERADMIN'}
    >
      {children}
    </HostShell>
  )
}
