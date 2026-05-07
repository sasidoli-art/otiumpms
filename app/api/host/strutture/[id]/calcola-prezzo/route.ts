import { NextRequest, NextResponse } from 'next/server'
import { requireHostOrAdmin, isUnauthorized } from '@/lib/auth-middleware'
import { prisma } from '@/lib/db'

/** Converte un Date in intero MMGG (es. 15 giugno → 0615) per confronto stagionale */
function mmgg(data: Date) {
  return (data.getMonth() + 1) * 100 + data.getDate()
}

/** Giorno ISO: 0=Lun … 6=Dom */
function isoDay(data: Date) {
  return (data.getDay() + 6) % 7
}

type RegolaTariffa = {
  attiva: boolean
  unitaId: string | null
  tipo: string
  modificatore: string
  valore: number
  priorita: number
  meseInizio: number | null
  giornoInizio: number | null
  meseFine: number | null
  giornoFine: number | null
  giorniSettimana: number[]
}

type TariffaPeriodo = {
  unitaId: string
  dataInizio: Date
  dataFine: Date
  prezzo: number
}

function regolaMatches(r: RegolaTariffa, data: Date, unitaId: string): boolean {
  if (!r.attiva) return false
  if (r.unitaId !== null && r.unitaId !== unitaId) return false

  if (r.tipo === 'WEEKEND') {
    return r.giorniSettimana.includes(isoDay(data))
  }
  if (r.tipo === 'STAGIONE') {
    const { meseInizio, giornoInizio, meseFine, giornoFine } = r
    if (!meseInizio || !meseFine || !giornoInizio || !giornoFine) return false
    const cur = mmgg(data)
    const start = meseInizio * 100 + giornoInizio
    const end = meseFine * 100 + giornoFine
    return start <= end ? cur >= start && cur <= end : cur >= start || cur <= end
  }
  if (r.tipo === 'FESTIVO') {
    if (r.giorniSettimana.length > 0) return r.giorniSettimana.includes(isoDay(data))
  }
  return false
}

function calcolaPrezzoNotte(
  data: Date,
  prezzoBase: number,
  tariffe: TariffaPeriodo[],
  regole: RegolaTariffa[],
  unitaId: string,
): number {
  // Usa TariffaPeriodo come override del prezzo base
  const tariffa = tariffe.find(
    t => t.unitaId === unitaId && t.dataInizio <= data && t.dataFine >= data,
  )
  let prezzo = tariffa ? tariffa.prezzo : prezzoBase

  // Applica le regole attive in ordine di priorità (tutte sommate)
  const attive = regole
    .filter(r => regolaMatches(r, data, unitaId))
    .sort((a, b) => b.priorita - a.priorita)

  for (const r of attive) {
    if (r.modificatore === 'PERCENTUALE') {
      prezzo += prezzo * (r.valore / 100)
    } else {
      prezzo += r.valore
    }
  }

  return prezzo
}

/**
 * GET /api/host/strutture/[id]/calcola-prezzo
 * ?unitaId=xxx&dataArrivo=YYYY-MM-DD&dataPartenza=YYYY-MM-DD
 *
 * Risposta: { prezzoTotale, notti, dettaglio: [{data, prezzo}] }
 */
export async function GET(
  req: NextRequest,
  { params: paramsPromise }: { params: Promise<{ id: string }> },
) {
  const params = await paramsPromise
  const auth = await requireHostOrAdmin()
  if (isUnauthorized(auth)) return auth

  const { searchParams } = new URL(req.url)
  const unitaId = searchParams.get('unitaId')
  const dataArrivoStr = searchParams.get('dataArrivo')
  const dataPartenzaStr = searchParams.get('dataPartenza')

  if (!unitaId || !dataArrivoStr || !dataPartenzaStr) {
    return NextResponse.json({ error: 'Parametri mancanti: unitaId, dataArrivo, dataPartenza' }, { status: 400 })
  }

  const dataArrivo = new Date(dataArrivoStr)
  const dataPartenza = new Date(dataPartenzaStr)

  if (isNaN(dataArrivo.getTime()) || isNaN(dataPartenza.getTime()) || dataPartenza <= dataArrivo) {
    return NextResponse.json({ error: 'Date non valide' }, { status: 400 })
  }

  // Verifica ownership
  const struttura = await prisma.struttura.findFirst({
    where: { id: params.id, hostId: auth.user.hostId },
  })
  if (!struttura) return NextResponse.json({ error: 'Non trovato' }, { status: 404 })

  const unita = await prisma.unitaPrenotabile.findFirst({
    where: { id: unitaId, strutturaId: params.id },
    select: { prezzoBase: true },
  })
  if (!unita) return NextResponse.json({ error: 'Unità non trovata' }, { status: 404 })

  const [tariffe, regole] = await Promise.all([
    prisma.tariffaPeriodo.findMany({
      where: { unitaId },
      select: { unitaId: true, dataInizio: true, dataFine: true, prezzo: true },
    }),
    prisma.regolaTariffa.findMany({
      where: { strutturaId: params.id, attiva: true },
      select: {
        attiva: true, unitaId: true, tipo: true, modificatore: true,
        valore: true, priorita: true,
        meseInizio: true, giornoInizio: true, meseFine: true, giornoFine: true,
        giorniSettimana: true,
      },
    }),
  ])

  // Itera ogni notte
  const dettaglio: { data: string; prezzoBase: number; prezzoFinale: number }[] = []
  const current = new Date(dataArrivo)
  current.setHours(12, 0, 0, 0)
  const fine = new Date(dataPartenza)
  fine.setHours(12, 0, 0, 0)

  while (current < fine) {
    const prezzoNotte = calcolaPrezzoNotte(current, unita.prezzoBase, tariffe, regole, unitaId)
    dettaglio.push({
      data: current.toISOString().slice(0, 10),
      prezzoBase: unita.prezzoBase,
      prezzoFinale: Math.round(prezzoNotte * 100) / 100,
    })
    current.setDate(current.getDate() + 1)
  }

  const prezzoTotale = Math.round(dettaglio.reduce((s, n) => s + n.prezzoFinale, 0) * 100) / 100

  return NextResponse.json({
    prezzoTotale,
    notti: dettaglio.length,
    dettaglio,
  })
}
