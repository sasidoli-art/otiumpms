import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db'
import { headers } from 'next/headers'
import { HostLayout } from '@/components/layout/host-layout'
import { getStruttureHost } from '@/lib/struttura-attiva'

export default async function HostRootLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions)

  if (!session) redirect('/login')
  const allowedRoles = ['HOST', 'ADMIN', 'SUPERADMIN', 'DIREZIONE', 'STAFF']
  if (!allowedRoles.includes(session.user.role)) redirect('/login')

  const host = session.user.role === 'HOST' || session.user.role === 'DIREZIONE' || session.user.role === 'STAFF'
    ? await prisma.host.findUnique({ where: { userId: session.user.id }, select: { nomeAzienda: true, id: true, moduliAttivi: true, onboardingCompletato: true, onboardingStep: true, logo: true, piano: true } })
      ?? await prisma.host.findFirst({ select: { nomeAzienda: true, id: true, moduliAttivi: true, onboardingCompletato: true, onboardingStep: true, logo: true, piano: true } })
    : await prisma.host.findFirst({ select: { nomeAzienda: true, id: true, moduliAttivi: true, onboardingCompletato: true, onboardingStep: true, logo: true, piano: true } })

  // Check if we're on the onboarding page
  const headersList = await headers()
  const pathname = headersList.get('x-pathname') || ''
  const isOnboardingPage = pathname.startsWith('/host/onboarding')
  const isSelezionePage = pathname.startsWith('/host/seleziona-struttura')

  // Redirect HOST to onboarding if fase 1 not completed (step < 5)
  const onboardingDone = host?.onboardingCompletato || (host?.onboardingStep ?? 0) >= 5
  if (session.user.role === 'HOST' && host && !onboardingDone && !isOnboardingPage) {
    redirect('/host/onboarding')
  }

  // Onboarding page renders without sidebar/topbar (full-screen wizard)
  if (isOnboardingPage) {
    return <>{children}</>
  }

  // Carica strutture e determina struttura attiva
  const { strutture, attiva } = host ? await getStruttureHost(host.id) : { strutture: [], attiva: null }

  // Se l'host ha 2+ strutture e nessuna è selezionata, forza la pagina di selezione
  if (strutture.length >= 2 && !attiva && !isSelezionePage) {
    redirect('/host/seleziona-struttura')
  }

  return (
    <HostLayout
      nomeUtente={session.user.name ?? ''}
      email={session.user.email}
      nomeAzienda={host?.nomeAzienda ?? 'La mia azienda'}
      moduliAttivi={host?.moduliAttivi ?? {}}
      logo={host?.logo}
      ruolo={session.user.role}
      piano={host?.piano ?? null}
      hostId={host?.id ?? null}
      strutture={strutture}
      strutturaAttivaId={attiva?.id ?? null}
    >
      {children}
    </HostLayout>
  )
}
