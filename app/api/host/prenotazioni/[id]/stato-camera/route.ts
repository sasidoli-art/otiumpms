import { NextRequest, NextResponse } from 'next/server'
import { requireHostOrAdmin, isUnauthorized } from '@/lib/auth-middleware'
import { auditFromAuth } from '@/lib/audit'
import { prisma } from '@/lib/db'

/**
 * GET /api/host/prenotazioni/[id]/stato-camera
 *
 * Restituisce lo stato HK della camera assegnata alla prenotazione.
 */
export async function GET(_req: NextRequest, { params: paramsPromise }: { params: Promise<{ id: string }> }) {
  const params = await paramsPromise
  const auth = await requireHostOrAdmin()
  if (isUnauthorized(auth)) return auth

  const prenotazione = await prisma.prenotazione.findFirst({
    where: { id: params.id, hostId: auth.user.hostId },
    select: { unitaId: true },
  })

  if (!prenotazione?.unitaId) {
    return NextResponse.json(null)
  }

  const unita = await prisma.unitaPrenotabile.findUnique({
    where: { id: prenotazione.unitaId },
    select: {
      nome: true,
      statoHK: true,
      piano: true,
      noteHK: true,
      ultimaPulizia: true,
    },
  })

  if (!unita) return NextResponse.json(null)

  return NextResponse.json({
    nome: unita.nome,
    statoHK: unita.statoHK,
    piano: unita.piano,
    noteHK: unita.noteHK ?? null,
    ultimaPulizia: unita.ultimaPulizia
      ? new Intl.DateTimeFormat('it-IT', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(unita.ultimaPulizia)
      : null,
  })
}
