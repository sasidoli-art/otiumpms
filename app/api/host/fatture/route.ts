import { NextRequest, NextResponse } from 'next/server'
import { requireHost, isUnauthorized } from '@/lib/auth-middleware'
import { auditFromAuth } from '@/lib/audit'
import { prisma } from '@/lib/db'
import { z } from 'zod'
import { parseBody } from '@/lib/validations'
import { normalizzaRighe, calcolaTotali, buildRigheCreatePayload, type RigaInput } from '@/lib/fattura-righe'

// ─── Schemas ─────────────────────────────────────────────────────────────────

const fatturaManualSchema = z.object({
  clienteNome: z.string().min(1),
  clientePIva: z.string().optional().nullable(),
  clienteCF: z.string().optional().nullable(),
  clienteIndirizzo: z.string().optional().nullable(),
  clienteCitta: z.string().optional().nullable(),
  clienteCap: z.string().optional().nullable(),
  clienteProvincia: z.string().optional().nullable(),
  clientePaese: z.string().optional().default('Italia'),
  clienteEmail: z.string().email().optional().nullable(),
  clientePec: z.string().optional().nullable(),
  clienteSDI: z.string().optional().nullable(),
  righe: z.array(z.object({
    descrizione: z.string().min(1),
    quantita: z.number().positive(),
    prezzoUnitario: z.number().min(0),
    iva: z.number().min(0).default(22),
  })).min(1),
  aliquotaIva: z.number().min(0).default(22),
  dataScadenza: z.string().optional().nullable(),
  note: z.string().optional().nullable(),
  metodoPagamento: z.string().optional().nullable(),
})

const fatturaFromPrenotazioneSchema = z.object({
  prenotazioneId: z.string().min(1),
  aliquotaIva: z.number().min(0).default(10), // aliquota ridotta per soggiorno
  note: z.string().optional().nullable(),
})

// ─── GET: list fatture ───────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const auth = await requireHost()
  if (isUnauthorized(auth)) return auth

  const { searchParams } = new URL(req.url)
  const anno = searchParams.get('anno') ? parseInt(searchParams.get('anno')!) : undefined
  const stato = searchParams.get('stato') || undefined
  const page = parseInt(searchParams.get('page') || '1')
  const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100)

  const where: Record<string, unknown> = { hostId: auth.user.hostId, deletedAt: null }
  if (anno) where.anno = anno
  if (stato) where.stato = stato

  const [fatture, total] = await Promise.all([
    prisma.fattura.findMany({
      where,
      orderBy: { dataEmissione: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        prenotazioni: {
          select: { id: true, guestNome: true, guestCognome: true },
        },
        riferimentoFattura: {
          select: { id: true, numero: true },
        },
        noteDiCredito: {
          select: { id: true, numero: true, totale: true },
        },
      },
    }),
    prisma.fattura.count({ where }),
  ])

  return NextResponse.json({ fatture, total, page, limit })
}

// ─── POST: create fattura ────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const auth = await requireHost()
  if (isUnauthorized(auth)) return auth

  const body = await req.json()

  // Determine if creating from prenotazione or manually
  if (body.prenotazioneId) {
    return createFromPrenotazione(auth.user.hostId, body)
  }
  return createManual(auth.user.hostId, body)
}

// ─── Helper: create from prenotazione ────────────────────────────────────────

