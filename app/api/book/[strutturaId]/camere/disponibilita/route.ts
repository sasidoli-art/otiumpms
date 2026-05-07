import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { calcolaPrezzoBreakdown, type RegolaTariffa as PricingRegola, type PriceBreakdown } from '@/lib/pricing'
import { checkRateLimit } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

/**
 * GET /api/book/[strutturaId]/camere/disponibilita
 * Query: ?arrivo=YYYY-MM-DD&partenza=YYYY-MM-DD&adulti=2&bambini=0
 * Rate: 60/min (public:search)
 * Cache-Control: max-age=30
 *
 * Ritorna: { struttura, ricerca, camere: CameraDisponibile[], suggerimenti }
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ strutturaId: string }> },
) {
  const blocked = checkRateLimit(req, 'public:search')
  if (blocked) return blocked

  const { strutturaId } = await params
  const sp = req.nextUrl.searchParams
  const arrivoStr = sp.get('arrivo')
  const partenzaStr = sp.get('partenza')
  const adulti = Math.max(1, parseInt(sp.get('adulti') ?? '1'))
  const bambini = Math.max(0, parseInt(sp.get('bambini') ?? '0'))

  if (!arrivoStr || !partenzaStr) {
    return NextResponse.json({ error: 'arrivo e partenza richiesti' }, { status: 400 })
  }

  const arrivo = parseYMD(arrivoStr)
  const partenza = parseYMD(partenzaStr)
  if (!arrivo || !partenza) {
    return NextResponse.json({ error: 'date non valide' }, { status: 400 })
  }

  const notti = Math.round((partenza.getTime() - arrivo.getTime()) / 86400000)
  if (notti < 1 || notti > 30) {
    return NextResponse.json({ error: 'durata soggiorno non valida (1-30 notti)' }, { status: 400 })
  }

  const oggi = new Date(); oggi.setHours(0, 0, 0, 0)
  if (arrivo < oggi) {
    return NextResponse.json({ error: 'data di arrivo nel passato' }, { status: 400 })
  }

  const struttura = await prisma.struttura.findFirst({
    where: { id: strutturaId, attiva: true },
    select: {
      id: true, nome: true, citta: true, logo: true, colorePrimario: true,
      tassaSoggiornoPerNotte: true,
    },
  })
  if (!struttura) {
    return NextResponse.json({ error: 'Struttura non trovata' }, { status: 404 })
  }

  const totOspiti = adulti + bambini
  const tassaPerNotte = struttura.tassaSoggiornoPerNotte ?? 0

  // Carica regole tariffa struttura
  const regoleDb = await prisma.regolaTariffa.findMany({
    where: { strutturaId, attiva: true },
  })
  const regolePricing: PricingRegola[] = regoleDb.map((r) => ({
    id: r.id,
    nome: r.nome,
    tipo: r.tipo as PricingRegola['tipo'],
    attiva: r.attiva,
    priorita: r.priorita,
    modificatore: r.modificatore as 'PERCENTUALE' | 'FISSO',
    valore: r.valore,
    unitaId: r.unitaId,
    meseInizio: r.meseInizio,
    giornoInizio: r.giornoInizio,
    meseFine: r.meseFine,
    giornoFine: r.giornoFine,
    giorniSettimana: r.giorniSettimana,
    nottiMinime: r.nottiMinime ?? null,
    giorniMinimi: r.giorniMinimi ?? null,
    giorniMassimi: r.giorniMassimi ?? null,
  }))

  // Carica unità con tariffe periodo e blocchi
  const unita = await prisma.unitaPrenotabile.findMany({
    where: { strutturaId, attiva: true },
    include: {
      tariffe: {
        where: { dataInizio: { lte: partenza }, dataFine: { gte: arrivo } },
      },
      disponibilita: {
        where: { data: { gte: arrivo, lt: partenza } },
      },
      prenotazioni: {
        where: {
          stato: { in: ['CONFERMATA', 'RICHIESTA'] },
          dataArrivo: { lt: partenza },
          OR: [
            { dataPartenza: null, dataArrivo: { gte: arrivo } },
            { dataPartenza: { gt: arrivo } },
          ],
        },
        select: { id: true },
      },
    },
    orderBy: { prezzoBase: 'asc' },
  })

  type CameraDisponibile = {
    unitaId: string
    nome: string
    descrizione: string | null
    immagine: string | null
    capacita: number
    lettiExtra: number
    piano: number | null
    prezzo: PriceBreakdown
  }

  const camere: CameraDisponibile[] = []

  for (const u of unita) {
    if (u.capacita + u.lettiExtra < totOspiti) continue

    // Check Disponibilita giorno-per-giorno
    const giorniRichiesti = enumDays(arrivo, partenza)
    let unitaDisponibile = true
    for (const g of giorniRichiesti) {
      const d = u.disponibilita.find((x) => sameDay(x.data, g))
      if (d) {
        if (d.chiuso || d.postiOccupati >= d.postiDisponibili) { unitaDisponibile = false; break }
      }
    }
    if (!unitaDisponibile) continue

    // Check blocchi OTA
    const haBloccoOta = await prisma.canaleEsterno.findFirst({
      where: {
        strutturaId, attivo: true,
        OR: [{ unitaId: u.id }, { unitaId: null }],
        prenotazioniImportate: { some: { dataInizio: { lt: partenza }, dataFine: { gt: arrivo } } },
      },
    })
    if (haBloccoOta) continue

    // Check prenotazioni interne
    if (u.prenotazioni.length > 0) continue

    // Calcola prezzo con breakdown completo
    const prezzo = calcolaPrezzoBreakdown({
      dataArrivo: arrivo,
      dataPartenza: partenza,
      dataPrenotazione: oggi,
      adulti,
      bambini,
      lettoExtra: 0,
      prezzoBase: u.prezzoBase,
      prezzoLettoExtra: u.prezzoLettoExtra ?? null,
      unitaId: u.id,
      tariffePeriodo: u.tariffe.map((t) => ({
        nome: t.nome, colore: t.colore, prezzo: t.prezzo,
        dataInizio: t.dataInizio, dataFine: t.dataFine,
      })),
      regole: regolePricing,
      tassaSoggiornoPerNotte: tassaPerNotte,
    })

    camere.push({
      unitaId: u.id,
      nome: u.nome,
      descrizione: u.descrizione,
      immagine: u.immagine,
      capacita: u.capacita,
      lettiExtra: u.lettiExtra,
      piano: u.piano,
      prezzo,
    })
  }

  const res = NextResponse.json({
    struttura: { id: struttura.id, nome: struttura.nome, citta: struttura.citta, logo: struttura.logo, colorePrimario: struttura.colorePrimario },
    ricerca: { arrivo: arrivoStr, partenza: partenzaStr, notti, adulti, bambini },
    camere,
    suggerimenti: [],
  })
  res.headers.set('Cache-Control', 'public, max-age=30, stale-while-revalidate=60')
  return res
}

// ─── Utils ──────────────────────────────────────────────────────────────────

function parseYMD(s: string): Date | null {
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!m) return null
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
  d.setHours(0, 0, 0, 0)
  if (isNaN(d.getTime())) return null
  return d
}

function enumDays(start: Date, endExcl: Date): Date[] {
  const out: Date[] = []
  const d = new Date(start); d.setHours(0, 0, 0, 0)
  while (d < endExcl) { out.push(new Date(d)); d.setDate(d.getDate() + 1) }
  return out
}

function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}
