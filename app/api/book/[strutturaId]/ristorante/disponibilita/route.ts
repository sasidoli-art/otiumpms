import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { parseModuli } from '@/lib/moduli'
import { getSlotsDisponibilita } from '@/lib/book/ristorante'

export const dynamic = 'force-dynamic'

/**
 * GET /api/book/[strutturaId]/ristorante/disponibilita?data=YYYY-MM-DD&numPersone=2
 * Pubblico. Ritorna gli slot (HH:mm) con coperti residui + flag `disponibile`.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ strutturaId: string }> },
) {
  const { strutturaId } = await params
  const url = new URL(req.url)
  const dataYMD = url.searchParams.get('data') ?? ''
  const numPersone = Number(url.searchParams.get('numPersone') ?? '2')

  if (!/^\d{4}-\d{2}-\d{2}$/.test(dataYMD)) {
    return NextResponse.json({ error: 'Parametro data mancante o malformato (YYYY-MM-DD)' }, { status: 400 })
  }
  if (!Number.isInteger(numPersone) || numPersone < 1 || numPersone > 20) {
    return NextResponse.json({ error: 'numPersone deve essere 1-20' }, { status: 400 })
  }

  // Verifica struttura attiva + modulo ristorazione
  const struttura = await prisma.struttura.findFirst({
    where: { id: strutturaId, attiva: true },
    select: { id: true, host: { select: { moduliAttivi: true } } },
  })
  if (!struttura) {
    return NextResponse.json({ error: 'Struttura non trovata' }, { status: 404 })
  }
  const moduli = parseModuli(struttura.host.moduliAttivi)
  if (!moduli.ristorazione) {
    return NextResponse.json({ error: 'Ristorazione non attiva' }, { status: 404 })
  }

  const { slots, configs } = await getSlotsDisponibilita({ strutturaId, dataYMD, numPersone })

  return NextResponse.json({
    data: dataYMD,
    numPersone,
    slots,
    configs: configs.map((c) => ({
      tipoPasto: c.tipoPasto,
      orarioInizio: c.orarioInizio,
      orarioFine: c.orarioFine,
      luogo: c.luogo,
      maxCoperti: c.maxCoperti,
    })),
  })
}
