import { NextRequest, NextResponse } from 'next/server'
import { requireHost, isUnauthorized } from '@/lib/auth-middleware'
import { auditFromAuth } from '@/lib/audit'
import { prisma } from '@/lib/db'

/**
 * GET /api/host/strutture/[id]/pasti
 * Configurazione pasti della struttura (colazione, pranzo, cena).
 */
export async function GET(
  _: NextRequest,
  { params: paramsPromise }: { params: Promise<{ id: string }> },
) {
  const auth = await requireHost()
  if (isUnauthorized(auth)) return auth
  const { id } = await paramsPromise

  const struttura = await prisma.struttura.findFirst({
    where: { id, hostId: auth.user.hostId },
    select: { id: true, nome: true },
  })
  if (!struttura) return NextResponse.json({ error: 'Struttura non trovata' }, { status: 404 })

  const config = await prisma.configPastoStruttura.findMany({
    where: { strutturaId: id },
    orderBy: { tipoPasto: 'asc' },
  })

  return NextResponse.json(config)
}

/**
 * POST /api/host/strutture/[id]/pasti
 * Crea o aggiorna la configurazione di un pasto.
 * Body: { tipoPasto, disponibile, orarioInizio, orarioFine, prezzo, prezzoRidotto, luogo, note }
 */
export async function POST(
  req: NextRequest,
  { params: paramsPromise }: { params: Promise<{ id: string }> },
) {
  const auth = await requireHost()
  if (isUnauthorized(auth)) return auth
  const { id } = await paramsPromise

  const struttura = await prisma.struttura.findFirst({
    where: { id, hostId: auth.user.hostId },
    select: { id: true },
  })
  if (!struttura) return NextResponse.json({ error: 'Struttura non trovata' }, { status: 404 })

  const body = await req.json()
  const { tipoPasto, disponibile, orarioInizio, orarioFine, prezzo, prezzoRidotto, luogo, note } = body

  if (!tipoPasto || !['COLAZIONE', 'PRANZO', 'CENA'].includes(tipoPasto)) {
    return NextResponse.json({ error: 'tipoPasto deve essere COLAZIONE, PRANZO o CENA' }, { status: 400 })
  }

  const config = await prisma.configPastoStruttura.upsert({
    where: { strutturaId_tipoPasto: { strutturaId: id, tipoPasto } },
    update: {
      disponibile: disponibile ?? true,
      orarioInizio: orarioInizio || null,
      orarioFine: orarioFine || null,
      prezzo: prezzo ?? 0,
      prezzoRidotto: prezzoRidotto ?? null,
      luogo: luogo || null,
      note: note || null,
    },
    create: {
      strutturaId: id,
      tipoPasto,
      disponibile: disponibile ?? true,
      orarioInizio: orarioInizio || null,
      orarioFine: orarioFine || null,
      prezzo: prezzo ?? 0,
      prezzoRidotto: prezzoRidotto ?? null,
      luogo: luogo || null,
      note: note || null,
    },
  })

  return NextResponse.json(config)
}
