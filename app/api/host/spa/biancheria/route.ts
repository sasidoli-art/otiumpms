import { NextRequest, NextResponse } from 'next/server'
import { requireHost, isUnauthorized } from '@/lib/auth-middleware'
import { prisma } from '@/lib/db'
import { startOfDay, endOfDay, addDays, format } from 'date-fns'

/**
 * GET /api/host/spa/biancheria?data=2026-04-01
 * Calcola biancheria/prodotti SPA necessari per gli appuntamenti di una data.
 * Basato sulla dotazione configurabile per cabina.
 */
export async function GET(req: NextRequest) {
  const auth = await requireHost()
  if (isUnauthorized(auth)) return auth

  const dataStr = req.nextUrl.searchParams.get('data') || format(addDays(new Date(), 1), 'yyyy-MM-dd')
  const data = new Date(dataStr + 'T12:00')
  const giorno = startOfDay(data)
  const fineGiorno = endOfDay(data)

  // Appuntamenti del giorno con cabina e dotazione
  const appuntamenti = await prisma.appuntamentoSpa.findMany({
    where: {
      hostId: auth.user.hostId,
      stato: { in: ['CONFERMATO', 'PRENOTATO'] },
      dataOra: { gte: giorno, lte: fineGiorno },
      cabinaId: { not: null },
    },
    select: {
      id: true,
      guestNome: true,
      guestCognome: true,
      dataOra: true,
      durata: true,
      cabina: {
        select: {
          id: true, nome: true,
          dotazione: { orderBy: { categoria: 'asc' } },
        },
      },
      trattamento: { select: { nome: true } },
      terapista: { select: { nome: true, cognome: true } },
    },
    orderBy: { dataOra: 'asc' },
  })

  // Dettaglio per appuntamento
  const dettaglio = appuntamenti.map(a => ({
    appuntamentoId: a.id,
    orario: format(new Date(a.dataOra), 'HH:mm'),
    ospite: `${a.guestCognome} ${a.guestNome}`,
    cabina: a.cabina?.nome || '—',
    trattamento: a.trattamento?.nome || '—',
    terapista: a.terapista ? `${a.terapista.nome} ${a.terapista.cognome}` : '—',
    articoli: (a.cabina?.dotazione || []).map(d => ({
      nome: d.articolo,
      quantita: d.quantita,
      categoria: d.categoria,
    })),
  }))

  // Totali aggregati per articolo
  const totaliMap: Record<string, { quantita: number; categoria: string }> = {}
  for (const d of dettaglio) {
    for (const art of d.articoli) {
      if (!totaliMap[art.nome]) totaliMap[art.nome] = { quantita: 0, categoria: art.categoria }
      totaliMap[art.nome].quantita += art.quantita
    }
  }

  const totali = Object.entries(totaliMap)
    .map(([nome, { quantita, categoria }]) => ({ nome, quantita, categoria }))
    .sort((a, b) => a.categoria.localeCompare(b.categoria) || a.nome.localeCompare(b.nome))

  // Stato HK cabine
  const cabine = await prisma.cabinaSpa.findMany({
    where: { hostId: auth.user.hostId, attiva: true },
    select: { id: true, nome: true, statoHK: true, ultimaPulizia: true, noteHK: true },
  })

  return NextResponse.json({
    data: dataStr,
    appuntamentiTotali: appuntamenti.length,
    dettaglio,
    totali,
    cabine,
  })
}
