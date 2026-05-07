import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireHost, isUnauthorized } from '@/lib/auth-middleware'
import { prisma } from '@/lib/db'
import { parseBody } from '@/lib/validations'

// ─── Zod schema ──────────────────────────────────────────────────────────────

const chiusuraSchema = z.object({
  data: z.string().min(1, 'Data obbligatoria'),  // YYYY-MM-DD
  turno: z.string().max(50).optional().nullable(),
  fondoCassaInizio: z.number().min(0).optional().nullable(),
  fondoCassaFine: z.number().min(0).optional().nullable(),
})

// ─── GET: List chiusure cassa ────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const auth = await requireHost()
  if (isUnauthorized(auth)) return auth

  const sp = req.nextUrl.searchParams
  const data = sp.get('data')
  const dataFrom = sp.get('dataFrom')
  const dataTo = sp.get('dataTo')

  const where: Record<string, unknown> = { hostId: auth.user.hostId }

  if (data) {
    const giorno = new Date(data)
    const fine = new Date(data)
    fine.setDate(fine.getDate() + 1)
    where.data = { gte: giorno, lt: fine }
  } else if (dataFrom || dataTo) {
    const range: Record<string, Date> = {}
    if (dataFrom) range.gte = new Date(dataFrom)
    if (dataTo) {
      const fine = new Date(dataTo)
      fine.setDate(fine.getDate() + 1)
      range.lt = fine
    }
    where.data = range
  }

  const chiusure = await prisma.chiusuraCassa.findMany({
    where,
    orderBy: { data: 'desc' },
  })

  return NextResponse.json(chiusure)
}

// ─── POST: Crea chiusura cassa per data/turno ────────────────────────────────

export async function POST(req: NextRequest) {
  const auth = await requireHost()
  if (isUnauthorized(auth)) return auth

  const parsed = parseBody(chiusuraSchema, await req.json())
  if (parsed.error) return parsed.error
  const body = parsed.data

  const giorno = new Date(body.data)
  const fineGiorno = new Date(body.data)
  fineGiorno.setDate(fineGiorno.getDate() + 1)

  const hostId = auth.user.hostId

  // Verifica che non esista già una chiusura per questo giorno/turno
  const existing = await prisma.chiusuraCassa.findFirst({
    where: {
      hostId,
      data: { gte: giorno, lt: fineGiorno },
      turno: body.turno ?? null,
    },
  })
  if (existing) {
    return NextResponse.json(
      { error: 'Chiusura cassa già esistente per questa data/turno' },
      { status: 409 },
    )
  }

  // ── Raccogli tutti gli incassi non ancora riconciliati del giorno ──────────

  const incassi = await prisma.incasso.findMany({
    where: {
      hostId,
      data: { gte: giorno, lt: fineGiorno },
      riconciliato: false,
    },
  })

  // Totali per metodo
  let totaleContanti = 0
  let totaleCarta = 0
  let totaleBonifico = 0
  let totaleGiftCard = 0
  let totaleCamera = 0

  // Dettaglio carta
  let totaleVisa = 0
  let totaleMastercard = 0
  let totaleAmex = 0
  let totaleBancomat = 0
  let totaleAltreCard = 0

  for (const inc of incassi) {
    switch (inc.metodo) {
      case 'CONTANTI':
        totaleContanti += inc.importo
        break
      case 'CARTA':
        totaleCarta += inc.importo
        switch (inc.tipoCarta) {
          case 'VISA': totaleVisa += inc.importo; break
          case 'MASTERCARD': totaleMastercard += inc.importo; break
          case 'AMEX': totaleAmex += inc.importo; break
          case 'BANCOMAT': totaleBancomat += inc.importo; break
          default: totaleAltreCard += inc.importo; break
        }
        break
      case 'BONIFICO':
        totaleBonifico += inc.importo
        break
      case 'GIFT_CARD':
        totaleGiftCard += inc.importo
        break
      case 'CAMERA_CREDIT':
        totaleCamera += inc.importo
        break
      case 'MISTO':
        // Per pagamenti misti, il dettaglio è nell'importo complessivo
        totaleContanti += 0 // il dettaglio split non è nell'incasso singolo
        break
    }
  }

  const totaleComplessivo = totaleContanti + totaleCarta + totaleBonifico + totaleGiftCard + totaleCamera

  // ── Conteggi transazioni POS del giorno ────────────────────────────────────

  const transazioniPOS = await prisma.transazionePOS.findMany({
    where: {
      hostId,
      createdAt: { gte: giorno, lt: fineGiorno },
      stato: 'COMPLETATA',
    },
    select: { tipo: true },
  })

  const numTransazioni = transazioniPOS.length
  const numVendite = transazioniPOS.filter(t => t.tipo === 'VENDITA').length
  const numResi = transazioniPOS.filter(t => t.tipo === 'RESO').length
  const numSconti = transazioniPOS.filter(t => t.tipo === 'SCONTO').length

  // ── Calcola differenza cassa ───────────────────────────────────────────────

  const fondoCassaInizio = body.fondoCassaInizio ?? 0
  const fondoCassaFine = body.fondoCassaFine ?? null
  const differenza = fondoCassaFine !== null
    ? fondoCassaFine - (fondoCassaInizio + totaleContanti)
    : null

  // ── Crea chiusura + segna incassi come riconciliati (transazione) ──────────

  const chiusura = await prisma.$transaction(async (tx) => {
    const created = await tx.chiusuraCassa.create({
      data: {
        hostId,
        data: giorno,
        operatore: auth.user.name || auth.user.email,
        turno: body.turno ?? null,
        totaleContanti,
        totaleCarta,
        totaleBonifico,
        totaleGiftCard,
        totaleCamera,
        totaleComplessivo,
        totaleVisa,
        totaleMastercard,
        totaleAmex,
        totaleBancomat,
        totaleAltreCard,
        numTransazioni,
        numVendite,
        numResi,
        numSconti,
        fondoCassaInizio,
        fondoCassaFine,
        differenza,
        riconciliato: true,
      },
    })

    // Segna tutti gli incassi come riconciliati
    if (incassi.length > 0) {
      await tx.incasso.updateMany({
        where: {
          id: { in: incassi.map(i => i.id) },
        },
        data: {
          riconciliato: true,
          chiusuraCassaId: created.id,
        },
      })
    }

    return created
  })

  return NextResponse.json(chiusura, { status: 201 })
}
