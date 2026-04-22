import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdmin, isUnauthorized } from '@/lib/auth-middleware'
import { prisma } from '@/lib/db'
import { auditFromAuth } from '@/lib/audit'

const schema = z.object({
  sospendi: z.boolean(),
  motivo: z.string().max(500).optional(),
})

// POST /api/admin/host/[id]/sospendi
// body: { sospendi: true | false, motivo?: string }
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin()
  if (isUnauthorized(auth)) return auth
  const { id } = await params

  const raw = await req.json().catch(() => ({}))
  const parsed = schema.safeParse(raw)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Dati non validi' }, { status: 422 })
  }
  const { sospendi, motivo } = parsed.data

  const host = await prisma.host.findUnique({ where: { id }, select: { id: true, nomeAzienda: true, statoAbbonamento: true } })
  if (!host) return NextResponse.json({ error: 'Non trovato' }, { status: 404 })

  const updated = await prisma.host.update({
    where: { id },
    data: {
      statoAbbonamento: sospendi ? 'SOSPESO' : 'ATTIVO',
    },
  })

  await auditFromAuth(auth, {
    azione: sospendi ? 'host.sospeso' : 'host.riattivato',
    entita: 'host',
    entitaId: id,
    dettagli: `${host.nomeAzienda}: ${host.statoAbbonamento}→${updated.statoAbbonamento}${motivo ? ` · motivo: ${motivo}` : ''}`,
  })

  return NextResponse.json({ ok: true, statoAbbonamento: updated.statoAbbonamento })
}
