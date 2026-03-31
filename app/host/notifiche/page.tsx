import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getHostId } from '@/lib/auth-middleware'
import { prisma } from '@/lib/db'
import { redirect } from 'next/navigation'
import NotificheClient from './notifiche-client'

export default async function NotifichePage({
  searchParams: searchParamsPromise,
}: {
  searchParams: Promise<{ tipo?: string; pagina?: string }>
}) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user.role !== 'HOST' && session.user.role !== 'ADMIN')) redirect('/login')
  const hostId = await getHostId()
  if (!hostId) redirect('/login')

  const { tipo = '', pagina = '1' } = await searchParamsPromise
  const perPage = 20
  const page = Math.max(1, Number(pagina) || 1)
  const offset = (page - 1) * perPage

  const where: Record<string, unknown> = { hostId }
  if (tipo) where.tipo = tipo

  const [notifiche, totale, nonLette, countByTipo] = await Promise.all([
    prisma.notifica.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: perPage,
      skip: offset,
    }),
    prisma.notifica.count({ where }),
    prisma.notifica.count({ where: { hostId, letta: false } }),
    prisma.notifica.groupBy({
      by: ['tipo'],
      where: { hostId },
      _count: true,
    }),
  ])

  const tipiCount = Object.fromEntries(countByTipo.map(c => [c.tipo, c._count]))

  return (
    <NotificheClient
      notifiche={notifiche.map(n => ({
        ...n,
        createdAt: n.createdAt.toISOString(),
      }))}
      totale={totale}
      nonLette={nonLette}
      tipiCount={tipiCount}
      filtroTipo={tipo}
      pagina={page}
      perPage={perPage}
    />
  )
}
