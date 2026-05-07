import { NextRequest, NextResponse } from 'next/server'
import { requireHostOrAdmin, isUnauthorized } from '@/lib/auth-middleware'
import { prisma } from '@/lib/db'
import { startOfMonth, endOfMonth } from 'date-fns'

/**
 * GET /api/host/report/tassa-soggiorno?anno=2026&mese=3
 * Report mensile tassa di soggiorno per invio al comune.
 * Calcola totale tassa per ospite, per struttura, con dettaglio notti.
 */
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
  const inizio = startOfMonth(new Date(anno, mese - 1, 1))
  const fine = endOfMonth(new Date(anno, mese - 1, 1))

  const prenotazioni = await prisma.prenotazione.findMany({
    where: {
      hostId,
      stato: { in: ['CONFERMATA', 'COMPLETATA'] },
      tassaSoggiorno: { not: null },
      OR: [
        { dataArrivo: { gte: inizio, lte: fine } },
        { dataPartenza: { gte: inizio, lte: fine } },
        { dataArrivo: { lte: inizio }, dataPartenza: { gte: fine } },
      ],
    },
    select: {
      id: true,
      guestNome: true,
      guestCognome: true,
      dataArrivo: true,
      dataPartenza: true,
      numOspiti: true,
      tassaSoggiorno: true,
      struttura: { select: { id: true, nome: true, citta: true } },
      unita: { select: { nome: true } },
      accompagnatori: { select: { id: true } },
    },
    orderBy: { dataArrivo: 'asc' },
  })

  // Calcola notti nel mese e totale tassa per ogni prenotazione
  const dettaglio = prenotazioni.map(p => {
    const arrivo = new Date(p.dataArrivo)
    const partenza = p.dataPartenza ? new Date(p.dataPartenza) : new Date(arrivo.getTime() + 86400000)
    const start = arrivo < inizio ? inizio : arrivo
    const end = partenza > fine ? fine : partenza
    const nottiNelMese = Math.max(0, Math.round((end.getTime() - start.getTime()) / 86400000))
    const totalePersone = p.numOspiti // include titolare + accompagnatori
    const tassaPerNotte = p.tassaSoggiorno ?? 0
    const totaleTassa = tassaPerNotte * nottiNelMese * totalePersone

    return {
      id: p.id,
      ospite: `${p.guestCognome} ${p.guestNome}`,
      struttura: p.struttura?.nome ?? '—',
      strutturaCitta: p.struttura?.citta ?? '—',
      unita: p.unita?.nome ?? '—',
      arrivo: p.dataArrivo,
      partenza: p.dataPartenza,
      nottiNelMese,
      numOspiti: totalePersone,
      tassaPerNotte,
      totaleTassa: Math.round(totaleTassa * 100) / 100,
    }
  })

  // Aggregazione per struttura
  const perStruttura: Record<string, { nome: string; citta: string; ospiti: number; notti: number; totale: number }> = {}
  for (const d of dettaglio) {
    const key = d.struttura
    if (!perStruttura[key]) perStruttura[key] = { nome: d.struttura, citta: d.strutturaCitta, ospiti: 0, notti: 0, totale: 0 }
    perStruttura[key].ospiti += d.numOspiti
    perStruttura[key].notti += d.nottiNelMese
    perStruttura[key].totale += d.totaleTassa
  }

  const totaleGenerale = dettaglio.reduce((s, d) => s + d.totaleTassa, 0)
  const totaleNotti = dettaglio.reduce((s, d) => s + d.nottiNelMese, 0)
  const totaleOspiti = dettaglio.reduce((s, d) => s + d.numOspiti, 0)

  return NextResponse.json({
    anno,
    mese,
    dettaglio,
    perStruttura: Object.values(perStruttura),
    riepilogo: {
      prenotazioni: dettaglio.length,
      totaleOspiti,
      totaleNotti,
      totaleTassa: Math.round(totaleGenerale * 100) / 100,
    },
  })
}
