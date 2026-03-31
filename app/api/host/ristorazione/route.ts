import { NextRequest, NextResponse } from 'next/server'
import { requireHost, isUnauthorized } from '@/lib/auth-middleware'
import { prisma } from '@/lib/db'
import { startOfDay, endOfDay, format } from 'date-fns'

/**
 * GET /api/host/ristorazione?data=2026-03-31
 * Report coperti previsti per data — usato dalla cucina/sala.
 * Conta quanti ospiti hanno colazione, pranzo, cena in base ai piani pasto.
 */
export async function GET(req: NextRequest) {
  const auth = await requireHost()
  if (isUnauthorized(auth)) return auth

  const sp = req.nextUrl.searchParams
  const dataStr = sp.get('data') || format(new Date(), 'yyyy-MM-dd')
  const data = new Date(dataStr + 'T12:00:00')
  const giorno = startOfDay(data)

  // Prenotazioni attive in quella data (arrivo <= data < partenza)
  const prenotazioni = await prisma.prenotazione.findMany({
    where: {
      hostId: auth.user.hostId,
      stato: { in: ['CONFERMATA', 'COMPLETATA'] },
      dataArrivo: { lte: endOfDay(data) },
      OR: [
        { dataPartenza: { gt: giorno } },
        { dataPartenza: null },
      ],
    },
    select: {
      id: true,
      guestNome: true,
      guestCognome: true,
      numOspiti: true,
      dataArrivo: true,
      dataPartenza: true,
      unita: { select: { nome: true } },
      struttura: { select: { nome: true } },
      pianoPasto: true,
    },
  })

  // Calcola pasti per ogni prenotazione
  const PIANI_PASTI: Record<string, string[]> = {
    SOLO_PERNOTTAMENTO: [],
    PERNOTTAMENTO_COLAZIONE: ['COLAZIONE'],
    MEZZA_PENSIONE: ['COLAZIONE', 'CENA'],
    PENSIONE_COMPLETA: ['COLAZIONE', 'PRANZO', 'CENA'],
    ALL_INCLUSIVE: ['COLAZIONE', 'PRANZO', 'CENA'],
  }

  let totaleColazione = 0
  let totalePranzo = 0
  let totaleCena = 0

  const dettaglio = prenotazioni.map(p => {
    const piano = p.pianoPasto?.piano || 'PERNOTTAMENTO_COLAZIONE' // default B&B
    const pastiBase = new Set(PIANI_PASTI[piano] || ['COLAZIONE'])

    // Apply extra/esclusi
    if (p.pianoPasto?.pastiExtra) {
      for (const e of p.pianoPasto.pastiExtra) pastiBase.add(e)
    }
    if (p.pianoPasto?.pastiEsclusi) {
      for (const e of p.pianoPasto.pastiEsclusi) pastiBase.delete(e)
    }

    const haColazione = pastiBase.has('COLAZIONE')
    const haPranzo = pastiBase.has('PRANZO')
    const haCena = pastiBase.has('CENA')

    if (haColazione) totaleColazione += p.numOspiti
    if (haPranzo) totalePranzo += p.numOspiti
    if (haCena) totaleCena += p.numOspiti

    return {
      id: p.id,
      ospite: `${p.guestCognome} ${p.guestNome}`,
      camera: p.unita?.nome || '—',
      struttura: p.struttura?.nome || '—',
      numOspiti: p.numOspiti,
      piano,
      colazione: haColazione,
      pranzo: haPranzo,
      cena: haCena,
      note: p.pianoPasto?.note || null,
    }
  })

  return NextResponse.json({
    data: dataStr,
    prenotazioniAttive: prenotazioni.length,
    coperti: {
      colazione: totaleColazione,
      pranzo: totalePranzo,
      cena: totaleCena,
    },
    dettaglio,
  })
}
