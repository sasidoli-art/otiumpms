import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireHost, isUnauthorized } from '@/lib/auth-middleware'
import { audit } from '@/lib/audit'

/**
 * POST /api/host/prenotazioni/[id]/verifica-checkin
 *
 * Operatore reception conferma di aver verificato fisicamente il documento
 * dell'ospite. Sposta lo stato check-in da ONLINE_COMPLETATO a VERIFICATO.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireHost()
  if (isUnauthorized(auth)) return auth
  const hostId = auth.user.hostId

  const { id } = await params

  const prenotazione = await prisma.prenotazione.findFirst({
    where: { id, hostId },
    select: { id: true, statoCheckIn: true, guestNome: true, guestCognome: true },
  })
  if (!prenotazione) {
    return NextResponse.json({ error: 'Prenotazione non trovata' }, { status: 404 })
  }

  if (prenotazione.statoCheckIn === 'VERIFICATO') {
    return NextResponse.json({ error: 'Già verificato' }, { status: 400 })
  }

  await prisma.prenotazione.update({
    where: { id },
    data: {
      statoCheckIn: 'VERIFICATO',
      verificatoAt: new Date(),
      verificatoDa: auth.user.id,
      checkInCompletato: true,
    },
  })

  await audit({
    hostId,
    userId: auth.user.id,
    userEmail: auth.user.email,
    azione: 'verifica-checkin',
    entita: 'Prenotazione',
    entitaId: id,
    dettagli: `Documento verificato in reception per ${prenotazione.guestNome} ${prenotazione.guestCognome}`,
  })

  return NextResponse.json({ ok: true })
}
