import { prisma } from '@/lib/db'
import Link from 'next/link'
import { requireSuperAdmin, isUnauthorized } from '@/lib/auth-middleware'
import { redirect } from 'next/navigation'
import WifiFleetClient from './wifi-fleet-client'

export const metadata = { title: 'Wi-Fi Fleet — SuperAdmin' }
export const dynamic = 'force-dynamic'

export default async function SuperAdminWifiFleetPage({
  searchParams: searchParamsPromise,
}: {
  searchParams: Promise<{ host?: string; stato?: string; modello?: string }>
}) {
  const auth = await requireSuperAdmin()
  if (isUnauthorized(auth)) {
    redirect('/login')
  }

  const searchParams = await searchParamsPromise
  const filtroHost = searchParams.host || ''
  const filtroStato = searchParams.stato || ''
  const filtroModello = searchParams.modello || ''

  const where: Record<string, unknown> = {}
  if (filtroHost) where.hostId = filtroHost
  if (filtroStato) where.stato = filtroStato
  if (filtroModello) where.modello = filtroModello

  const [devices, hosts, counters] = await Promise.all([
    prisma.wifiDevice.findMany({
      where,
      orderBy: [{ stato: 'asc' }, { ultimoHeartbeatAt: 'desc' }, { createdAt: 'desc' }],
      include: {
        host: { select: { nomeAzienda: true } },
        struttura: { select: { nome: true } },
        _count: { select: { commands: true, guestUsers: true } },
      },
    }),
    prisma.host.findMany({
      select: { id: true, nomeAzienda: true },
      orderBy: { nomeAzienda: 'asc' },
    }),
    prisma.wifiDevice.groupBy({
      by: ['stato'],
      _count: { _all: true },
    }),
  ])

  const stateCounts: Record<string, number> = {}
  for (const c of counters) {
    stateCounts[c.stato] = c._count._all
  }

  const serialized = devices.map(d => ({
    id: d.id,
    alias: d.alias,
    mac: d.mac,
    modello: d.modello,
    firmware: d.firmware,
    stato: d.stato,
    hostId: d.hostId,
    strutturaId: d.strutturaId,
    host: { nomeAzienda: d.host.nomeAzienda },
    struttura: d.struttura ? { nome: d.struttura.nome } : null,
    ultimoHeartbeatAt: d.ultimoHeartbeatAt?.toISOString() ?? null,
    ultimoIpPubblico: d.ultimoIpPubblico,
    ultimoAgentVersion: d.ultimoAgentVersion,
    commandsCount: d._count.commands,
    guestUsersCount: d._count.guestUsers,
    createdAt: d.createdAt.toISOString(),
  }))

  return (
    <WifiFleetClient
      devices={serialized}
      hosts={hosts}
      stateCounts={stateCounts}
      filtroHost={filtroHost}
      filtroStato={filtroStato}
      filtroModello={filtroModello}
    />
  )
}
