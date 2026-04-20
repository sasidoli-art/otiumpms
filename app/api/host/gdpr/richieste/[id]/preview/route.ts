import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireHost, isUnauthorized } from '@/lib/auth-middleware'
import { cancellaTuttiDatiOspite } from '@/lib/gdpr-retention'

/**
 * GET /api/host/gdpr/richieste/[id]/preview
 * Ritorna il report di cosa verrà cancellato/conservato senza applicare nulla.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireHost()
  if (isUnauthorized(auth)) return auth
  const { id } = await params

  const richiesta = await prisma.richiestaCancellazione.findFirst({
    where: { id, hostId: auth.user.hostId },
    select: { id: true, guestEmail: true, stato: true },
  })
  if (!richiesta) return NextResponse.json({ error: 'Non trovata' }, { status: 404 })

  const preview = await cancellaTuttiDatiOspite(auth.user.hostId, richiesta.guestEmail, {
    dryRun: true,
  })
  return NextResponse.json({ richiestaId: id, stato: richiesta.stato, preview })
}
