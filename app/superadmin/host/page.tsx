import { prisma } from '@/lib/db'
import HostManager from './host-manager'

export const metadata = { title: 'Host & Clienti — SuperAdmin' }

export default async function SuperAdminHostPage() {
  const hosts = await prisma.host.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      user: { select: { email: true, nome: true, cognome: true, attivo: true } },
      _count: { select: { strutture: true, prenotazioni: true, fatture: true } },
    },
  })

  const serialized = hosts.map(h => ({
    id: h.id,
    nomeAzienda: h.nomeAzienda,
    citta: h.citta,
    piano: h.piano,
    statoAbbonamento: h.statoAbbonamento,
    dataFineAbb: h.dataFineAbb?.toISOString() ?? null,
    conciergeAttivo: h.conciergeAttivo,
    moduliAttivi: h.moduliAttivi as Record<string, boolean> | null,
    user: h.user,
    _count: h._count,
    createdAt: h.createdAt.toISOString(),
  }))

  return <HostManager hostsIniziali={serialized} />
}
