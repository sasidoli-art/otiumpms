import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getHostId } from '@/lib/auth-middleware'
import { prisma } from '@/lib/db'
import { redirect } from 'next/navigation'
import { startOfMonth, endOfMonth, parseISO } from 'date-fns'
import { StatoAppuntamentoSpa } from '@prisma/client'
import SpaReportClient from './spa-report-client'

export default async function SpaReportPage({ searchParams }: { searchParams: Promise<{ mese?: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user.role !== 'HOST' && session.user.role !== 'ADMIN')) redirect('/login')
  const hostId = await getHostId()
  if (!hostId) redirect('/login')

  const params = await searchParams
  const mese = params.mese

  let inizio: Date, fine: Date, meseSel: string
  if (mese && /^\d{4}-\d{2}$/.test(mese)) {
    inizio = startOfMonth(parseISO(mese + '-01'))
    fine = endOfMonth(inizio)
    meseSel = mese
  } else {
    const oggi = new Date()
    inizio = startOfMonth(oggi)
    fine = endOfMonth(oggi)
    meseSel = `${oggi.getFullYear()}-${String(oggi.getMonth() + 1).padStart(2, '0')}`
  }

  const statiNegative: StatoAppuntamentoSpa[] = [StatoAppuntamentoSpa.ANNULLATO, StatoAppuntamentoSpa.NO_SHOW]
  const whereAttivi = { hostId, dataOra: { gte: inizio, lte: fine }, stato: { notIn: statiNegative } }

  const [
    kpiAttivi,
    kpiCancellazioni,
    revenuePerTerapistaRaw,
    occupancyCabineRaw,
    topTrattamentiRaw,
    appuntamentiDataOra,
  ] = await Promise.all([
    prisma.appuntamentoSpa.aggregate({
      where: whereAttivi,
      _count: { id: true },
      _sum: { prezzoTotale: true, durata: true },
    }),
    prisma.appuntamentoSpa.count({
      where: { hostId, dataOra: { gte: inizio, lte: fine }, stato: { in: statiNegative } },
    }),
    prisma.appuntamentoSpa.groupBy({
      by: ['terapistaId'],
      where: { ...whereAttivi, terapistaId: { not: null } },
      _sum: { prezzoTotale: true, durata: true },
      _count: true,
      orderBy: { _sum: { prezzoTotale: 'desc' } },
    }),
    prisma.appuntamentoSpa.groupBy({
      by: ['cabinaId'],
      where: { ...whereAttivi, cabinaId: { not: null } },
      _sum: { durata: true },
      _count: true,
    }),
    prisma.appuntamentoSpa.groupBy({
      by: ['trattamentoId'],
      where: whereAttivi,
      _count: true,
      _sum: { prezzoTotale: true },
      orderBy: { _count: { id: 'desc' } },
      take: 10,
    }),
    prisma.appuntamentoSpa.findMany({
      where: whereAttivi,
      select: { dataOra: true },
    }),
  ])

  const terapistiIds = revenuePerTerapistaRaw.map(r => r.terapistaId!).filter(Boolean)
  const cabineIds = occupancyCabineRaw.map(r => r.cabinaId!).filter(Boolean)
  const trattamentiIds = topTrattamentiRaw.map(r => r.trattamentoId).filter((id): id is string => id !== null)

  const [terapistiList, cabineList, trattamentiList] = await Promise.all([
    terapistiIds.length
      ? prisma.terapistaSpa.findMany({ where: { id: { in: terapistiIds } }, select: { id: true, nome: true, cognome: true, colore: true } })
      : [],
    cabineIds.length
      ? prisma.cabinaSpa.findMany({ where: { id: { in: cabineIds } }, select: { id: true, nome: true, colore: true } })
      : [],
    trattamentiIds.length
      ? prisma.trattamentoSpa.findMany({ where: { id: { in: trattamentiIds } }, select: { id: true, nome: true, categoria: true } })
      : [],
  ])

  const terapistiMap = new Map(terapistiList.map(t => [t.id, t]))
  const cabineMap = new Map(cabineList.map(c => [c.id, c]))
  const trattamentiMap = new Map(trattamentiList.map(t => [t.id, t]))

  const revenuePerTerapista = revenuePerTerapistaRaw
    .filter(r => r.terapistaId && terapistiMap.has(r.terapistaId))
    .map(r => {
      const t = terapistiMap.get(r.terapistaId!)!
      const count = r._count as number
      const revenue = r._sum?.prezzoTotale ?? 0
      return {
        terapistaId: r.terapistaId!,
        nome: `${t.nome} ${t.cognome}`,
        colore: t.colore,
        count,
        revenue,
        durataMinuti: r._sum?.durata ?? 0,
        avgTicket: count > 0 ? revenue / count : 0,
      }
    })

  const giorniMese = fine.getDate()
  const minDisponibiliPerCabina = giorniMese * 600 // 10h/giorno

  const occupancyCabine = occupancyCabineRaw
    .filter(r => r.cabinaId && cabineMap.has(r.cabinaId))
    .map(r => {
      const c = cabineMap.get(r.cabinaId!)!
      const minUsati = r._sum?.durata ?? 0
      return {
        cabinaId: r.cabinaId!,
        nome: c.nome,
        colore: c.colore,
        count: r._count as number,
        minUsati,
        minDisponibili: minDisponibiliPerCabina,
        occupancyPct: Math.min(100, Math.round((minUsati / minDisponibiliPerCabina) * 100)),
      }
    })
    .sort((a, b) => b.occupancyPct - a.occupancyPct)

  const topTrattamenti = topTrattamentiRaw.map(r => ({
    trattamentoId: r.trattamentoId,
    nome: r.trattamentoId ? (trattamentiMap.get(r.trattamentoId)?.nome ?? 'Trattamento') : 'Percorso benessere',
    categoria: r.trattamentoId ? (trattamentiMap.get(r.trattamentoId)?.categoria ?? '') : 'PERCORSO',
    count: r._count as number,
    revenue: r._sum?.prezzoTotale ?? 0,
  }))

  // Daily trend
  const contaGiorno = new Map<number, number>()
  for (const a of appuntamentiDataOra) {
    const g = new Date(a.dataOra).getDate()
    contaGiorno.set(g, (contaGiorno.get(g) ?? 0) + 1)
  }
  const perGiorno = Array.from({ length: giorniMese }, (_, i) => ({
    giorno: i + 1,
    count: contaGiorno.get(i + 1) ?? 0,
  }))

  const apptAttiviCount = kpiAttivi._count.id
  const totaleAppt = apptAttiviCount + kpiCancellazioni
  const kpi = {
    totaleAppt,
    apptAttivi: apptAttiviCount,
    cancellazioni: kpiCancellazioni,
    tassoCancellazione: totaleAppt > 0 ? Math.round((kpiCancellazioni / totaleAppt) * 100) : 0,
    revenue: kpiAttivi._sum.prezzoTotale ?? 0,
    durataOre: Math.round((kpiAttivi._sum.durata ?? 0) / 60),
  }

  return (
    <SpaReportClient
      mese={meseSel}
      kpi={kpi}
      revenuePerTerapista={revenuePerTerapista}
      occupancyCabine={occupancyCabine}
      topTrattamenti={topTrattamenti}
      perGiorno={perGiorno}
    />
  )
}
