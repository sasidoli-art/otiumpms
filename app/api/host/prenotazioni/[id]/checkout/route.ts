import { getServerSession } from 'next-auth'
import { requireHostOrAdmin, isUnauthorized } from '@/lib/auth-middleware'
import { auditFromAuth } from '@/lib/audit'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { NextResponse } from 'next/server'
import { incrementStatsOnCheckout } from '@/lib/crm'

export async function POST(
  req: Request,
  { params: paramsPromise }: { params: Promise<{ id: string }> }
) {
  const auth = await requireHostOrAdmin()
  if (isUnauthorized(auth)) return auth
  const session = auth

  const params = await paramsPromise

  const prenotazione = await prisma.prenotazione.findFirst({
    where: { id: params.id, hostId: auth.user.hostId },
  })
  if (!prenotazione) {
    return NextResponse.json({ error: 'Non trovata' }, { status: 404 })
  }

  if (prenotazione.stato !== 'CONFERMATA') {
    return NextResponse.json(
      { error: `Check-out disponibile solo per prenotazioni CONFERMATA (stato attuale: ${prenotazione.stato})` },
      { status: 400 }
    )
  }

  const aggiornata = await prisma.prenotazione.update({
    where: { id: params.id },
    data: { stato: 'COMPLETATA' },
  })

  // Aggiorna statistiche CRM (numSoggiorni, totaleSpeso, dataUltimoSoggiorno)
  incrementStatsOnCheckout(auth.user.hostId, params.id).catch(() => {})

  return NextResponse.json(aggiornata)
}
