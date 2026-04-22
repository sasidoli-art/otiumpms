import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdmin, isUnauthorized } from '@/lib/auth-middleware'
import { prisma } from '@/lib/db'
import { auditFromAuth } from '@/lib/audit'
import { CATALOGO_MODULI, parseModuli } from '@/lib/moduli'

const schema = z.object({
  moduliAttivi: z.record(z.string(), z.boolean()),
})

// PATCH /api/admin/host/[id]/moduli — override manuale moduli attivi
export async function PATCH(
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

  const host = await prisma.host.findUnique({ where: { id }, select: { id: true, nomeAzienda: true, moduliAttivi: true } })
  if (!host) return NextResponse.json({ error: 'Non trovato' }, { status: 404 })

  // Filtra solo moduli validi dal catalogo
  const validIds = new Set(CATALOGO_MODULI.map((m) => m.id))
  const sanitized: Record<string, boolean> = {}
  for (const [k, v] of Object.entries(parsed.data.moduliAttivi)) {
    if (validIds.has(k)) sanitized[k] = v
  }

  const updated = await prisma.host.update({
    where: { id },
    data: { moduliAttivi: sanitized },
  })

  // Diff changes for audit
  const prev = parseModuli(host.moduliAttivi)
  const diffs: string[] = []
  for (const m of CATALOGO_MODULI) {
    const was = prev[m.id] === true
    const now = sanitized[m.id] === true
    if (was !== now) diffs.push(`${m.id}: ${was ? 'on→off' : 'off→on'}`)
  }

  await auditFromAuth(auth, {
    azione: 'host.moduli.aggiornati',
    entita: 'host',
    entitaId: id,
    dettagli: `Moduli override per ${host.nomeAzienda}: ${diffs.join(', ') || 'nessun cambio'}`,
  })

  return NextResponse.json({ ok: true, moduliAttivi: sanitized, host: updated })
}
