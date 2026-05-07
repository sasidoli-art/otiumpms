import { NextRequest, NextResponse } from 'next/server'
import { requireHost, isUnauthorized } from '@/lib/auth-middleware'
import { prisma } from '@/lib/db'

/**
 * PATCH /api/host/spa/cabine/[id]/hk
 * Aggiorna stato housekeeping di una cabina SPA.
 * Body: { statoHK: "PULITA"|"OCCUPATA"|"IN_PULIZIA"|"NON_DISPONIBILE", noteHK?: string }
 */
export async function PATCH(
  req: NextRequest,
  { params: paramsPromise }: { params: Promise<{ id: string }> },
) {
  const auth = await requireHost()
  if (isUnauthorized(auth)) return auth
  const { id } = await paramsPromise

  const cabina = await prisma.cabinaSpa.findFirst({
    where: { id, hostId: auth.user.hostId },
  })
  if (!cabina) return NextResponse.json({ error: 'Cabina non trovata' }, { status: 404 })

  const body = await req.json()
  const { statoHK, noteHK } = body

  const data: Record<string, unknown> = {}
  if (statoHK) data.statoHK = statoHK
  if (noteHK !== undefined) data.noteHK = noteHK

  // Se marcata come PULITA, aggiorna timestamp
  if (statoHK === 'PULITA') {
    data.ultimaPulizia = new Date()
  }

  const updated = await prisma.cabinaSpa.update({ where: { id }, data })

  return NextResponse.json({
    id: updated.id,
    nome: updated.nome,
    statoHK: updated.statoHK,
    ultimaPulizia: updated.ultimaPulizia,
  })
}
