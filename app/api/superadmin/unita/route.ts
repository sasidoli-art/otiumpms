import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireSuperAdmin, isUnauthorized } from '@/lib/auth-middleware'
import { audit } from '@/lib/audit'
import { z } from 'zod'

/**
 * POST /api/superadmin/unita
 * Crea una nuova UnitaPrenotabile sotto una struttura esistente.
 */
const createSchema = z.object({
  strutturaId: z.string().min(1),
  nome: z.string().min(1).max(255),
  capacita: z.coerce.number().int().min(1).max(50).optional().default(1),
  lettiExtra: z.coerce.number().int().min(0).max(10).optional().default(0),
  piano: z.coerce.number().int().optional().nullable(),
  prezzoBase: z.coerce.number().min(0).optional().default(0),
  attiva: z.boolean().optional().default(true),
})

export async function POST(req: NextRequest) {
  const auth = await requireSuperAdmin()
  if (isUnauthorized(auth)) return auth

  const raw = await req.json().catch(() => null)
  if (!raw) return NextResponse.json({ error: 'Body non valido' }, { status: 400 })

  const parsed = createSchema.safeParse(raw)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Dati non validi', details: parsed.error.flatten() }, { status: 422 })
  }
  const d = parsed.data

  const struttura = await prisma.struttura.findUnique({
    where: { id: d.strutturaId },
    select: { id: true, hostId: true, nome: true },
  })
  if (!struttura) return NextResponse.json({ error: 'Struttura non trovata' }, { status: 404 })

  const unita = await prisma.unitaPrenotabile.create({
    data: {
      strutturaId: d.strutturaId,
      nome: d.nome,
      capacita: d.capacita,
      lettiExtra: d.lettiExtra,
      piano: d.piano ?? null,
      prezzoBase: d.prezzoBase,
      attiva: d.attiva,
    },
  })

  await audit({
    hostId: struttura.hostId,
    userId: auth.user.id,
    userEmail: auth.user.email,
    azione: 'superadmin.unita.creata',
    entita: 'UnitaPrenotabile',
    entitaId: unita.id,
    dettagli: `Creata unità "${d.nome}" in struttura "${struttura.nome}"`,
  })

  return NextResponse.json(unita, { status: 201 })
}
