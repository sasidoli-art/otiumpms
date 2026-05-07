import { NextRequest, NextResponse } from 'next/server'
import { requireHost, isUnauthorized } from '@/lib/auth-middleware'
import { prisma } from '@/lib/db'
import { startOfMonth, endOfMonth, parseISO } from 'date-fns'
import { StatoAppuntamentoSpa } from '@prisma/client'



// ─── GET: KPI avanzati per SPA reporting ────────────────────────────────────

export async function GET(req: NextRequest) {
  const auth = await requireHost()
  if (isUnauthorized(auth)) return auth

  const { searchParams } = new URL(req.url)
  const meseParam = searchParams.get('mese')

  let inizio: Date, fine: Date
  if (meseParam && /^\d{4}-\d{2}$/.test(meseParam)) {
    inizio = startOfMonth(parseISO(meseParam + '-01'))
    fine = endOfMonth(inizio)
  } else {
    const oggi = new Date()
    inizio = startOfMonth(oggi)
    fine = endOfMonth(oggi)
  }

  const hostId = auth.user.hostId
  const statiAttivi: StatoAppuntamentoSpa[] = [
    StatoAppuntamentoSpa.CONFERMATO,
    StatoAppuntamentoSpa.COMPLETATO,
    StatoAppuntamentoSpa.IN_CORSO,
  ]
  const statiNegative: StatoAppuntamentoSpa[] = [
    StatoAppuntamentoSpa.ANNULLATO,
    StatoAppuntamentoSpa.NO_SHOW,
  ]

  const [
    // Revenue by treatment type (CategoriaSpa)
    revenuePerCategoria,
    // Therapist utilization data
    terapistiAppuntamenti,
    terapistiDisponibilita,
    // Peak hours (all appointments)
    allAppuntamenti,
    // Gift card stats
    giftCardStats,
    giftCardUtilizzate,
    // Loyalty stats
    loyaltyProgramma,
    loyaltyPuntiEmessi,
    loyaltyPuntiUsati,
    // Waiting list stats
    waitingTotal,
    waitingBooked,
    // Turnaway stats
    turnawayByMotivo,
    // All bookings in period (for cross-sell)
    prenotazioniPeriodo,
    spaGuestEmails,
    // Cancellations
    cancellazioniPeriodo,
  ] = await Promise.all([
    // 1. Revenue by category
    prisma.$queryRaw`
      SELECT t.categoria, COUNT(a.id)::int as count, COALESCE(SUM(a."prezzoTotale"), 0)::float as revenue
      FROM appuntamenti_spa a
      LEFT JOIN trattamenti_spa t ON a."trattamentoId" = t.id
      WHERE a."hostId" = ${hostId}
        AND a."dataOra" >= ${inizio} AND a."dataOra" <= ${fine}
        AND a.stato NOT IN ('ANNULLATO', 'NO_SHOW')
      GROUP BY t.categoria
      ORDER BY revenue DESC
    ` as Promise<{ categoria: string | null; count: number; revenue: number }[]>,

    // 2. Therapist appointments
    prisma.appuntamentoSpa.groupBy({
      by: ['terapistaId'],
      where: {
        hostId,
        dataOra: { gte: inizio, lte: fine },
        stato: { in: statiAttivi },
        terapistaId: { not: null },
      },
      _sum: { durata: true },
      _count: true,
    }),

    // 3. Therapist availability (all active therapists)
    prisma.terapistaSpa.findMany({
      where: { hostId, attivo: true },
      select: { id: true, nome: true, cognome: true },
    }),

    // 4. All active appointments for peak hours
    prisma.appuntamentoSpa.findMany({
      where: {
        hostId,
        dataOra: { gte: inizio, lte: fine },
        stato: { notIn: statiNegative },
      },
      select: { dataOra: true, durata: true, prezzoTotale: true },
    }),

    // 5. Gift card stats
    prisma.giftCard.aggregate({
      where: { hostId },
      _count: { id: true },
      _sum: { valoreOriginale: true, saldoResiduo: true },
    }),

    // Gift cards used in period
    prisma.giftCardMovimento.findMany({
      where: {
        giftCard: { hostId },
        tipo: 'UTILIZZO',
        createdAt: { gte: inizio, lte: fine },
      },
      select: { importo: true },
    }),

    // 6. Loyalty program
    prisma.programmaFedelta.findFirst({
      where: { hostId },
      include: { _count: { select: { membri: true } } },
    }),

    // Loyalty points issued in period
    prisma.movimentoPunti.aggregate({
      where: {
        membro: { programma: { hostId } },
        punti: { gt: 0 },
        createdAt: { gte: inizio, lte: fine },
      },
      _sum: { punti: true },
    }),

    // Loyalty points used in period
    prisma.movimentoPunti.aggregate({
      where: {
        membro: { programma: { hostId } },
        punti: { lt: 0 },
        createdAt: { gte: inizio, lte: fine },
      },
      _sum: { punti: true },
    }),

    // 7. Waiting list total
    prisma.waitingListSpa.count({
      where: { hostId, createdAt: { gte: inizio, lte: fine } },
    }),

    // Waiting list -> booked
    prisma.waitingListSpa.count({
      where: { hostId, stato: 'PRENOTATO', createdAt: { gte: inizio, lte: fine } },
    }),

    // 8. Turnaway by motivo
    prisma.turnawayTracking.groupBy({
      by: ['motivo'],
      where: { hostId, data: { gte: inizio, lte: fine } },
      _count: true,
    }),

    // 9. Hotel bookings in period (for cross-sell)
    prisma.prenotazione.count({
      where: {
        hostId,
        dataArrivo: { lte: fine },
        dataPartenza: { gte: inizio },
        stato: { notIn: ['ANNULLATA', 'NO_SHOW'] },
      },
    }),

    // SPA guest emails in period
    prisma.appuntamentoSpa.findMany({
      where: {
        hostId,
        dataOra: { gte: inizio, lte: fine },
        stato: { notIn: statiNegative },
        guestEmail: { not: null },
      },
      select: { guestEmail: true },
      distinct: ['guestEmail'],
    }),

    // 10. Cancellations with revenue impact
    prisma.appuntamentoSpa.findMany({
      where: {
        hostId,
        dataOra: { gte: inizio, lte: fine },
        stato: { in: statiNegative },
      },
      select: { prezzoTotale: true, stato: true },
    }),
  ])

  // ─── Process results ──────────────────────────────────────────────────────

  // Revenue by category
  const revenueByCategory = revenuePerCategoria.map((r) => ({
    categoria: r.categoria ?? 'PERCORSO',
    count: r.count,
    revenue: r.revenue,
  }))

  // Therapist utilization
  const giorniMese = fine.getDate()
  const oreDisponibiliPerTerapista = giorniMese * 8 * 60 // 8h/day in minutes
  const terapistiMap = new Map(terapistiDisponibilita.map((t) => [t.id, t]))
  const therapistUtilization = terapistiAppuntamenti
    .filter((t) => t.terapistaId && terapistiMap.has(t.terapistaId))
    .map((t) => {
      const ter = terapistiMap.get(t.terapistaId!)!
      const minUsati = t._sum.durata ?? 0
      return {
        terapistaId: t.terapistaId!,
        nome: `${ter.nome} ${ter.cognome}`,
        minLavorati: minUsati,
        minDisponibili: oreDisponibiliPerTerapista,
        utilizzo: Math.min(100, Math.round((minUsati / oreDisponibiliPerTerapista) * 100)),
        appuntamenti: t._count as number,
      }
    })
    .sort((a, b) => b.utilizzo - a.utilizzo)

  // Peak hours heatmap (0-23)
  const peakHours = Array.from({ length: 24 }, (_, h) => ({ ora: h, count: 0 }))
  for (const a of allAppuntamenti) {
    const hour = new Date(a.dataOra).getHours()
    if (hour >= 0 && hour < 24) peakHours[hour].count++
  }

  // Gift card stats
  const giftCardRevenueInPeriod = giftCardUtilizzate.reduce((s, m) => s + Math.abs(m.importo), 0)
  const giftCards = {
    totaleEmesse: giftCardStats._count.id ?? 0,
    valoreOriginale: giftCardStats._sum.valoreOriginale ?? 0,
    saldoResiduo: giftCardStats._sum.saldoResiduo ?? 0,
    utilizzateNelPeriodo: giftCardUtilizzate.length,
    revenueNelPeriodo: giftCardRevenueInPeriod,
  }

  // Loyalty stats
  const loyalty = {
    totaleMembri: loyaltyProgramma?._count.membri ?? 0,
    puntiEmessiPeriodo: loyaltyPuntiEmessi._sum.punti ?? 0,
    puntiUtilizzatiPeriodo: Math.abs(loyaltyPuntiUsati._sum.punti ?? 0),
    nomeProgram: loyaltyProgramma?.nome ?? null,
  }

  // Waiting list conversion
  const waitingListConversion = {
    totale: waitingTotal,
    prenotati: waitingBooked,
    tassoConversione: waitingTotal > 0 ? Math.round((waitingBooked / waitingTotal) * 100) : 0,
  }

  // Turnaway analysis
  const MOTIVO_LABELS: Record<string, string> = {
    PIENO: 'Pieno',
    NON_DISPONIBILE: 'Non disponibile',
    PREZZO: 'Prezzo',
    ORARIO: 'Orario',
    ALTRO: 'Altro',
  }
  const turnawayAnalysis = turnawayByMotivo.map((t) => ({
    motivo: t.motivo,
    label: MOTIVO_LABELS[t.motivo] ?? t.motivo,
    count: t._count as number,
  }))
  const turnawayTotale = turnawayAnalysis.reduce((s, t) => s + t.count, 0)

  // Cross-sell rate
  const spaEmails = new Set(spaGuestEmails.map((e) => e.guestEmail).filter(Boolean))
  const crossSell = {
    prenotazioniHotel: prenotazioniPeriodo,
    ospitiSpa: spaEmails.size,
    tasso: prenotazioniPeriodo > 0 ? Math.round((spaEmails.size / prenotazioniPeriodo) * 100) : 0,
  }

  // Cancellation impact
  const cancellazioniCount = cancellazioniPeriodo.length
  const revenuePersaCancellazioni = cancellazioniPeriodo.reduce((s, a) => s + (a.prezzoTotale ?? 0), 0)
  const noShowCount = cancellazioniPeriodo.filter((a) => a.stato === 'NO_SHOW').length
  const cancellationImpact = {
    cancellazioni: cancellazioniCount - noShowCount,
    noShow: noShowCount,
    totale: cancellazioniCount,
    revenuePersa: revenuePersaCancellazioni,
  }

  return NextResponse.json({
    revenueByCategory,
    therapistUtilization,
    peakHours,
    giftCards,
    loyalty,
    waitingListConversion,
    turnawayAnalysis,
    turnawayTotale,
    crossSell,
    cancellationImpact,
  })
}
