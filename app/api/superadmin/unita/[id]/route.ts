import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireSuperAdmin, isUnauthorized } from '@/lib/auth-middleware'
import { audit } from '@/lib/audit'
import { z } from 'zod'

/**
 * PATCH /api/superadmin/unita/[id]
 * Modifica una unità esistente (nome, capacità, posti letto, prezzo, piano).
 */
const patchSchema = z.object({
  nome: z.string().min(1).max(255).optional(),
  capacita: z.coerce.number().int().min(1).max(50).optional(),
  lettiExtra: z.coerce.number().int().min(0).max(10).optional(),
  piano: z.coerce.number().int().optional().nullable(),
  prezzoBase: z.coerce.number().min(0).optional(),
  attiva: z.boolean().optional(),
})

export async function PATCH(
  req: NextRequest,
  { params: paramsPromise }: { params: Promise<{ id: string }> }
) {
  const auth = await requireSuperAdmin()
  if (isUnauthorized(auth)) return auth

  const { id } = await paramsPromise
  const unita = await prisma.unitaPrenotabile.findUnique({
    where: { id },
    select: { id: true, nome: true, struttura: { select: { hostId: true, nome: true } } },
  })
  if (!unita) return NextResponse.json({ error: 'Unità non trovata' }, { status: 404 })

  const raw = await req.json().catch(() => null)
  if (!raw) return NextResponse.json({ error: 'Body non valido' }, { status: 400 })

  const parsed = patchSchema.safeParse(raw)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Dati non validi', details: parsed.error.flatten() }, { status: 422 })
  }

  const data: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(parsed.data)) {
    if (v !== undefined) data[k] = v
  }

  const updated = await prisma.unitaPrenotabile.update({ where: { id }, data })

  await audit({
    hostId: unita.struttura.hostId,
    userId: auth.user.id,
    userEmail: auth.user.email,
    azione: 'superadmin.unita.aggiornata',
    entita: 'UnitaPrenotabile',
    entitaId: id,
    dettagli: `Modificata "${unita.nome}" in "${unita.struttura.nome}" (${Object.keys(data).join(', ')})`,
  })

  return NextResponse.json(updated)
}

/**
 * DELETE /api/superadmin/unita/[id]
 * Elimina una unità. CASCADE su prenotazioni relative.
 */
export async function DELETE(
  _req: NextRequest,
  { params: paramsPromise }: { params: Promise<{ id: string }> }
) {
  const auth = await requireSuperAdmin()
  if (isUnauthorized(auth)) return auth

  const { id } = await paramsPromise
  const unita = await prisma.unitaPrenotabile.findUnique({
    where: { id },
    select: { id: true, nome: true, struttura: { select: { hostId: true } } },
  })
  if (!unita) return NextResponse.json({ error: 'Unità non trovata' }, { status: 404 })

  await prisma.unitaPrenotabile.delete({ where: { id } })

  await audit({
    hostId: unita.struttura.hostId,
    userId: auth.user.id,
    userEmail: auth.user.email,
    azione: 'superadmin.unita.eliminata',
    entita: 'UnitaPrenotabile',
    entitaId: id,
    dettagli: `Eliminata unità "${unita.nome}"`,
  })

  return NextResponse.json({ ok: true })
}
