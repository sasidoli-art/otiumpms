import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireHost, isUnauthorized } from '@/lib/auth-middleware'
import { auditFromAuth } from '@/lib/audit'
import { prisma } from '@/lib/db'
import { parseBody } from '@/lib/validations'

// ─── Zod schema per PATCH ────────────────────────────────────────────────────

const chiusuraPatchSchema = z.object({
  noteRiconciliazione: z.string().max(2000).optional().nullable(),
  fondoCassaFine: z.number().min(0).optional().nullable(),
  riconciliato: z.boolean().optional(),
})

// ─── GET: Singola chiusura con dettagli ──────────────────────────────────────

export async function GET(
  _req: NextRequest,
  { params: p }: { params: Promise<{ id: string }> },
) {
  const { id } = await p
  const auth = await requireHost()
  if (isUnauthorized(auth)) return auth

  const chiusura = await prisma.chiusuraCassa.findFirst({
    where: { id, hostId: auth.user.hostId },
  })

  if (!chiusura) {
    return NextResponse.json({ error: 'Non trovato' }, { status: 404 })
  }

  // Carica gli incassi associati a questa chiusura
  const incassi = await prisma.incasso.findMany({
    where: { chiusuraCassaId: id, hostId: auth.user.hostId },
    orderBy: { data: 'asc' },
  })

  return NextResponse.json({ ...chiusura, incassi })
}

// ─── PATCH: Aggiorna note riconciliazione / fondoCassaFine ───────────────────

export async function PATCH(
  req: NextRequest,
  { params: p }: { params: Promise<{ id: string }> },
) {
  const { id } = await p
  const auth = await requireHost()
  if (isUnauthorized(auth)) return auth

  const existing = await prisma.chiusuraCassa.findFirst({
    where: { id, hostId: auth.user.hostId },
  })
  if (!existing) {
    return NextResponse.json({ error: 'Non trovato' }, { status: 404 })
  }

  const parsed = parseBody(chiusuraPatchSchema, await req.json())
  if (parsed.error) return parsed.error
  const body = parsed.data

  // Ricalcola differenza se fondoCassaFine viene aggiornato
  const fondoCassaFine = body.fondoCassaFine !== undefined
    ? body.fondoCassaFine
    : existing.fondoCassaFine

  const differenza = fondoCassaFine !== null && fondoCassaFine !== undefined
    ? fondoCassaFine - ((existing.fondoCassaInizio ?? 0) + existing.totaleContanti)
    : existing.differenza

  const updated = await prisma.chiusuraCassa.update({
    where: { id },
    data: {
      ...(body.noteRiconciliazione !== undefined && { noteRiconciliazione: body.noteRiconciliazione }),
      ...(body.fondoCassaFine !== undefined && { fondoCassaFine: body.fondoCassaFine }),
      ...(body.riconciliato !== undefined && { riconciliato: body.riconciliato }),
      differenza,
    },
  })

  return NextResponse.json(updated)
}
