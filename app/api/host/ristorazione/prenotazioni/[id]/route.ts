import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireHost, isUnauthorized } from '@/lib/auth-middleware'
import { prisma } from '@/lib/db'
import { parseBody } from '@/lib/validations'
import { audit } from '@/lib/audit'

export const dynamic = 'force-dynamic'

const patchSchema = z.object({
  stato: z.enum(['CONFERMATA', 'ANNULLATA', 'COMPLETATA', 'NO_SHOW']),
})

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireHost()
  if (isUnauthorized(auth)) return auth
  const { hostId } = auth.user
  const { id } = await params

  const raw = await req.json().catch(() => null)
  const parsed = parseBody(patchSchema, raw)
  if (parsed.error) return parsed.error

  // Multi-tenant isolation
  const existing = await prisma.prenotazioneRistorante.findFirst({
    where: { id, hostId },
    select: { id: true, stato: true, guestNome: true, guestCognome: true },
  })
  if (!existing) {
    return NextResponse.json({ error: 'Prenotazione non trovata' }, { status: 404 })
  }

  const updated = await prisma.prenotazioneRistorante.update({
    where: { id },
    data: { stato: parsed.data.stato },
  })

  await audit({
    hostId,
    azione: 'ristorante.prenotazione_stato_cambiato',
    entita: 'prenotazione_ristorante',
    entitaId: id,
    dettagli: `${existing.guestNome} ${existing.guestCognome}: ${existing.stato} → ${parsed.data.stato}`,
  }).catch(() => { /* non blocca */ })

  return NextResponse.json({ prenotazione: updated })
}
