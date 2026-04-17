import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getHostId } from '@/lib/auth-middleware'
import { prisma } from '@/lib/db'
import { redirect } from 'next/navigation'
import { parseModuli } from '@/lib/moduli'
import { isHostAuthorized } from '@/lib/permissions'
import { getOnboardingChecklist, ONBOARDING_HOST_SELECT, type OnboardingHostData } from '@/lib/onboarding'
import { DashboardPage } from '@/components/dashboard/dashboard-page'

export default async function HostDashboardRoute() {
  const session = await getServerSession(authOptions)
  if (!session || !isHostAuthorized(session.user.role)) redirect('/login')
  const hostId = await getHostId()
  if (!hostId) redirect('/login')

  // Fetch host + onboarding data in parallel
  const [host, counts] = await Promise.all([
    prisma.host.findUnique({
      where: { id: hostId },
      select: {
        ...ONBOARDING_HOST_SELECT,
        strutture: { select: { id: true }, take: 1, orderBy: { createdAt: 'asc' } },
      },
    }),
    Promise.all([
      prisma.struttura.count({ where: { hostId } }),
      prisma.unitaPrenotabile.count({ where: { struttura: { hostId } } }),
      prisma.staffMember.count({ where: { hostId } }),
    ]).then(([strutture, tariffe, staff]) => ({ strutture, tariffe, configPasto: 0, staff, canali: 0 })),
  ])

  const moduliAttivi = parseModuli(host?.moduliAttivi)

  // Build checklist for onboarding banner
  const onboardingData: OnboardingHostData | null = host ? {
    ...host,
    _counts: counts,
    primaStrutturaId: host.strutture[0]?.id ?? null,
  } : null

  const checklist = onboardingData ? getOnboardingChecklist(onboardingData) : null

  return (
    <DashboardPage
      nomeUtente={session.user.name ?? ''}
      moduliAttivi={moduliAttivi}
      checklist={checklist}
      hostId={hostId}
    />
  )
}
