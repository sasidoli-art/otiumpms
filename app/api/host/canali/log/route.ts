import { NextResponse } from 'next/server'
import { requireHost, isUnauthorized } from '@/lib/auth-middleware'
import { prisma } from '@/lib/db'

/**
 * GET /api/host/canali/log
 *
 * Log degli ultimi sync per l'host corrente.
 * Fonte: campi `CanaleEsterno.ultimoSync*` + `eventiImportati`.
 * Non abbiamo uno storico dettagliato per sync, quindi mostriamo lo stato
 * attuale per canale, ordinato per `ultimoSync` desc.
 */
export async function GET() {
  const auth = await requireHost()
  if (isUnauthorized(auth)) return auth

  const canali = await prisma.canaleEsterno.findMany({
    where: { struttura: { hostId: auth.user.hostId } },
    select: {
      id: true,
      nome: true,
      colore: true,
      ultimoSync: true,
      ultimoSyncOk: true,
      ultimoSyncError: true,
      eventiImportati: true,
      struttura: { select: { nome: true } },
      unita: { select: { nome: true } },
    },
    orderBy: [{ ultimoSync: 'desc' }],
    take: 20,
  })

  return NextResponse.json(canali)
}
