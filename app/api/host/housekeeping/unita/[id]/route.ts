import { requireHostOrAdmin, isUnauthorized } from '@/lib/auth-middleware'
import { prisma } from '@/lib/db'
import { NextResponse } from 'next/server'

// PATCH /api/host/housekeeping/unita/[id]
// Aggiorna stato HK e/o note di una unità
export async function PATCH(
  req: Request,
  { params: paramsPromise }: { params: Promise<{ id: string }> }
) {
  const auth = await requireHostOrAdmin()
  if (isUnauthorized(auth)) return auth
  const params = await paramsPromise
  const body = await req.json()

  // Verifica ownership
  const unita = await prisma.unitaPrenotabile.findFirst({
    where: { id: params.id, struttura: { hostId: auth.user.hostId } },
  })
  if (!unita) return NextResponse.json({ error: 'Non trovata' }, { status: 404 })

  const data: Record<string, unknown> = {}
  if (body.statoHK !== undefined) data.statoHK = body.statoHK
  if (body.noteHK !== undefined) data.noteHK = body.noteHK
  if (body.statoHK === 'PULITA') data.ultimaPulizia = new Date()

  const aggiornata = await prisma.unitaPrenotabile.update({
    where: { id: params.id },
    data,
  })

  return NextResponse.json(aggiornata)
}
