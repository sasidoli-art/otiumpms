import { NextRequest, NextResponse } from 'next/server'
import { requireHost, isUnauthorized } from '@/lib/auth-middleware'
import { prisma } from '@/lib/db'
import { calcolaRiepilogoIva } from '@/lib/iva'
import { z } from 'zod'

const addebitoSchema = z.object({
  servizioId: z.string().optional(),
  pacchettoId: z.string().optional(),
  quantita: z.number().int().min(1).default(1),
  note: z.string().max(500).optional(),
  addebitatoDa: z.string().max(100).optional(),
  // Per addebito manuale
  descrizione: z.string().max(200).optional(),
  prezzoUnitario: z.number().min(0).optional(),
  aliquotaIva: z.number().min(0).max(100).optional(),
})

/**
 * GET /api/host/prenotazioni/[id]/addebiti
 * Lista addebiti servizi/prodotti sulla prenotazione + riepilogo IVA per fattura.
 */
export async function GET(_: NextRequest, { params: pp }: { params: Promise<{ id: string }> }) {
  const auth = await requireHost()
  if (isUnauthorized(auth)) return auth
  const { id } = await pp

  const pren = await prisma.prenotazione.findFirst({
    where: { id, hostId: auth.user.hostId },
    select: { id: true },
  })
  if (!pren) return NextResponse.json({ error: 'Non trovata' }, { status: 404 })

  const addebiti = await prisma.addebitoPrenotazione.findMany({
    where: { prenotazioneId: id },
    include: {
      servizio: { select: { nome: true, categoria: true } },
      pacchetto: { select: { nome: true } },
    },
    orderBy: { data: 'asc' },
  })

  const totale = addebiti.reduce((s, a) => s + a.totale, 0)
  const riepilogoIva = calcolaRiepilogoIva(addebiti)

  return NextResponse.json({
    addebiti,
    totale: Math.round(totale * 100) / 100,
    riepilogoIva,
    numVoci: addebiti.length,
  })
}

/**
 * POST /api/host/prenotazioni/[id]/addebiti
 * Addebita un servizio/pacchetto alla prenotazione.
 * Body: { servizioId?: string, pacchettoId?: string, quantita?: number, note?: string, addebitatoDa?: string }
 * Oppure addebito manuale: { descrizione, prezzoUnitario, aliquotaIva, quantita }
 */
export async function POST(req: NextRequest, { params: pp }: { params: Promise<{ id: string }> }) {
  const auth = await requireHost()
  if (isUnauthorized(auth)) return auth
  const { id } = await pp

  const pren = await prisma.prenotazione.findFirst({
    where: { id, hostId: auth.user.hostId },
    select: { id: true },
  })
  if (!pren) return NextResponse.json({ error: 'Non trovata' }, { status: 404 })

  const raw = await req.json()
  const parsed = addebitoSchema.safeParse(raw)
  if (!parsed.success) return NextResponse.json({ error: 'Dati non validi', details: parsed.error.flatten() }, { status: 422 })
  const body = parsed.data
  const { servizioId, pacchettoId, quantita = 1, note, addebitatoDa } = body

  let descrizione: string
  let prezzoUnitario: number
  let aliquotaIva: number

  if (servizioId) {
    const servizio = await prisma.servizioStruttura.findFirst({
      where: { id: servizioId, hostId: auth.user.hostId },
    })
    if (!servizio) return NextResponse.json({ error: 'Servizio non trovato' }, { status: 404 })
    descrizione = servizio.nome
    prezzoUnitario = servizio.prezzo
    aliquotaIva = servizio.aliquotaIva
  } else if (pacchettoId) {
    const pacchetto = await prisma.pacchettoServizio.findFirst({
      where: { id: pacchettoId, hostId: auth.user.hostId },
    })
    if (!pacchetto) return NextResponse.json({ error: 'Pacchetto non trovato' }, { status: 404 })
    descrizione = `Pacchetto: ${pacchetto.nome}`
    prezzoUnitario = pacchetto.prezzo
    aliquotaIva = 10 // default per pacchetti misti
  } else if (body.descrizione && body.prezzoUnitario !== undefined) {
    // Addebito manuale
    descrizione = body.descrizione
    prezzoUnitario = body.prezzoUnitario
    aliquotaIva = body.aliquotaIva ?? 22
  } else {
    return NextResponse.json({ error: 'servizioId, pacchettoId, o descrizione+prezzoUnitario obbligatori' }, { status: 400 })
  }

  const totale = Math.round(quantita * prezzoUnitario * 100) / 100

  const addebito = await prisma.addebitoPrenotazione.create({
    data: {
      prenotazioneId: id,
      servizioId: servizioId || null,
      pacchettoId: pacchettoId || null,
      descrizione,
      quantita,
      prezzoUnitario,
      aliquotaIva,
      totale,
      addebitatoDa: addebitatoDa || auth.user.name || 'Sistema',
      note: note || null,
    },
  })

  return NextResponse.json(addebito, { status: 201 })
}
