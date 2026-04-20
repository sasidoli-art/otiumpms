import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireHost, isUnauthorized } from '@/lib/auth-middleware'

/** GET /api/host/gdpr/richieste — lista richieste cancellazione per l'host */
export async function GET() {
  const auth = await requireHost()
  if (isUnauthorized(auth)) return auth

  const richieste = await prisma.richiestaCancellazione.findMany({
    where: { hostId: auth.user.hostId },
    orderBy: [{ stato: 'asc' }, { scadenzaAt: 'asc' }],
  })
  return NextResponse.json({ richieste })
}
