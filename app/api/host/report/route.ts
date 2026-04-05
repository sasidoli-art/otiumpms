import { requireHostOrAdmin, isUnauthorized } from '@/lib/auth-middleware'
import { auditFromAuth } from '@/lib/audit'
import { prisma } from '@/lib/db'
import { NextResponse } from 'next/server'
import {
  startOfMonth, endOfMonth, eachDayOfInterval, startOfDay,
  subMonths, subYears, addDays,
} from 'date-fns'

type PrenData = {
  dataArrivo: Date
  dataPartenza: Date | null
  prezzoTotale: number | null
  struttura: { id: string; nome: string } | null
  fonte?: string | null
}

function calcolaMetriche(
  prenotazioni: PrenData[],
  inizioMese: Date,
  fineMese: Date,
  numGiorni: number,
  unitaTotali: number,
) {
  let nottiOccupate = 0
  let revenueTotale = 0
  let numPrenotazioni = 0
  const perStruttura: Record<string, { nome: string; prenotazioni: number; nottiOccupate: number; revenue: number }> = {}

  for (const p of prenotazioni) {
    const arrivo = startOfDay(new Date(p.dataArrivo))
    const partenza = p.dataPartenza ? startOfDay(new Date(p.dataPartenza)) : fineMese
    const start = arrivo < inizioMese ? inizioMese : arrivo
    const end = partenza > fineMese ? fineMese : partenza
    const nottiNelMese = Math.max(0, Math.round((end.getTime() - start.getTime()) / 86400000))

    nottiOccupate += nottiNelMese
    numPrenotazioni++

    const nottiTotali = p.dataPartenza
      ? Math.round((new Date(p.dataPartenza).getTime() - new Date(p.dataArrivo).getTime()) / 86400000)
      : nottiNelMese
    const revenueNelMese = p.prezzoTotale && nottiTotali > 0
      ? (p.prezzoTotale * nottiNelMese) / nottiTotali
      : 0
    revenueTotale += revenueNelMese

    if (p.struttura) {
      const sid = p.struttura.id
      if (!perStruttura[sid]) perStruttura[sid] = { nome: p.struttura.nome, prenotazioni: 0, nottiOccupate: 0, revenue: 0 }
      perStruttura[sid].prenotazioni++
      perStruttura[sid].nottiOccupate += nottiNelMese
      perStruttura[sid].revenue += revenueNelMese
    }
  }

  const capacitaTotale = unitaTotali * numGiorni
  const occupazionePercent = capacitaTotale > 0 ? Math.round((nottiOccupate / capacitaTotale) * 1000) / 10 : 0
  const revpar = unitaTotali > 0 ? Math.round((revenueTotale / (unitaTotali * numGiorni)) * 100) / 100 : 0

  // ADR (Average Daily Rate) = Revenue / Notti Occupate
  const adr = nottiOccupate > 0 ? Math.round((revenueTotale / nottiOccupate) * 100) / 100 : 0

  // Durata media soggiorno
  let totalNotti = 0
  for (const p of prenotazioni) {
    if (p.dataPartenza) {
      totalNotti += Math.max(1, Math.round((new Date(p.dataPartenza).getTime() - new Date(p.dataArrivo).getTime()) / 86400000))
    } else {
      totalNotti += 1
    }
  }
  const durataMediaSoggiorno = numPrenotazioni > 0 ? Math.round((totalNotti / numPrenotazioni) * 10) / 10 : 0

  // Breakdown per fonte prenotazione
  const perFonte: Record<string, { prenotazioni: number; revenue: number }> = {}
  for (const p of prenotazioni) {
    const fonte = (p as PrenData).fonte || 'Diretto'
    if (!perFonte[fonte]) perFonte[fonte] = { prenotazioni: 0, revenue: 0 }
    perFonte[fonte].prenotazioni++
    const nottiTotali = p.dataPartenza
      ? Math.max(1, Math.round((new Date(p.dataPartenza).getTime() - new Date(p.dataArrivo).getTime()) / 86400000))
      : 1
    const arrivo = startOfDay(new Date(p.dataArrivo))
    const partenza = p.dataPartenza ? startOfDay(new Date(p.dataPartenza)) : fineMese
    const start = arrivo < inizioMese ? inizioMese : arrivo
    const end = partenza > fineMese ? fineMese : partenza
    const nottiNelMese = Math.max(0, Math.round((end.getTime() - start.getTime()) / 86400000))
    perFonte[fonte].revenue += p.prezzoTotale && nottiTotali > 0 ? (p.prezzoTotale * nottiNelMese) / nottiTotali : 0
  }

  return {
    numPrenotazioni,
    nottiOccupate,
    capacitaTotale,
    occupazionePercent,
    revenueTotale: Math.round(revenueTotale * 100) / 100,
    revpar,
    adr,
    durataMediaSoggiorno,
    perStruttura: Object.values(perStruttura),
    perFonte: Object.entries(perFonte).map(([fonte, dati]) => ({
      fonte,
      prenotazioni: dati.prenotazioni,
      revenue: Math.round(dati.revenue * 100) / 100,
    })).sort((a, b) => b.revenue - a.revenue),
  }
}

