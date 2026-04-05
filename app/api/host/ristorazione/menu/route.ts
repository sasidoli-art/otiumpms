import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireHost, isUnauthorized } from '@/lib/auth-middleware'
import { auditFromAuth } from '@/lib/audit'
import { prisma } from '@/lib/db'
import { parseBody } from '@/lib/validations'

// ─── Zod Schemas ─────────────────────────────────────────────────────────────

const piattoSchema = z.object({
  categoria: z.enum([
    'PRIMO', 'SECONDO', 'CONTORNO', 'DOLCE', 'BEVANDA',
    'ANTIPASTO', 'FRUTTA', 'COLAZIONE_DOLCE', 'COLAZIONE_SALATA', 'COLAZIONE_BEVANDA',
  ]),
  nome: z.string().min(1).max(200).trim(),
  descrizione: z.string().max(500).trim().optional().nullable(),
  allergeni: z.array(z.string().max(50)).optional().default([]),
  prezzo: z.number().min(0).optional().nullable(),
  ordine: z.number().int().min(0).default(0),
})

const createMenuSchema = z.object({
  strutturaId: z.string().min(1),
  tipoPasto: z.enum(['COLAZIONE', 'PRANZO', 'CENA']),
  data: z.string().min(1), // "2026-04-01"
  isTemplate: z.boolean().optional().default(false),
  giornoSettimana: z.number().int().min(0).max(6).optional().nullable(),
  nome: z.string().max(200).trim().optional().nullable(),
  note: z.string().max(1000).trim().optional().nullable(),
  piatti: z.array(piattoSchema).min(1, 'Almeno un piatto richiesto'),
})

// ─── GET /api/host/ristorazione/menu ─────────────────────────────────────────

export async function GET(req: NextRequest) {
  const auth = await requireHost()
  if (isUnauthorized(auth)) return auth

  const sp = req.nextUrl.searchParams
  const strutturaId = sp.get('strutturaId')
  const tipoPasto = sp.get('tipoPasto')
  const data = sp.get('data')

  if (!strutturaId) {
    return NextResponse.json({ error: 'strutturaId obbligatorio' }, { status: 400 })
  }

  // Verify struttura belongs to host
  const struttura = await prisma.struttura.findFirst({
    where: { id: strutturaId, hostId: auth.user.hostId },
    select: { id: true },
  })
  if (!struttura) {
    return NextResponse.json({ error: 'Struttura non trovata' }, { status: 404 })
  }

  const where: Record<string, unknown> = { strutturaId }
  if (tipoPasto && ['COLAZIONE', 'PRANZO', 'CENA'].includes(tipoPasto)) {
    where.tipoPasto = tipoPasto
  }
  if (data) {
    const giorno = new Date(data + 'T00:00:00Z')
    const giornoFine = new Date(data + 'T23:59:59.999Z')
    where.data = { gte: giorno, lte: giornoFine }
  }

  const menus = await prisma.menuGiornaliero.findMany({
    where,
    include: {
      piatti: { orderBy: { ordine: 'asc' } },
    },
    orderBy: [{ data: 'asc' }, { tipoPasto: 'asc' }],
  })

  return NextResponse.json(menus)
}

// ─── POST /api/host/ristorazione/menu ────────────────────────────────────────

export async function POST(req: NextRequest) {
  const auth = await requireHost()
  if (isUnauthorized(auth)) return auth

  const parsed = parseBody(createMenuSchema, await req.json())
  if (parsed.error) return parsed.error
  const { strutturaId, tipoPasto, data, isTemplate, giornoSettimana, nome, note, piatti } = parsed.data

  // Verify struttura belongs to host
  const struttura = await prisma.struttura.findFirst({
    where: { id: strutturaId, hostId: auth.user.hostId },
    select: { id: true },
  })
  if (!struttura) {
    return NextResponse.json({ error: 'Struttura non trovata' }, { status: 404 })
  }

  const menu = await prisma.$transaction(async (tx) => {
    const created = await tx.menuGiornaliero.create({
      data: {
        strutturaId,
        tipoPasto,
        data: new Date(data + 'T12:00:00Z'),
        isTemplate,
        giornoSettimana: isTemplate ? giornoSettimana : null,
        nome,
        note,
        piatti: {
          create: piatti.map((p) => ({
            categoria: p.categoria,
            nome: p.nome,
            descrizione: p.descrizione ?? null,
            allergeni: p.allergeni ?? [],
            prezzo: p.prezzo ?? null,
            ordine: p.ordine,
          })),
        },
      },
      include: {
        piatti: { orderBy: { ordine: 'asc' } },
      },
    })
    return created
  })

  return NextResponse.json(menu, { status: 201 })
}
