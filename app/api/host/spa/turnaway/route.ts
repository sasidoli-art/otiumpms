import { NextRequest, NextResponse } from 'next/server'
import { requireHost, isUnauthorized } from '@/lib/auth-middleware'
import { auditFromAuth } from '@/lib/audit'
import { prisma } from '@/lib/db'
import { z } from 'zod'
import { parseBody } from '@/lib/validations'



const createSchema = z.object({
  data: z.string().min(1, 'Data obbligatoria'),
  trattamentoId: z.string().optional().nullable(),
  motivo: z.enum(['PIENO', 'NON_DISPONIBILE', 'PREZZO', 'ORARIO', 'ALTRO']),
  guestNome: z.string().max(200).trim().optional().nullable(),
  guestEmail: z.string().email().trim().optional().nullable(),
  note: z.string().max(1000).trim().optional().nullable(),
})

// ─── GET: lista turnaway con filtri ─────────────────────────────────────────

export async function GET(req: NextRequest) {
  const auth = await requireHost()
  if (isUnauthorized(auth)) return auth

  const { searchParams } = new URL(req.url)
  const da = searchParams.get('da')
  const a = searchParams.get('a')
  const motivo = searchParams.get('motivo')

  const where: Record<string, unknown> = { hostId: auth.user.hostId }

  if (da || a) {
    where.data = {}
    if (da) (where.data as Record<string, unknown>).gte = new Date(da)
    if (a) (where.data as Record<string, unknown>).lte = new Date(a)
  }

  if (motivo && ['PIENO', 'NON_DISPONIBILE', 'PREZZO', 'ORARIO', 'ALTRO'].includes(motivo)) {
    where.motivo = motivo
  }

  const entries = await prisma.turnawayTracking.findMany({
    where,
    include: {
      trattamento: { select: { id: true, nome: true, categoria: true, prezzo: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(entries)
}

// ─── POST: registra un turnaway ─────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const auth = await requireHost()
  if (isUnauthorized(auth)) return auth

  const parsed = parseBody(createSchema, await req.json())
  if (parsed.error) return parsed.error

  const entry = await prisma.turnawayTracking.create({
    data: {
      hostId: auth.user.hostId,
      data: new Date(parsed.data.data),
      trattamentoId: parsed.data.trattamentoId ?? null,
      motivo: parsed.data.motivo,
      guestNome: parsed.data.guestNome ?? null,
      note: parsed.data.note ?? null,
    },
    include: {
      trattamento: { select: { id: true, nome: true } },
    },
  })

  return NextResponse.json(entry, { status: 201 })
}