export async function GET(req: Request) {
  const auth = await requireHostOrAdmin()
  if (isUnauthorized(auth)) return auth

  const { searchParams } = new URL(req.url)
  const anno = parseInt(searchParams.get('anno') ?? String(new Date().getFullYear()))
  const mese = parseInt(searchParams.get('mese') ?? String(new Date().getMonth() + 1))

  if (isNaN(anno) || isNaN(mese) || mese < 1 || mese > 12) {
    return NextResponse.json({ error: 'Parametri non validi' }, { status: 400 })
  }

  const hostId = auth.user.hostId
  const inizioMese = startOfMonth(new Date(anno, mese - 1, 1))
  const fineMese = endOfMonth(new Date(anno, mese - 1, 1))
  const giorniMese = eachDayOfInterval({ start: inizioMese, end: fineMese })
  const numGiorni = giorniMese.length

  // Mese precedente per confronto
  const inizioMesePrec = startOfMonth(subMonths(inizioMese, 1))
  const fineMesePrec = endOfMonth(subMonths(inizioMese, 1))
  const numGiorniPrec = eachDayOfInterval({ start: inizioMesePrec, end: fineMesePrec }).length

  const unitaTotali = await prisma.unitaPrenotabile.count({
    where: { struttura: { hostId } },
  })

  // Fetch prenotazioni per entrambi i mesi + forecast
  const oggi = new Date()
  const fra30gg = addDays(oggi, 30)

  const whereBase = (inizio: Date, fine: Date) => ({
    hostId,
    stato: { in: ['CONFERMATA' as const, 'COMPLETATA' as const] },
    OR: [
      { dataArrivo: { gte: inizio, lte: fine } },
      { dataPartenza: { gte: inizio, lte: fine } },
      { dataArrivo: { lte: inizio }, dataPartenza: { gte: fine } },
    ],
  })

  // Stesso mese anno precedente (per confronto YoY)
  const inizioMeseYoY = startOfMonth(subYears(inizioMese, 1))
  const fineMeseYoY = endOfMonth(subYears(inizioMese, 1))
  const numGiorniYoY = eachDayOfInterval({ start: inizioMeseYoY, end: fineMeseYoY }).length

  const [prenotazioni, prenotazioniPrec, prenotazioniYoY, prenotazioniFuture, cancellazioni] = await Promise.all([
    prisma.prenotazione.findMany({
      where: whereBase(inizioMese, fineMese),
      include: { struttura: { select: { id: true, nome: true } } },
    }),
    prisma.prenotazione.findMany({
      where: whereBase(inizioMesePrec, fineMesePrec),
      include: { struttura: { select: { id: true, nome: true } } },
    }),
    // Stesso mese anno precedente
    prisma.prenotazione.findMany({
      where: whereBase(inizioMeseYoY, fineMeseYoY),
      include: { struttura: { select: { id: true, nome: true } } },
    }),
    // Forecast: prossimi 30 giorni
    prisma.prenotazione.findMany({
      where: {
        hostId,
        stato: { in: ['CONFERMATA', 'RICHIESTA'] },
        OR: [
          { dataArrivo: { gte: oggi, lte: fra30gg } },
          { dataPartenza: { gte: oggi, lte: fra30gg } },
          { dataArrivo: { lte: oggi }, dataPartenza: { gte: fra30gg } },
        ],
      },
      select: { dataArrivo: true, dataPartenza: true, stato: true },
    }),
    // Cancellazioni e no-show del mese
    prisma.prenotazione.count({
      where: {
        hostId,
        stato: { in: ['ANNULLATA', 'NO_SHOW'] },
        updatedAt: { gte: inizioMese, lte: fineMese },
      },
    }),
  ])

  // Metriche mese corrente
  const metriche = calcolaMetriche(prenotazioni, inizioMese, fineMese, numGiorni, unitaTotali)

  // Metriche mese precedente (per confronto MoM)
  const metrichePrec = calcolaMetriche(prenotazioniPrec, inizioMesePrec, fineMesePrec, numGiorniPrec, unitaTotali)

  // Metriche stesso mese anno precedente (per confronto YoY)
  const metricheYoY = calcolaMetriche(prenotazioniYoY, inizioMeseYoY, fineMeseYoY, numGiorniYoY, unitaTotali)

  // Tasso cancellazione / no-show
  const totalPrenotazioniMese = metriche.numPrenotazioni + cancellazioni
  const cancellazionePct = totalPrenotazioniMese > 0
    ? Math.round((cancellazioni / totalPrenotazioniMese) * 1000) / 10
    : 0

  // Delta percentuali
  const delta = (cur: number, prev: number) =>
    prev === 0 ? (cur > 0 ? 100 : 0) : Math.round(((cur - prev) / prev) * 1000) / 10

  const confronto = {
    revenue: delta(metriche.revenueTotale, metrichePrec.revenueTotale),
    occupazione: Math.round((metriche.occupazionePercent - metrichePrec.occupazionePercent) * 10) / 10,
    prenotazioni: delta(metriche.numPrenotazioni, metrichePrec.numPrenotazioni),
    revpar: delta(metriche.revpar, metrichePrec.revpar),
    adr: delta(metriche.adr, metrichePrec.adr),
    prevRevenue: metrichePrec.revenueTotale,
    prevOccupazione: metrichePrec.occupazionePercent,
    prevPrenotazioni: metrichePrec.numPrenotazioni,
    prevRevpar: metrichePrec.revpar,
    prevAdr: metrichePrec.adr,
  }

  // Confronto anno su anno (YoY)
  const confrontoYoY = {
    revenue: delta(metriche.revenueTotale, metricheYoY.revenueTotale),
    occupazione: Math.round((metriche.occupazionePercent - metricheYoY.occupazionePercent) * 10) / 10,
    prenotazioni: delta(metriche.numPrenotazioni, metricheYoY.numPrenotazioni),
    revpar: delta(metriche.revpar, metricheYoY.revpar),
    adr: delta(metriche.adr, metricheYoY.adr),
    prevRevenue: metricheYoY.revenueTotale,
    prevOccupazione: metricheYoY.occupazionePercent,
    prevPrenotazioni: metricheYoY.numPrenotazioni,
  }

  // Forecast prossimi 30 giorni
  const giorniForecast = eachDayOfInterval({ start: oggi, end: fra30gg })
  const forecastGiorni: { data: string; occupate: number; totale: number }[] = giorniForecast.map(giorno => {
    let occupate = 0
    for (const p of prenotazioniFuture) {
      const arrivo = startOfDay(new Date(p.dataArrivo))
      const partenza = p.dataPartenza ? startOfDay(new Date(p.dataPartenza)) : addDays(arrivo, 1)
      if (arrivo <= giorno && partenza > giorno) occupate++
    }
    return { data: giorno.toISOString().split('T')[0], occupate, totale: unitaTotali }
  })

  const forecastMediaOccupazione = unitaTotali > 0
    ? Math.round(
        (forecastGiorni.reduce((s, g) => s + g.occupate, 0) / (forecastGiorni.length * unitaTotali)) * 1000
      ) / 10
    : 0

  const forecastNottiPrenotate = forecastGiorni.reduce((s, g) => s + g.occupate, 0)

  // Revenue giornaliero (per grafico a barre)
  const revenuePerGiorno = giorniMese.map(giorno => {
    let r = 0
    for (const p of prenotazioni) {
      const arrivo = startOfDay(new Date(p.dataArrivo))
      const partenza = p.dataPartenza ? startOfDay(new Date(p.dataPartenza)) : fineMese
      if (arrivo <= giorno && partenza > giorno && p.prezzoTotale) {
        const nottiTotali = p.dataPartenza
          ? Math.round((new Date(p.dataPartenza).getTime() - new Date(p.dataArrivo).getTime()) / 86400000)
          : 1
        r += p.prezzoTotale / nottiTotali
      }
    }
    return { data: giorno.toISOString().split('T')[0], revenue: Math.round(r * 100) / 100 }
  })

  return NextResponse.json({
    anno,
    mese,
    numGiorni,
    unitaTotali,
    ...metriche,
    cancellazionePct,
    cancellazioni,
    revenuePerGiorno,
    confronto,
    confrontoYoY,
    forecast: {
      giorni: forecastGiorni,
      mediaOccupazione: forecastMediaOccupazione,
      nottiPrenotate: forecastNottiPrenotate,
      capacitaTotale: forecastGiorni.length * unitaTotali,
    },
  })
}
