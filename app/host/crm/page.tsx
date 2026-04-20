import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getHostId } from '@/lib/auth-middleware'
import { prisma } from '@/lib/db'
import { redirect } from 'next/navigation'
import ListaOspiti from '@/components/crm/lista-ospiti'
import { isHostAuthorized } from '@/lib/permissions'

export default async function CrmPage() {
  const session = await getServerSession(authOptions)
  if (!session || !isHostAuthorized(session.user.role)) redirect('/login')
  const hostId = await getHostId()
  if (!hostId) redirect('/login')

  const [totale, vip, blacklist, ricorrenti, ospiti] = await Promise.all([
    prisma.ospiteCRM.count({ where: { hostId } }),
    prisma.ospiteCRM.count({ where: { hostId, vip: true } }),
    prisma.ospiteCRM.count({ where: { hostId, blacklist: true } }),
    prisma.ospiteCRM.count({ where: { hostId, numSoggiorni: { gte: 2 } } }),
    prisma.ospiteCRM.findMany({
      where: { hostId },
      orderBy: [{ cognome: 'asc' }, { nome: 'asc' }],
      take: 20,
    }),
  ])

  return (
    <ListaOspiti
      ospiteIniziali={ospiti.map((o) => ({
        ...o,
        dataUltimoSoggiorno: o.dataUltimoSoggiorno?.toISOString() ?? null,
        createdAt: o.createdAt.toISOString(),
      }))}
      kpi={{ totale, vip, blacklist, ricorrenti }}
    />
  )
}
