import { NextRequest, NextResponse } from 'next/server'
import { requireHost, isUnauthorized } from '@/lib/auth-middleware'
import { auditFromAuth } from '@/lib/audit'
import { prisma } from '@/lib/db'
import { z } from 'zod'
import { parseBody } from '@/lib/validations'

const contrattoPatchSchema = z.object({
  tipo: z.enum(['TOUR_OPERATOR', 'AGENZIA', 'CORPORATE', 'GRUPPO']).optional(),
  nomePartner: z.string().min(1).max(255).trim().optional(),
  contatto: z.string().max(255).trim().optional().nullable(),
  email: z.string().email().max(254).optional().nullable().or(z.literal('')),
  telefono: z.string().max(30).trim().optional().nullable(),
  dataInizio: z.coerce.date().optional(),
  dataFine: z.coerce.date().optional(),
  stato: z.enum(['ATTIVO', 'SCADUTO', 'SOSPESO']).optional(),
  strutturaId: z.string().cuid().optional(),
  unitaRiservate: z.coerce.number().int().min(1).optional(),
  unitaVendute: z.coerce.number().int().min(0).optional(),
  tariffaNegoziata: z.coerce.number().min(0).optional().nullable(),
  scontoPercentuale: z.coerce.number().min(0).max(100).optional().nullable(),
  commissionePercentuale: z.coerce.number().min(0).max(100).optional().nullable(),
  releaseGiorni: z.coerce.number().int().min(0).optional(),
  cancellazioneGratuita: z.boolean().optional(),
  note: z.string().max(2000).trim().optional().nullable(),
})

// Helper: trova contratto dell'host
async function findContratto(id: string, hostId: string) {
  return prisma.contrattoAllotment.findFirst({
    where: { id, hostId },
    include: { struttura: { select: { id: true, nome: true } } },
  })
}

// ─── GET /api/host/allotment/[id] ───────────────────────────────────────────

export async function GET(
  _: NextRequest,
  { params: paramsPromise }: { params: Promise<{ id: string }> },
) {
  const auth = await requireHost()
  if (isUnauthorized(auth)) return auth
  const { id } = await paramsPromise

  const contratto = await findContratto(id, auth.user.hostId)
  if (!contratto) return NextResponse.json({ error: 'Non trovato' }, { status: 404 })

  return NextResponse.json(contratto)
}

// ─── PATCH /api/host/allotment/[id] ─────────────────────────────────────────

export async function PATCH(
  req: NextRequest,
  { params: paramsPromise }: { params: Promise<{ id: string }> },
) {
  const auth = await requireHost()
  if (isUnauthorized(auth)) return auth
  const { id } = await paramsPromise

  const existing = await findContratto(id, auth.user.hostId)
  if (!existing) return NextResponse.json({ error: 'Non trovato' }, { status: 404 })

  let raw: unknown
  try {
    raw = await req.json()
  } catch {
    return NextResponse.json({ error: 'Corpo della richiesta malformato' }, { status: 400 })
  }

  const parsed = parseBody(contrattoPatchSchema, raw)
  if (parsed.error) return parsed.error
  const data = parsed.data

  // Se cambia struttura, verifica appartenenza
  if (data.strutturaId && data.strutturaId !== existing.strutturaId) {
    const struttura = await prisma.struttura.findFirst({
      where: { id: data.strutturaId, hostId: auth.user.hostId },
    })
    if (!struttura) return NextResponse.json({ error: 'Struttura non trovata' }, { status: 404 })
  }

  const updated = await prisma.contrattoAllotment.update({
    where: { id },
    data: {
      ...(data.tipo !== undefined && { tipo: data.tipo }),
      ...(data.nomePartner !== undefined && { nomePartner: data.nomePartner }),
      ...(data.contatto !== undefined && { contatto: data.contatto || null }),
      ...(data.email !== undefined && { email: data.email || null }),
      ...(data.telefono !== undefined && { telefono: data.telefono || null }),
      ...(data.dataInizio !== undefined && { dataInizio: data.dataInizio }),
      ...(data.dataFine !== undefined && { dataFine: data.dataFine }),
      ...(data.stato !== undefined && { stato: data.stato }),
      ...(data.strutturaId !== undefined && { strutturaId: data.strutturaId }),
      ...(data.unitaRiservate !== undefined && { unitaRiservate: data.unitaRiservate }),
      ...(data.unitaVendute !== undefined && { unitaVendute: data.unitaVendute }),
      ...(data.tariffaNegoziata !== undefined && { tariffaNegoziata: data.tariffaNegoziata }),
      ...(data.scontoPercentuale !== undefined && { scontoPercentuale: data.scontoPercentuale }),
      ...(data.commissionePercentuale !== undefined && { commissionePercentuale: data.commissionePercentuale }),
      ...(data.releaseGiorni !== undefined && { releaseGiorni: data.releaseGiorni }),
      ...(data.cancellazioneGratuita !== undefined && { cancellazioneGratuita: data.cancellazioneGratuita }),
      ...(data.note !== undefined && { note: data.note || null }),
    },
    include: { struttura: { select: { id: true, nome: true } } },
  })

  return NextResponse.json(updated)
}

// ─── DELETE /api/host/allotment/[id] ────────────────────────────────────────

export async function DELETE(
  _: NextRequest,
  { params: paramsPromise }: { params: Promise<{ id: string }> },
) {
  const auth = await requireHost()
  if (isUnauthorized(auth)) return auth
  const { id } = await paramsPromise

  const existing = await findContratto(id, auth.user.hostId)
  if (!existing) return NextResponse.json({ error: 'Non trovato' }, { status: 404 })

  await prisma.contrattoAllotment.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
