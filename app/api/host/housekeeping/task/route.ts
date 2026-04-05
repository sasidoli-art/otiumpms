import { z } from 'zod'
import { getServerSession } from 'next-auth'
import { requireHostOrAdmin, isUnauthorized } from '@/lib/auth-middleware'
import { auditFromAuth } from '@/lib/audit'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { NextResponse } from 'next/server'

const createTaskSchema = z.object({
  unitaId: z.string().min(1),
  tipo: z.string().optional(),
  descrizione: z.string().optional().nullable(),
  priorita: z.enum(['BASSA', 'NORMALE', 'ALTA', 'URGENTE']).optional(),
  assegnatoA: z.string().optional().nullable(),
  dataScadenza: z.string().optional().nullable(),
})

// POST /api/host/housekeeping/task  — crea task
export async function POST(req: Request) {
  const auth = await requireHostOrAdmin()
  if (isUnauthorized(auth)) return auth
  const session = auth

  const raw = await req.json()
  const parsed = createTaskSchema.safeParse(raw)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Dati non validi', details: parsed.error.flatten() }, { status: 422 })
  }
  const { unitaId, tipo, descrizione, priorita, assegnatoA, dataScadenza } = parsed.data

  // Verifica ownership unità
  const unita = await prisma.unitaPrenotabile.findFirst({
    where: { id: unitaId, struttura: { hostId: auth.user.hostId } },
  })
  if (!unita) return NextResponse.json({ error: 'Unità non trovata' }, { status: 404 })

  const task = await prisma.taskHK.create({
    data: {
      unitaId,
      hostId: auth.user.hostId,
      tipo: tipo ?? 'PULIZIA',
      descrizione: descrizione ?? null,
      priorita: priorita ?? 'NORMALE',
      assegnatoA: assegnatoA ?? null,
      dataScadenza: dataScadenza ? new Date(dataScadenza) : null,
    },
  })

  return NextResponse.json(task, { status: 201 })
}

// GET /api/host/housekeeping/task?completato=false
export async function GET(req: Request) {
  const auth = await requireHostOrAdmin()
  if (isUnauthorized(auth)) return auth
  const session = auth

  const { searchParams } = new URL(req.url)
  const soloAperti = searchParams.get('completato') !== 'true'

  const tasks = await prisma.taskHK.findMany({
    where: {
      hostId: auth.user.hostId,
      ...(soloAperti ? { completato: false } : {}),
    },
    include: {
      unita: {
        select: {
          nome: true,
          struttura: { select: { nome: true } },
        },
      },
    },
    orderBy: [{ priorita: 'desc' }, { createdAt: 'asc' }],
  })

  return NextResponse.json(tasks)
}
