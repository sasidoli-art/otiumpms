import { NextResponse } from 'next/server'
import { requireHost, isUnauthorized } from '@/lib/auth-middleware'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

/**
 * POST /api/host/notifiche/mark-all-read
 * Marca tutte le notifiche non lette dell'host come lette.
 */
export async function POST() {
  const auth = await requireHost()
  if (isUnauthorized(auth)) return auth

  const hostId = auth.user.hostId!

  const result = await prisma.notifica.updateMany({
    where: { hostId, letta: false },
    data: { letta: true },
  })

  return NextResponse.json({ aggiornate: result.count })
}
