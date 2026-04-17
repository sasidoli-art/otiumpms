import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getHostId } from '@/lib/auth-middleware'
import { prisma } from '@/lib/db'
import { redirect } from 'next/navigation'
import { parseModuli } from '@/lib/moduli'
import { isHostAuthorized } from '@/lib/permissions'
import { DashboardPage } from '@/components/dashboard/dashboard-page'

export default async function HostDashboardRoute() {
  const session = await getServerSession(authOptions)
  if (!session || !isHostAuthorized(session.user.role)) redirect('/login')
  const hostId = await getHostId()
  if (!hostId) redirect('/login')

  const host = await prisma.host.findUnique({
    where: { id: hostId },
    select: { moduliAttivi: true },
  })

  const moduliAttivi = parseModuli(host?.moduliAttivi)

  return (
    <DashboardPage
      nomeUtente={session.user.name ?? ''}
      moduliAttivi={moduliAttivi}
    />
  )
}
