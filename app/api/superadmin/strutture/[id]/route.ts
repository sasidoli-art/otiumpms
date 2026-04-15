import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireSuperAdmin, isUnauthorized } from '@/lib/auth-middleware'
import { audit } from '@/lib/audit'
import { z } from 'zod'

/**
 * PATCH /api/superadmin/strutture/[id]
 * Modifica i campi di una struttura esistente.
 */
const patchSchema = z.object({
  nome: z.string().min(1).max(255).optional(),
  tipo: z.enum(['EVENTO', 'VENUE', 'ESPERIENZA', 'ALLOGGIO', 'SERVIZIO']).optional(),
  descrizione: z.string().max(4096).optional().nullable(),
  indirizzo: z.string().max(255).optional().nullable(),
  citta: z.string().max(100).optional().nullable(),
  regione: z.string().max(100).optional().nullable(),
  capacitaTotale: z.coerce.number().int().min(1).max(10000).optional(),
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
  const struttura = await prisma.struttura.findUnique({
    where: { id },
    select: { id: true, hostId: true, nome: true },
  })
  if (!struttura) return NextResponse.json({ error: 'Struttura non trovata' }, { status: 404 })

  const raw = await req.json().catch(() => null)
  if (!raw) return NextResponse.json({ error: 'Body non valido' }, { status: 400 })

  const parsed = patchSchema.safeParse(raw)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Dati non validi', details: parsed.error.flatten() }, { status: 422 })
  }

  const data: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(parsed.data)) {
    if (v !== undefined) data[k] = v === '' ? null : v
  }

  const updated = await prisma.struttura.update({
    where: { id },
    data,
  })

  await audit({
    hostId: struttura.hostId,
    userId: auth.user.id,
    userEmail: auth.user.email,
    azione: 'superadmin.struttura.aggiornata',
    entita: 'Struttura',
    entitaId: id,
    dettagli: `Modificata "${struttura.nome}" (${Object.keys(data).join(', ')})`,
  })

  return NextResponse.json(updated)
}

/**
 * DELETE /api/superadmin/strutture/[id]
 * Elimina una struttura (CASCADE su unità, prenotazioni, ecc.)
 * Richiede ?confirm=NOME_STRUTTURA.
 */
export async function DELETE(
  req: NextRequest,
  { params: paramsPromise }: { params: Promise<{ id: string }> }
) {
  const auth = await requireSuperAdmin()
  if (isUnauthorized(auth)) return auth

  const { id } = await paramsPromise
  const struttura = await prisma.struttura.findUnique({
    where: { id },
    select: { id: true, hostId: true, nome: true },
  })
  if (!struttura) return NextResponse.json({ error: 'Struttura non trovata' }, { status: 404 })

  const url = new URL(req.url)
  const confirm = url.searchParams.get('confirm')
  if (confirm !== struttura.nome) {
    return NextResponse.json(
      { error: `Per confermare la cancellazione, aggiungi ?confirm=${struttura.nome}` },
      { status: 400 }
    )
  }

  await prisma.struttura.delete({ where: { id } })

  await audit({
    hostId: struttura.hostId,
    userId: auth.user.id,
    userEmail: auth.user.email,
    azione: 'superadmin.struttura.eliminata',
    entita: 'Struttura',
    entitaId: id,
    dettagli: `Eliminata "${struttura.nome}" (CASCADE)`,
  })

  return NextResponse.json({ ok: true })
}
