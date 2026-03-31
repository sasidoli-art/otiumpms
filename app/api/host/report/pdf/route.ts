import { NextRequest, NextResponse } from 'next/server'
import { requireHostOrAdmin, isUnauthorized } from '@/lib/auth-middleware'
import { prisma } from '@/lib/db'
import { generateReportPdf } from '@/lib/pdf-generator'
import { startOfMonth, endOfMonth, eachDayOfInterval, startOfDay, subMonths, subYears, addDays } from 'date-fns'

export async function GET(req: NextRequest) {
  const auth = await requireHostOrAdmin()
  if (isUnauthorized(auth)) return auth

  const sp = req.nextUrl.searchParams
  const anno = parseInt(sp.get('anno') ?? String(new Date().getFullYear()))
  const mese = parseInt(sp.get('mese') ?? String(new Date().getMonth() + 1))

  if (isNaN(anno) || isNaN(mese) || mese < 1 || mese > 12) {
    return NextResponse.json({ error: 'Parametri non validi' }, { status: 400 })
  }

  const hostId = auth.user.hostId
  const inizioMese = startOfMonth(new Date(anno, mese - 1, 1))
  const fineMese = endOfMonth(new Date(anno, mese - 1, 1))
  const giorniMese = eachDayOfInterval({ start: inizioMese, end: fineMese })
  const numGiorni = giorniMese.length

  const [host, unitaTotali] = await Promise.all([
    prisma.host.findUnique({ where: { id: hostId }, select: { nomeAzienda: true } }),
    prisma.unitaPrenotabile.count({ where: { struttura: { hostId } } }),
  ])

  const prenotazioni = await prisma.prenotazione.findMany({
    where: {
      hostId,
      stato: { in: ['CONFERMATA', 'COMPLETATA'] },
      OR: [
        { dataArrivo: { gte: inizioMese, lte: fineMese } },
        { dataPartenza: { gte: inizioMese, lte: fineMese } },
        { dataArrivo: { lte: inizioMese }, dataPartenza: { gte: fineMese } },
      ],
    },
    include: { struttura: { select: { id: true, nome: true } } },
  })

  // Calcola metriche
  let nottiOccupate = 0
  let revenueTotale = 0
  let totalNotti = 0
  const perStruttura: Record<string, { nome: string; prenotazioni: number; notti: number; revenue: number }> = {}
  const perFonte: Record<string, { prenotazioni: number; revenue: number }> = {}
  const revenuePerGiorno = giorniMese.map(() => 0)

  for (const p of prenotazioni) {
    const arrivo = startOfDay(new Date(p.dataArrivo))
    const partenza = p.dataPartenza ? startOfDay(new Date(p.dataPartenza)) : fineMese
    const start = arrivo < inizioMese ? inizioMese : arrivo
    const end = partenza > fineMese ? fineMese : partenza
    const notti = Math.max(0, Math.round((end.getTime() - start.getTime()) / 86400000))
    nottiOccupate += notti

    const nottiTotali = p.dataPartenza
      ? Math.max(1, Math.round((new Date(p.dataPartenza).getTime() - new Date(p.dataArrivo).getTime()) / 86400000))
      : notti
    totalNotti += nottiTotali
    const rev = p.prezzoTotale && nottiTotali > 0 ? (p.prezzoTotale * notti) / nottiTotali : 0
    revenueTotale += rev

    if (p.struttura) {
      const sid = p.struttura.id
      if (!perStruttura[sid]) perStruttura[sid] = { nome: p.struttura.nome, prenotazioni: 0, notti: 0, revenue: 0 }
      perStruttura[sid].prenotazioni++
      perStruttura[sid].notti += notti
      perStruttura[sid].revenue += rev
    }

    const fonte = p.fonte || 'Diretto'
    if (!perFonte[fonte]) perFonte[fonte] = { prenotazioni: 0, revenue: 0 }
    perFonte[fonte].prenotazioni++
    perFonte[fonte].revenue += rev

    for (let i = 0; i < giorniMese.length; i++) {
      if (arrivo <= giorniMese[i] && partenza > giorniMese[i] && p.prezzoTotale && nottiTotali > 0) {
        revenuePerGiorno[i] += p.prezzoTotale / nottiTotali
      }
    }
  }

  const capacita = unitaTotali * numGiorni
  const occupazione = capacita > 0 ? Math.round((nottiOccupate / capacita) * 1000) / 10 : 0
  const revpar = unitaTotali > 0 ? Math.round((revenueTotale / capacita) * 100) / 100 : 0
  const adr = nottiOccupate > 0 ? Math.round((revenueTotale / nottiOccupate) * 100) / 100 : 0
  const durataMedia = prenotazioni.length > 0 ? Math.round((totalNotti / prenotazioni.length) * 10) / 10 : 0

  const cancellazioni = await prisma.prenotazione.count({
    where: { hostId, stato: { in: ['ANNULLATA', 'NO_SHOW'] }, updatedAt: { gte: inizioMese, lte: fineMese } },
  })
  const totalePren = prenotazioni.length + cancellazioni
  const cancellazionePct = totalePren > 0 ? Math.round((cancellazioni / totalePren) * 1000) / 10 : 0

  try {
    const pdf = await generateReportPdf({
      anno, mese, numGiorni, unitaTotali,
      nomeAzienda: host?.nomeAzienda ?? 'Otium Week',
      revenueTotale, nottiOccupate, capacita, occupazione, revpar, adr,
      numPrenotazioni: prenotazioni.length, durataMedia, cancellazionePct,
      revenuePerGiorno,
      strutture: Object.values(perStruttura).sort((a, b) => b.revenue - a.revenue),
      perFonte: Object.entries(perFonte).map(([fonte, d]) => ({ fonte, ...d })).sort((a, b) => b.revenue - a.revenue),
    })

    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="report_${anno}_${String(mese).padStart(2, '0')}.pdf"`,
      },
    })
  } catch (err) {
    console.error('PDF generation error:', err)
    return NextResponse.json({ error: 'Errore generazione PDF' }, { status: 500 })
  }
}
