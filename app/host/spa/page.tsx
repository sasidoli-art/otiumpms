import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getHostId } from '@/lib/auth-middleware'
import { prisma } from '@/lib/db'
import { redirect } from 'next/navigation'
import SpaDashboard from './spa-dashboard'
import { startOfDay, endOfDay, startOfMonth, endOfMonth } from 'date-fns'
import { isHostAuthorized } from '@/lib/permissions'

export default async function SpaPage() {
  const session = await getServerSession(authOptions)
  if (!session || !isHostAuthorized(session.user.role)) redirect('/login')
  const hostId = await getHostId()
  if (!hostId) redirect('/login')

  const oggi = new Date()
  const inizioGiorno = startOfDay(oggi)
  const fineGiorno = endOfDay(oggi)
  const inizioMese = startOfMonth(oggi)
  const fineMese = endOfMonth(oggi)

  const [
    appuntamentiOggi,
    appuntamentiMese,
    totaleTerapisti,
    totaleCabine,
    totaleTrattamenti,
    revenueMese,
    prossimi5,
  ] = await Promise.all([
    prisma.appuntamentoSpa.count({
      where: { hostId, dataOra: { gte: inizioGiorno, lte: fineGiorno }, stato: { notIn: ['ANNULLATO', 'NO_SHOW'] } },
    }),
    prisma.appuntamentoSpa.count({
      where: { hostId, dataOra: { gte: inizioMese, lte: fineMese }, stato: { notIn: ['ANNULLATO', 'NO_SHOW'] } },
    }),
    prisma.terapistaSpa.count({ where: { hostId, attivo: true } }),
    prisma.cabinaSpa.count({ where: { hostId, attiva: true } }),
    prisma.trattamentoSpa.count({ where: { hostId, attivo: true } }),
    prisma.appuntamentoSpa.aggregate({
      where: { hostId, dataOra: { gte: inizioMese, lte: fineMese }, stato: { in: ['COMPLETATO'] } },
      _sum: { prezzoTotale: true },
    }),
    prisma.appuntamentoSpa.findMany({
      where: { hostId, dataOra: { gte: oggi }, stato: { notIn: ['ANNULLATO', 'NO_SHOW'] } },
      include: {
        terapista: { select: { id: true, nome: true, cognome: true, colore: true } },
        cabina: { select: { id: true, nome: true } },
        trattamento: { select: { id: true, nome: true } },
        percorso: { select: { id: true, nome: true } },
      },
      orderBy: { dataOra: 'asc' },
      take: 5,
    }),
  ])

  // Get struttura for QR setup
  const struttura = await prisma.struttura.findFirst({ where: { hostId }, select: { id: true } })

  return (
    <SpaDashboard
      strutturaId={struttura?.id ?? null}
      kpi={{
        appuntamentiOggi,
        appuntamentiMese,
        totaleTerapisti,
        totaleCabine,
        totaleTrattamenti,
        revenueMese: revenueMese._sum.prezzoTotale ?? 0,
      }}
      prossimi5={prossimi5.map((a: any) => ({
        ...a,
        dataOra: a.dataOra.toISOString(),
        createdAt: a.createdAt.toISOString(),
        updatedAt: a.updatedAt.toISOString(),
      }))}
    />
  )
}
