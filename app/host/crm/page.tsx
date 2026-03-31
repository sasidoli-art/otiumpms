import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getHostId } from '@/lib/auth-middleware'
import { prisma } from '@/lib/db'
import { redirect } from 'next/navigation'
import CrmBoard from './crm-board'

export default async function CrmPage() {
  const session = await getServerSession(authOptions)
  if (!session || (session.user.role !== 'HOST' && session.user.role !== 'ADMIN')) redirect('/login')
  const hostId = await getHostId()
  if (!hostId) redirect('/login')

  // KPI rapidi
  const [totale, vip, blacklist] = await Promise.all([
    prisma.ospiteCRM.count({ where: { hostId: hostId } }),
    prisma.ospiteCRM.count({ where: { hostId: hostId, vip: true } }),
    prisma.ospiteCRM.count({ where: { hostId: hostId, blacklist: true } }),
  ])

  // Carica i primi 20 ospiti per SSR iniziale
  const ospiti = await prisma.ospiteCRM.findMany({
    where: { hostId: hostId },
    orderBy: [{ vip: 'desc' }, { dataUltimoSoggiorno: 'desc' }, { cognome: 'asc' }],
    take: 20,
  })

  return (
    <CrmBoard
      ospiteIniziali={ospiti.map(o => ({
        ...o,
        dataUltimoSoggiorno: o.dataUltimoSoggiorno?.toISOString() ?? null,
        createdAt: o.createdAt.toISOString(),
        updatedAt: o.updatedAt.toISOString(),
      }))}
      kpi={{ totale, vip, blacklist }}
    />
  )
}
