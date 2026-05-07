import { NextRequest, NextResponse } from 'next/server'
import { requireHost, isUnauthorized } from '@/lib/auth-middleware'
import { prisma } from '@/lib/db'
import { z } from 'zod'
import { parseBody } from '@/lib/validations'
import { notDeleted } from '@/lib/prisma-helpers'

// ─── Zod schema ──────────────────────────────────────────────────────────────

const contrattoCreateSchema = z.object({
  tipo: z.enum(['TOUR_OPERATOR', 'AGENZIA', 'CORPORATE', 'GRUPPO']),
  nomePartner: z.string().min(1, 'Nome partner obbligatorio').max(255).trim(),
  contatto: z.string().max(255).trim().optional().nullable(),
  email: z.string().email().max(254).optional().nullable().or(z.literal('')),
  telefono: z.string().max(30).trim().optional().nullable(),
  dataInizio: z.coerce.date(),
  dataFine: z.coerce.date(),
  stato: z.enum(['ATTIVO', 'SCADUTO', 'SOSPESO']).default('ATTIVO'),
  strutturaId: z.string().cuid('Struttura non valida'),
  unitaRiservate: z.coerce.number().int().min(1, 'Almeno 1 unità'),
  unitaVendute: z.coerce.number().int().min(0).default(0),
  tariffaNegoziata: z.coerce.number().min(0).optional().nullable(),
  scontoPercentuale: z.coerce.number().min(0).max(100).optional().nullable(),
  commissionePercentuale: z.coerce.number().min(0).max(100).optional().nullable(),
  releaseGiorni: z.coerce.number().int().min(0).default(7),
  cancellazioneGratuita: z.boolean().default(true),
  note: z.string().max(2000).trim().optional().nullable(),
})

// ─── GET /api/host/allotment ─────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const auth = await requireHost()
  if (isUnauthorized(auth)) return auth

  const sp = req.nextUrl.searchParams
  const tipo = sp.get('tipo')
  const stato = sp.get('stato')

  const contratti = await prisma.contrattoAllotment.findMany({
    where: {
      hostId: auth.user.hostId,
      ...(tipo ? { tipo: tipo as 'TOUR_OPERATOR' | 'AGENZIA' | 'CORPORATE' | 'GRUPPO' } : {}),
      ...(stato ? { stato: stato as 'ATTIVO' | 'SCADUTO' | 'SOSPESO' } : {}),
    },
    include: {
      struttura: { select: { id: true, nome: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  // KPI
  const attivi = contratti.filter(c => c.stato === 'ATTIVO')
  const kpi = {
    contrattiAttivi: attivi.length,
    unitaRiservate: attivi.reduce((s, c) => s + c.unitaRiservate, 0),
    unitaVendute: attivi.reduce((s, c) => s + c.unitaVendute, 0),
    revenuePartner: attivi.reduce((s, c) => {
      const tariffa = c.tariffaNegoziata ?? 0
      return s + tariffa * c.unitaVendute
    }, 0),
  }

  return NextResponse.json({ contratti, kpi })
}

// ─── POST /api/host/allotment ────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const auth = await requireHost()
  if (isUnauthorized(auth)) return auth

  let raw: unknown
  try {
    raw = await req.json()
  } catch {
    return NextResponse.json({ error: 'Corpo della richiesta malformato' }, { status: 400 })
  }

  const parsed = parseBody(contrattoCreateSchema, raw)
  if (parsed.error) return parsed.error
  const data = parsed.data

  // Verifica che la struttura appartenga all'host
  const struttura = await prisma.struttura.findFirst({
    where: { id: data.strutturaId, hostId: auth.user.hostId, ...notDeleted },
  })
  if (!struttura) {
    return NextResponse.json({ error: 'Struttura non trovata' }, { status: 404 })
  }

  const contratto = await prisma.contrattoAllotment.create({
    data: {
      hostId: auth.user.hostId,
      tipo: data.tipo,
      nomePartner: data.nomePartner,
      contatto: data.contatto || null,
      email: data.email || null,
      telefono: data.telefono || null,
      dataInizio: data.dataInizio,
      dataFine: data.dataFine,
      stato: data.stato,
      strutturaId: data.strutturaId,
      unitaRiservate: data.unitaRiservate,
      unitaVendute: data.unitaVendute,
      tariffaNegoziata: data.tariffaNegoziata ?? null,
      scontoPercentuale: data.scontoPercentuale ?? null,
      commissionePercentuale: data.commissionePercentuale ?? null,
      releaseGiorni: data.releaseGiorni,
      cancellazioneGratuita: data.cancellazioneGratuita,
      note: data.note || null,
    },
    include: {
      struttura: { select: { id: true, nome: true } },
    },
  })

  return NextResponse.json(contratto, { status: 201 })
}
