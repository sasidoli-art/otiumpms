import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

/**
 * GET /api/book/[strutturaId]/spa/trattamenti
 * Public — returns treatments marked as prenotabileOnline for the host that owns the struttura.
 */
export async function GET(
  _req: NextRequest,
  { params: paramsPromise }: { params: Promise<{ strutturaId: string }> }
) {
  const params = await paramsPromise

  const struttura = await prisma.struttura.findFirst({
    where: { id: params.strutturaId, attiva: true },
    select: { hostId: true },
  })
  if (!struttura) return NextResponse.json({ error: 'Struttura non trovata' }, { status: 404 })

  const [trattamenti, percorsi] = await Promise.all([
    prisma.trattamentoSpa.findMany({
      where: { hostId: struttura.hostId, attivo: true, prenotabileOnline: true },
      select: { id: true, nome: true, categoria: true, durata: true, prezzo: true, descrizione: true, colore: true },
      orderBy: [{ categoria: 'asc' }, { nome: 'asc' }],
    }),
    prisma.percorsoBenessere.findMany({
      where: { hostId: struttura.hostId, attivo: true },
      select: { id: true, nome: true, durataMinuti: true, prezzo: true, descrizione: true, colore: true },
      orderBy: { nome: 'asc' },
    }),
  ])

  return NextResponse.json({ trattamenti, percorsi })
}
