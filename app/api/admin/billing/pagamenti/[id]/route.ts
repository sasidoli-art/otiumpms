import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdmin, isUnauthorized } from '@/lib/auth-middleware'
import { prisma } from '@/lib/db'
import { auditFromAuth } from '@/lib/audit'

type RouteParams = { params: Promise<{ id: string }> }

const updateSchema = z.object({
  stato: z.enum(['PAGATO', 'PENDENTE', 'FALLITO', 'RIMBORSATO']).optional(),
  riferimento: z.string().max(200).nullable().optional(),
  note: z.string().max(1000).nullable().optional(),
})

// PATCH /api/admin/billing/pagamenti/[id]
export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const auth = await requireAdmin()
  if (isUnauthorized(auth)) return auth
  const { id } = await params

  const raw = await req.json().catch(() => ({}))
  const parsed = updateSchema.safeParse(raw)
  if (!parsed.success) return NextResponse.json({ error: 'Dati non validi' }, { status: 422 })

  const existing = await prisma.pagamentoPiattaforma.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: 'Non trovato' }, { status: 404 })

  const updated = await prisma.pagamentoPiattaforma.update({
    where: { id },
    data: parsed.data,
  })

  await auditFromAuth(auth, {
    azione: 'pagamento_piattaforma.aggiornato',
    entita: 'pagamentoPiattaforma',
    entitaId: id,
    dettagli: `Pagamento €${existing.importo}: ${Object.keys(parsed.data).join(', ')}`,
  })

  return NextResponse.json(updated)
}

// DELETE /api/admin/billing/pagamenti/[id]
export async function DELETE(_: NextRequest, { params }: RouteParams) {
  const auth = await requireAdmin()
  if (isUnauthorized(auth)) return auth
  const { id } = await params

  const existing = await prisma.pagamentoPiattaforma.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: 'Non trovato' }, { status: 404 })

  await prisma.pagamentoPiattaforma.delete({ where: { id } })

  await auditFromAuth(auth, {
    azione: 'pagamento_piattaforma.eliminato',
    entita: 'pagamentoPiattaforma',
    entitaId: id,
    dettagli: `Pagamento €${existing.importo} host=${existing.hostId} eliminato`,
  })

  return NextResponse.json({ ok: true })
}
