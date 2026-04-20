import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireHost, isUnauthorized } from '@/lib/auth-middleware'

export const dynamic = 'force-dynamic'

/**
 * GET /api/host/calendario?da=YYYY-MM-DD&a=YYYY-MM-DD&strutturaId=xxx
 *
 * Aggregate per vista planning orizzontale.
 * Ritorna unità + prenotazioni + blocchi OTA + tariffe + chiusure.
 */
export async function GET(req: NextRequest) {
  const auth = await requireHost()
  if (isUnauthorized(auth)) return auth

  const sp = req.nextUrl.searchParams
  const daStr = sp.get('da')
  const aStr = sp.get('a')
  const strutturaId = sp.get('strutturaId')

  if (!daStr || !aStr) {
    return NextResponse.json({ error: 'Parametri da e a obbligatori' }, { status: 400 })
  }
  const da = parseYMD(daStr)
  const a = parseYMD(aStr)
  if (!da || !a || da >= a) {
    return NextResponse.json({ error: 'Date non valide' }, { status: 400 })
  }

  const hostId = auth.user.hostId
  const struttureWhere: { hostId: string; id?: string; attiva: boolean } = { hostId, attiva: true }
  if (strutturaId) struttureWhere.id = strutturaId

  // Unità (tutte le strutture attive del host, o filtro struttura)
  const unita = await prisma.unitaPrenotabile.findMany({
    where: {
      attiva: true,
      struttura: struttureWhere,
    },
    select: {
      id: true,
      nome: true,
      piano: true,
      statoHK: true,
      capacita: true,
      strutturaId: true,
      struttura: { select: { nome: true } },
    },
    orderBy: [{ strutturaId: 'asc' }, { piano: 'asc' }, { nome: 'asc' }],
  })

  const unitaIds = unita.map((u) => u.id)

  // Prenotazioni sovrapposte al range
  const prenotazioni = await prisma.prenotazione.findMany({
    where: {
      hostId,
      deletedAt: null,
      unitaId: { in: unitaIds },
      stato: { in: ['CONFERMATA', 'RICHIESTA', 'NO_SHOW', 'COMPLETATA'] },
      dataArrivo: { lt: a },
      OR: [
        { dataPartenza: null, dataArrivo: { gte: da } },
        { dataPartenza: { gt: da } },
      ],
    },
    select: {
      id: true,
      unitaId: true,
      guestNome: true,
      guestCognome: true,
      dataArrivo: true,
      dataPartenza: true,
      stato: true,
      fonte: true,
      numOspiti: true,
      statoCheckIn: true,
    },
    orderBy: { dataArrivo: 'asc' },
  })

  // Blocchi OTA (PrenotazioneCanale) — canali attivi della struttura, per-unita o struttura-wide
  const canali = await prisma.canaleEsterno.findMany({
    where: { attivo: true, struttura: struttureWhere },
    select: { id: true, nome: true, colore: true, unitaId: true, strutturaId: true },
  })

  const blocchiRaw = await prisma.prenotazioneCanale.findMany({
    where: {
      canaleId: { in: canali.map((c) => c.id) },
      dataInizio: { lt: a },
      dataFine: { gt: da },
    },
    select: {
      id: true, canaleId: true, sommario: true, dataInizio: true, dataFine: true,
    },
  })

  // Espandi blocchi struttura-wide: appaiono su TUTTE le unità della struttura del canale
  type Blocco = {
    id: string
    unitaId: string
    dataInizio: Date
    dataFine: Date
    canaleNome: string
    canaleColore: string
    sommario: string
  }
  const blocchiOTA: Blocco[] = []
  for (const b of blocchiRaw) {
    const c = canali.find((cc) => cc.id === b.canaleId)
    if (!c) continue
    if (c.unitaId) {
      blocchiOTA.push({
        id: b.id, unitaId: c.unitaId,
        dataInizio: b.dataInizio, dataFine: b.dataFine,
        canaleNome: c.nome, canaleColore: c.colore,
        sommario: b.sommario,
      })
    } else {
      // Struttura-wide: il blocco si applica a tutte le unità della struttura
      for (const u of unita.filter((x) => x.strutturaId === c.strutturaId)) {
        blocchiOTA.push({
          id: `${b.id}-${u.id}`, unitaId: u.id,
          dataInizio: b.dataInizio, dataFine: b.dataFine,
          canaleNome: c.nome, canaleColore: c.colore,
          sommario: b.sommario,
        })
      }
    }
  }

  // TariffaPeriodo nel range
  const tariffe = await prisma.tariffaPeriodo.findMany({
    where: {
      unitaId: { in: unitaIds },
      dataInizio: { lt: a },
      dataFine: { gte: da },
    },
    select: { id: true, unitaId: true, nome: true, prezzo: true, dataInizio: true, dataFine: true, colore: true },
  })

  // Chiusure (Disponibilita.chiuso = true) nel range
  const chiusure = await prisma.disponibilita.findMany({
    where: {
      unitaId: { in: unitaIds },
      chiuso: true,
      data: { gte: da, lt: a },
    },
    select: { unitaId: true, data: true },
  })

  // Canali per legenda (distinct nomi in uso)
  const canaliLegend = canali.map((c) => ({ nome: c.nome, colore: c.colore }))

  return NextResponse.json({
    da: daStr,
    a: aStr,
    unita: unita.map((u) => ({
      id: u.id,
      nome: u.nome,
      piano: u.piano,
      statoHK: u.statoHK,
      capacita: u.capacita,
      strutturaId: u.strutturaId,
      strutturaNome: u.struttura.nome,
    })),
    prenotazioni,
    blocchiOTA,
    tariffe,
    chiusure,
    canaliLegend,
  })
}

function parseYMD(s: string): Date | null {
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!m) return null
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
  d.setHours(0, 0, 0, 0)
  return isNaN(d.getTime()) ? null : d
}
