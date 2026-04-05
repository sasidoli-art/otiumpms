import { NextRequest, NextResponse } from 'next/server'
import { requireHost, isUnauthorized } from '@/lib/auth-middleware'
import { auditFromAuth } from '@/lib/audit'
import { prisma } from '@/lib/db'

// ─── GET: Report cassa per range di date ─────────────────────────────────────

export async function GET(req: NextRequest) {
  const auth = await requireHost()
  if (isUnauthorized(auth)) return auth

  const sp = req.nextUrl.searchParams
  const dataFrom = sp.get('dataFrom')
  const dataTo = sp.get('dataTo')

  if (!dataFrom || !dataTo) {
    return NextResponse.json(
      { error: 'Parametri dataFrom e dataTo obbligatori' },
      { status: 422 },
    )
  }

  const from = new Date(dataFrom)
  const to = new Date(dataTo)
  to.setDate(to.getDate() + 1) // inclusivo del giorno finale

  const hostId = auth.user.hostId

  // ── Carica tutti gli incassi del range ─────────────────────────────────────

  const incassi = await prisma.incasso.findMany({
    where: {
      hostId,
      data: { gte: from, lt: to },
    },
    orderBy: { data: 'asc' },
  })

  // ── 1. Totale per metodo pagamento ─────────────────────────────────────────

  const totalePerMetodo: Record<string, number> = {
    CONTANTI: 0,
    CARTA: 0,
    CAMERA_CREDIT: 0,
    GIFT_CARD: 0,
    BONIFICO: 0,
    MISTO: 0,
  }

  // ── 2. Dettaglio carta ─────────────────────────────────────────────────────

  const dettaglioCarta: Record<string, number> = {
    VISA: 0,
    MASTERCARD: 0,
    AMEX: 0,
    BANCOMAT: 0,
    MAESTRO: 0,
    ALTRO: 0,
  }

  // ── 3. Totale per origine ──────────────────────────────────────────────────

  const totalePerOrigine: Record<string, number> = {
    PRENOTAZIONE: 0,
    POS: 0,
    SPA: 0,
    RISTORAZIONE: 0,
    GIFT_CARD: 0,
    ALTRO: 0,
  }

  // ── 4. Totale per operatore ────────────────────────────────────────────────

  const totalePerOperatore: Record<string, number> = {}

  // ── 5. Trend giornaliero ───────────────────────────────────────────────────

  const trendMap: Record<string, { totale: number; contanti: number; carta: number }> = {}

  let totaleComplessivo = 0

  for (const inc of incassi) {
    const importo = inc.importo
    totaleComplessivo += importo

    // Per metodo
    totalePerMetodo[inc.metodo] = (totalePerMetodo[inc.metodo] || 0) + importo

    // Dettaglio carta
    if (inc.metodo === 'CARTA' && inc.tipoCarta) {
      dettaglioCarta[inc.tipoCarta] = (dettaglioCarta[inc.tipoCarta] || 0) + importo
    }

    // Per origine
    totalePerOrigine[inc.origine] = (totalePerOrigine[inc.origine] || 0) + importo

    // Per operatore
    totalePerOperatore[inc.operatore] = (totalePerOperatore[inc.operatore] || 0) + importo

    // Trend giornaliero
    const dataKey = inc.data.toISOString().slice(0, 10)
    if (!trendMap[dataKey]) {
      trendMap[dataKey] = { totale: 0, contanti: 0, carta: 0 }
    }
    trendMap[dataKey].totale += importo
    if (inc.metodo === 'CONTANTI') trendMap[dataKey].contanti += importo
    if (inc.metodo === 'CARTA') trendMap[dataKey].carta += importo
  }

  const trendGiornaliero = Object.entries(trendMap)
    .map(([data, vals]) => ({ data, ...vals }))
    .sort((a, b) => a.data.localeCompare(b.data))

  // ── 6. Transazioni POS per tipo (vendita, reso, sconto) ────────────────────

  const transazioniPOS = await prisma.transazionePOS.findMany({
    where: {
      hostId,
      createdAt: { gte: from, lt: to },
      stato: 'COMPLETATA',
    },
    select: { tipo: true },
  })

  const transazioniPerTipo: Record<string, number> = {
    VENDITA: 0,
    RESO: 0,
    SCONTO: 0,
  }
  for (const t of transazioniPOS) {
    transazioniPerTipo[t.tipo] = (transazioniPerTipo[t.tipo] || 0) + 1
  }

  // ── 7. Differenze cassa (chiusure con differenza ≠ 0) ─────────────────────

  const differenzeCassa = await prisma.chiusuraCassa.findMany({
    where: {
      hostId,
      data: { gte: from, lt: to },
      differenza: { not: null },
      NOT: { differenza: 0 },
    },
    select: {
      id: true,
      data: true,
      turno: true,
      operatore: true,
      differenza: true,
      fondoCassaInizio: true,
      fondoCassaFine: true,
      totaleContanti: true,
      noteRiconciliazione: true,
    },
    orderBy: { data: 'desc' },
  })

  return NextResponse.json({
    periodo: { from: dataFrom, to: dataTo },
    totaleComplessivo,
    totalePerMetodo,
    dettaglioCarta,
    totalePerOrigine,
    totalePerOperatore,
    transazioniPerTipo,
    trendGiornaliero,
    differenzeCassa,
    numIncassi: incassi.length,
    numTransazioniPOS: transazioniPOS.length,
  })
}
