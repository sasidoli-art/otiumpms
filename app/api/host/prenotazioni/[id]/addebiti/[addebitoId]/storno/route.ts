import { NextRequest, NextResponse } from 'next/server'
import { requireHostOrAdmin, isUnauthorized } from '@/lib/auth-middleware'
import { auditFromAuth } from '@/lib/audit'
import { prisma } from '@/lib/db'

/**
 * POST /api/host/prenotazioni/[id]/addebiti/[addebitoId]/storno
 *
 * Crea un addebito negativo (storno) che annulla l'addebito originale.
 * L'addebito originale resta per tracciabilità.
 */
export async function POST(
  _req: NextRequest,
  { params: paramsPromise }: { params: Promise<{ id: string; addebitoId: string }> }
) {
  const { id, addebitoId } = await paramsPromise
  const auth = await requireHostOrAdmin()
  if (isUnauthorized(auth)) return auth

  // Verifica prenotazione e addebito
  const addebito = await prisma.addebitoPrenotazione.findFirst({
    where: { id: addebitoId, prenotazioneId: id, prenotazione: { hostId: auth.user.hostId } },
  })

  if (!addebito) return NextResponse.json({ error: 'Addebito non trovato' }, { status: 404 })
  if (addebito.totale <= 0) return NextResponse.json({ error: 'Già stornato' }, { status: 400 })

  // Crea storno (addebito negativo)
  const storno = await prisma.addebitoPrenotazione.create({
    data: {
      prenotazioneId: id,
      descrizione: `STORNO: ${addebito.descrizione}`,
      quantita: addebito.quantita,
      prezzoUnitario: -addebito.prezzoUnitario,
      totale: -addebito.totale,
      aliquotaIva: addebito.aliquotaIva,
      addebitatoDa: 'Storno',
    },
  })

  await auditFromAuth(auth, { azione: 'addebito.stornato', entita: 'addebito', entitaId: addebitoId, dettagli: `Storno: ${addebito.descrizione} -€${addebito.totale.toFixed(2)}` })

  return NextResponse.json(storno)
}
