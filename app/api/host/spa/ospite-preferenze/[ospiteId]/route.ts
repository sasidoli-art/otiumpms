import { NextRequest, NextResponse } from 'next/server'
import { requireHostOrAdmin, isUnauthorized } from '@/lib/auth-middleware'
import { prisma } from '@/lib/db'

/**
 * GET  /api/host/spa/ospite-preferenze/[ospiteId]
 *   Returns the guest SPA preferences + full SPA treatment history
 *
 * PATCH /api/host/spa/ospite-preferenze/[ospiteId]
 *   Updates spaNote, spaAllergie, spaPreferenzeTerapistaId, spaTrattamentiPreferiti
 */
export async function GET(
  _req: NextRequest,
  { params: p }: { params: Promise<{ ospiteId: string }> }
) {
  const { ospiteId } = await p
  const auth = await requireHostOrAdmin()
  if (isUnauthorized(auth)) return auth

  const ospite = await prisma.ospiteCRM.findFirst({
    where: { id: ospiteId, hostId: auth.user.hostId },
    select: {
      id: true,
      nome: true,
      cognome: true,
      email: true,
      spaAllergie: true,
      spaNote: true,
      spaPreferenzeTerapistaId: true,
      spaPreferenzeTerapista: { select: { id: true, nome: true, cognome: true, colore: true } },
      spaTrattamentiPreferiti: true,
      appuntamentiSpa: {
        include: {
          terapista: { select: { id: true, nome: true, cognome: true } },
          cabina: { select: { id: true, nome: true } },
          trattamento: { select: { id: true, nome: true, categoria: true } },
          percorso: { select: { id: true, nome: true } },
        },
        orderBy: { dataOra: 'desc' },
        take: 20,
      },
    },
  })

  if (!ospite) return NextResponse.json({ error: 'Ospite non trovato' }, { status: 404 })

  // Statistiche SPA
  const stats = await prisma.appuntamentoSpa.aggregate({
    where: { ospiteId, hostId: auth.user.hostId, stato: { in: ['COMPLETATO'] } },
    _sum: { prezzoTotale: true },
    _count: true,
  })

  // Trattamento più frequente
  const trattamentiCount = await prisma.appuntamentoSpa.groupBy({
    by: ['trattamentoId'],
    where: { ospiteId, hostId: auth.user.hostId, trattamentoId: { not: null } },
    _count: { trattamentoId: true },
    orderBy: { _count: { trattamentoId: 'desc' } },
    take: 3,
  })

  return NextResponse.json({
    ospite,
    statistiche: {
      totaleAppuntamenti: stats._count,
      totaleSpeso: stats._sum.prezzoTotale ?? 0,
    },
    trattamentiFrequenti: trattamentiCount.map(t => ({ trattamentoId: t.trattamentoId, conteggio: t._count.trattamentoId })),
  })
}

export async function PATCH(
  req: NextRequest,
  { params: p }: { params: Promise<{ ospiteId: string }> }
) {
  const { ospiteId } = await p
  const auth = await requireHostOrAdmin()
  if (isUnauthorized(auth)) return auth

  const ospite = await prisma.ospiteCRM.findFirst({ where: { id: ospiteId, hostId: auth.user.hostId } })
  if (!ospite) return NextResponse.json({ error: 'Ospite non trovato' }, { status: 404 })

  const body = await req.json()
  const { spaAllergie, spaNote, spaPreferenzeTerapistaId, spaTrattamentiPreferiti } = body

  const updated = await prisma.ospiteCRM.update({
    where: { id: ospiteId },
    data: {
      ...(spaAllergie !== undefined && { spaAllergie: spaAllergie || null }),
      ...(spaNote !== undefined && { spaNote: spaNote || null }),
      ...(spaPreferenzeTerapistaId !== undefined && { spaPreferenzeTerapistaId: spaPreferenzeTerapistaId || null }),
      ...(spaTrattamentiPreferiti !== undefined && { spaTrattamentiPreferiti }),
    },
    select: { id: true, spaAllergie: true, spaNote: true, spaPreferenzeTerapistaId: true, spaTrattamentiPreferiti: true },
  })
  return NextResponse.json(updated)
}
