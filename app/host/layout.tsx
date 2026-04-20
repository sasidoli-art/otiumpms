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

  const hostSelect = {
    nomeAzienda: true, id: true, moduliAttivi: true, onboardingCompletato: true,
    onboardingStep: true, logo: true, piano: true, dpaAccettato: true,
    dpaAccettazioni: { orderBy: { accettatoAt: 'desc' as const }, take: 1, select: { versione: true } },
  }

  const host = session.user.role === 'HOST' || session.user.role === 'DIREZIONE' || session.user.role === 'STAFF'
    ? await prisma.host.findUnique({ where: { userId: session.user.id }, select: hostSelect })
      ?? await prisma.host.findFirst({ select: hostSelect })
    : await prisma.host.findFirst({ select: hostSelect })

  // Check if we're on the onboarding/DPA pages
  const headersList = await headers()
  const pathname = headersList.get('x-pathname') || ''
  const isOnboardingPage = pathname.startsWith('/host/onboarding')
  const isSelezionePage = pathname.startsWith('/host/seleziona-struttura')
  const isDpaPage = pathname === '/host/dpa' || pathname.startsWith('/host/dpa/')

  // Fallback redirect (middleware handles this primarily via JWT token)
  const onboardingDone = (host?.onboardingStep ?? 0) >= 5 || host?.onboardingCompletato
  if (session.user.role === 'HOST' && host && !onboardingDone && !isOnboardingPage) {
    redirect('/host/onboarding')
  }

  // DPA guard (Art. 28 GDPR): HOST deve aver accettato l'ultima versione
  if (session.user.role === 'HOST' && host && !isDpaPage && !isOnboardingPage) {
    const { DPA_VERSIONE } = await import('@/lib/dpa-template')
    const ultimaVer = host.dpaAccettazioni[0]?.versione ?? null
    const dpaOk = host.dpaAccettato && ultimaVer === DPA_VERSIONE
    if (!dpaOk) redirect('/host/dpa')
  }

  // Full-screen pages (onboarding, DPA): rendering senza sidebar/topbar
  if (isOnboardingPage || isDpaPage) {
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
