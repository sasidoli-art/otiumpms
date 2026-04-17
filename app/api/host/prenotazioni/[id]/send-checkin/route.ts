import { NextRequest, NextResponse } from 'next/server'
import { requireHost, isUnauthorized } from '@/lib/auth-middleware'
import { prisma } from '@/lib/db'
import { sendEmailPreCheckin } from '@/lib/email'
import crypto from 'crypto'

/**
 * POST /api/host/prenotazioni/[id]/send-checkin
 * Invia manualmente l'email di pre-checkin a un ospite.
 * Genera il checkInToken se non esiste.
 */
export async function POST(
  _req: NextRequest,
  { params: paramsPromise }: { params: Promise<{ id: string }> },
) {
  const auth = await requireHost()
  if (isUnauthorized(auth)) return auth

  const { id } = await paramsPromise

  const prenotazione = await prisma.prenotazione.findFirst({
    where: { id, hostId: auth.user.hostId },
    include: {
      struttura: { select: { id: true, nome: true, indirizzo: true, citta: true } },
      unita: { select: { nome: true } },
      host: { select: { id: true, nomeAzienda: true, telefono: true } },
    },
  })

  if (!prenotazione) {
    return NextResponse.json({ error: 'Prenotazione non trovata' }, { status: 404 })
  }

  if (prenotazione.stato === 'ANNULLATA' || prenotazione.stato === 'COMPLETATA') {
    return NextResponse.json({ error: 'Prenotazione non attiva' }, { status: 400 })
  }

  if (prenotazione.statoCheckIn !== 'NON_INIZIATO') {
    return NextResponse.json({ error: 'Check-in già completato o in corso' }, { status: 400 })
  }

  if (!prenotazione.guestEmail) {
    return NextResponse.json({ error: 'Ospite senza email' }, { status: 400 })
  }

  // Genera checkInToken se non esiste
  let token = prenotazione.checkInToken
  if (!token) {
    token = crypto.randomUUID()
    await prisma.prenotazione.update({
      where: { id },
      data: { checkInToken: token },
    })
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || 'http://localhost:3000'
  const checkInUrl = `${baseUrl}/checkin/${token}`

  try {
    await sendEmailPreCheckin({
      guestEmail: prenotazione.guestEmail,
      guestNome: prenotazione.guestNome,
      strutturaNome: prenotazione.struttura?.nome ?? 'La struttura',
      strutturaIndirizzo: prenotazione.struttura?.indirizzo,
      strutturaCitta: prenotazione.struttura?.citta,
      unitaNome: prenotazione.unita?.nome,
      hostNome: prenotazione.host.nomeAzienda,
      hostTelefono: prenotazione.host.telefono,
      dataArrivo: prenotazione.dataArrivo,
      dataPartenza: prenotazione.dataPartenza,
      numOspiti: prenotazione.numOspiti,
      checkInUrl,
      lingua: prenotazione.guestLingua,
      hostId: prenotazione.host.id,
      strutturaId: prenotazione.struttura?.id,
      pin: prenotazione.pin,
    })

    await prisma.prenotazione.update({
      where: { id },
      data: { reminderInviato: true },
    })

    return NextResponse.json({
      ok: true,
      email: prenotazione.guestEmail,
      checkInUrl,
    })
  } catch (err) {
    return NextResponse.json(
      { error: `Invio fallito: ${err instanceof Error ? err.message : 'errore sconosciuto'}` },
      { status: 500 },
    )
  }
}
