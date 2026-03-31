import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { requireHostOrAdmin, isUnauthorized } from '@/lib/auth-middleware'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

// PATCH /api/host/strutture/[id]/impostazioni
export async function PATCH(req: NextRequest, { params: paramsPromise }: { params: Promise<{ id: string }> }) {
  const params = await paramsPromise
  const auth = await requireHostOrAdmin()
  if (isUnauthorized(auth)) return auth
  const session = auth

  const existing = await prisma.struttura.findFirst({
    where: { id: params.id, hostId: auth.user.hostId },
  })
  if (!existing) return NextResponse.json({ error: 'Non trovata' }, { status: 404 })

  const body = await req.json()

  const struttura = await prisma.struttura.update({
    where: { id: params.id },
    data: {
      alloggiatiAbilitato:         body.alloggiatiAbilitato         ?? existing.alloggiatiAbilitato,
      alloggiatiCodiceStruttura:   body.alloggiatiCodiceStruttura   ?? existing.alloggiatiCodiceStruttura,
      alloggiatiComuneIstat:       body.alloggiatiComuneIstat       ?? existing.alloggiatiComuneIstat,
      alloggiatiDenominazioneComune: body.alloggiatiDenominazioneComune ?? existing.alloggiatiDenominazioneComune,
    },
    select: {
      id: true,
      alloggiatiAbilitato: true,
      alloggiatiCodiceStruttura: true,
      alloggiatiComuneIstat: true,
      alloggiatiDenominazioneComune: true,
    },
  })

  return NextResponse.json(struttura)
}