async function createFromPrenotazione(hostId: string, body: unknown) {
  const parsed = parseBody(fatturaFromPrenotazioneSchema, body)
  if (parsed.error) return parsed.error
  const data = parsed.data
  const aliquota = data.aliquotaIva ?? 10

  const prenotazione = await prisma.prenotazione.findFirst({
    where: { id: data.prenotazioneId, hostId },
    include: {
      unita: { select: { nome: true } },
      addebiti: true,
    },
  })

  if (!prenotazione) {
    return NextResponse.json({ error: 'Prenotazione non trovata' }, { status: 404 })
  }

  // Build righe from prenotazione data
  const righeInput: RigaInput[] = []

  // Main stay
  if (prenotazione.prezzoTotale) {
    const notti = prenotazione.dataPartenza
      ? Math.max(1, Math.ceil(
          (prenotazione.dataPartenza.getTime() - prenotazione.dataArrivo.getTime()) / (1000 * 60 * 60 * 24)
        ))
      : 1
    const prezzoNotte = prenotazione.prezzoTotale / notti
    const unitaNome = prenotazione.unita?.nome || 'Soggiorno'

    righeInput.push({
      descrizione: `${unitaNome} — ${notti} nott${notti === 1 ? 'e' : 'i'}`,
      quantita: notti,
      prezzoUnitario: Math.round(prezzoNotte * 100) / 100,
      iva: aliquota,
      categoria: 'soggiorno',
    })
  }

  // Addebiti extra
  for (const addebito of prenotazione.addebiti) {
    righeInput.push({
      descrizione: addebito.descrizione,
      quantita: addebito.quantita,
      prezzoUnitario: addebito.prezzoUnitario,
      iva: addebito.aliquotaIva,
      categoria: 'extra',
    })
  }

  // Tassa di soggiorno (esente IVA — N1)
  if (prenotazione.tassaSoggiorno && prenotazione.tassaSoggiorno > 0) {
    const notti = prenotazione.dataPartenza
      ? Math.max(1, Math.ceil(
          (prenotazione.dataPartenza.getTime() - prenotazione.dataArrivo.getTime()) / (1000 * 60 * 60 * 24)
        ))
      : 1
    righeInput.push({
      descrizione: 'Tassa di soggiorno',
      quantita: notti * prenotazione.numOspiti,
      prezzoUnitario: prenotazione.tassaSoggiorno,
      iva: 0, // esente
      naturaEsenzione: 'N1',
      categoria: 'tassa-soggiorno',
    })
  }

  if (righeInput.length === 0) {
    return NextResponse.json({ error: 'Nessun importo da fatturare' }, { status: 422 })
  }

  const righe = normalizzaRighe(righeInput)
  const { imponibile, iva: ivaAmount, totale } = calcolaTotali(righe)

  // Generate progressive number
  const anno = new Date().getFullYear()
  const numero = await generateNumeroFattura(hostId, anno)

  const fattura = await prisma.fattura.create({
    data: {
      hostId,
      numero,
      anno,
      clienteNome: `${prenotazione.guestNome} ${prenotazione.guestCognome}`,
      clienteEmail: prenotazione.guestEmail,
      ...buildRigheCreatePayload(righe),
      imponibile,
      iva: ivaAmount,
      totale,
      aliquotaIva: aliquota,
      note: data.note || null,
      tipoDocumento: 'TD01',
      prenotazioni: { connect: { id: prenotazione.id } },
    },
  })

  return NextResponse.json(fattura, { status: 201 })
}

// ─── Helper: create manual fattura ───────────────────────────────────────────

async function createManual(hostId: string, body: unknown) {
  const parsed = parseBody(fatturaManualSchema, body)
  if (parsed.error) return parsed.error
  const data = parsed.data

  const righe = normalizzaRighe(
    data.righe.map((r) => ({
      descrizione: r.descrizione,
      quantita: r.quantita,
      prezzoUnitario: r.prezzoUnitario,
      iva: r.iva ?? 22,
    })),
  )
  const { imponibile, iva: ivaAmount, totale } = calcolaTotali(righe)

  const anno = new Date().getFullYear()
  const numero = await generateNumeroFattura(hostId, anno)

  const fattura = await prisma.fattura.create({
    data: {
      hostId,
      numero,
      anno,
      clienteNome: data.clienteNome,
      clientePIva: data.clientePIva || null,
      clienteCF: data.clienteCF || null,
      clienteIndirizzo: data.clienteIndirizzo || null,
      clienteCitta: data.clienteCitta || null,
      clienteCap: data.clienteCap || null,
      clienteProvincia: data.clienteProvincia || null,
      clientePaese: data.clientePaese,
      clienteEmail: data.clienteEmail || null,
      clientePec: data.clientePec || null,
      clienteSDI: data.clienteSDI || null,
      ...buildRigheCreatePayload(righe),
      imponibile,
      iva: ivaAmount,
      totale,
      aliquotaIva: data.aliquotaIva,
      dataScadenza: data.dataScadenza ? new Date(data.dataScadenza) : null,
      note: data.note || null,
      tipoDocumento: 'TD01',
    },
  })

  return NextResponse.json(fattura, { status: 201 })
}

// ─── Helper: generate progressive invoice number ─────────────────────────────

async function generateNumeroFattura(hostId: string, anno: number): Promise<string> {
  const lastFattura = await prisma.fattura.findFirst({
    where: { hostId, anno },
    orderBy: { numero: 'desc' },
    select: { numero: true },
  })

  let nextNum = 1
  if (lastFattura) {
    // Extract number part from "2026/001" format
    const match = lastFattura.numero.match(/\/(\d+)$/)
    if (match) {
      nextNum = parseInt(match[1], 10) + 1
    }
  }

  return `${anno}/${String(nextNum).padStart(3, '0')}`
}
