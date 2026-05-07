import { NextRequest, NextResponse } from 'next/server'
import { requireHost, isUnauthorized } from '@/lib/auth-middleware'
import { prisma } from '@/lib/db'

/**
 * POST /api/host/magazzino/[id]/movimento
 * Registra carico, scarico, rettifica o consumo.
 * Body: { tipo: "CARICO"|"SCARICO"|"RETTIFICA"|"CONSUMO", quantita: number, motivo?: string }
 */
export async function POST(
  req: NextRequest,
  { params: paramsPromise }: { params: Promise<{ id: string }> },
) {
  const auth = await requireHost()
  if (isUnauthorized(auth)) return auth
  const { id } = await paramsPromise

  const articolo = await prisma.articoloMagazzino.findFirst({ where: { id, hostId: auth.user.hostId } })
  if (!articolo) return NextResponse.json({ error: 'Non trovato' }, { status: 404 })

  const body = await req.json()
  const { tipo, quantita, motivo } = body

  if (!tipo || !['CARICO', 'SCARICO', 'RETTIFICA', 'CONSUMO'].includes(tipo)) {
    return NextResponse.json({ error: 'Tipo deve essere CARICO, SCARICO, RETTIFICA o CONSUMO' }, { status: 400 })
  }
  if (!quantita || quantita === 0) {
    return NextResponse.json({ error: 'Quantità obbligatoria e diversa da zero' }, { status: 400 })
  }

  // Calcola variazione: carico/rettifica positivo, scarico/consumo negativo
  const delta = (tipo === 'CARICO' || tipo === 'RETTIFICA')
    ? Math.abs(quantita)
    : -Math.abs(quantita)

  const nuovaQuantita = Math.max(0, articolo.quantita + delta)

  // Crea movimento + aggiorna giacenza in transazione
  const [movimento] = await prisma.$transaction([
    prisma.movimentoMagazzino.create({
      data: {
        articoloId: id,
        tipo,
        quantita: delta,
        motivo: motivo || null,
        operatore: auth.user.name || auth.user.email,
      },
    }),
    prisma.articoloMagazzino.update({
      where: { id },
      data: { quantita: nuovaQuantita },
    }),
  ])

  return NextResponse.json({
    movimento,
    giacenzaAttuale: nuovaQuantita,
    sottoScorta: articolo.scorteMinime > 0 && nuovaQuantita <= articolo.scorteMinime,
  })
}
