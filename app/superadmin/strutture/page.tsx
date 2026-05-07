import { prisma } from '@/lib/db'
import StruttureClient from './strutture-client'

export const metadata = { title: 'Strutture — SuperAdmin' }

export default async function SuperAdminStrutturePage({
  searchParams: searchParamsPromise,
}: {
  searchParams: Promise<{ tipo?: string; attiva?: string; host?: string }>
}) {
  const searchParams = await searchParamsPromise
  const filtroTipo = searchParams.tipo || ''
  const filtroAttiva = searchParams.attiva ?? ''
  const filtroHost = searchParams.host || ''

  const where: Record<string, unknown> = {}
  if (filtroTipo) where.tipo = filtroTipo
  if (filtroAttiva !== '') where.attiva = filtroAttiva === '1'
  if (filtroHost) where.hostId = filtroHost

  const [strutture, hosts, totale] = await Promise.all([
    prisma.struttura.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        host: { select: { nomeAzienda: true } },
        _count: { select: { unita: true, prenotazioni: true } },
      },
    }),
    prisma.host.findMany({
      select: { id: true, nomeAzienda: true },
      orderBy: { nomeAzienda: 'asc' },
    }),
    prisma.struttura.count(),
  ])

  const serialized = strutture.map(s => ({
    id: s.id,
    nome: s.nome,
    tipo: s.tipo,
    citta: s.citta,
    attiva: s.attiva,
    hostId: s.hostId,
    host: s.host ? { nomeAzienda: s.host.nomeAzienda } : { nomeAzienda: '—' },
    _count: s._count,
  }))

  return (
    <StruttureClient
      strutture={serialized}
      hosts={hosts}
      totale={totale}
      filtroTipo={filtroTipo}
      filtroAttiva={filtroAttiva}
      filtroHost={filtroHost}
    />
  )
}
