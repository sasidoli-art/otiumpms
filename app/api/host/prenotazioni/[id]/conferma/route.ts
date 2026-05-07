import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireHost, isUnauthorized } from '@/lib/auth-middleware'
import { auditFromAuth } from '@/lib/audit'
import { sendEmailConfermaPrenotazione } from '@/lib/email'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'

/**
 * POST /api/host/prenotazioni/[id]/conferma
 * Porta una prenotazione RICHIESTA → CONFERMATA.
 * Invia email di conferma all'ospite e crea notifica.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireHost()
  if (isUnauthorized(auth)) return auth

  const { id } = await params
  const hostId = auth.user.hostId!

  const prenotazione = await prisma.prenotazione.findFirst({
    where: { id, hostId },
    select: {
      id: true, stato: true,
      guestNome: true, guestCognome: true, guestEmail: true,
      dataArrivo: true, dataPartenza: true, numOspiti: true,
      prezzoTotale: true, checkInToken: true,
      struttura: { select: { nome: true } },
      unita: { select: { nome: true } },
    },
  })

  if (!prenotazione) {
    return NextResponse.json({ error: 'Prenotazione non trovata' }, { status: 404 })
  }
  if (prenotazione.stato !== 'RICHIESTA') {
    return NextResponse.json(
      { error: `Stato non confermabile: ${prenotazione.stato}` },
      { status: 422 },
    )
  }

  await prisma.prenotazione.update({
    where: { id },
    data: { stato: 'CONFERMATA' },
  })

  await auditFromAuth(auth, {
    azione: 'prenotazione.confermata',
    entita: 'prenotazione',
    entitaId: id,
    dettagli: `Prenotazione confermata manualmente: ${prenotazione.guestNome} ${prenotazione.guestCognome}`,
  })

  // Notifica interna
  prisma.notifica.create({
    data: {
      hostId,
      tipo: 'prenotazione',
      titolo: 'Prenotazione confermata',
      messaggio: `${prenotazione.guestNome} ${prenotazione.guestCognome} · ${prenotazione.struttura?.nome}`,
      linkUrl: `/host/prenotazioni/${id}`,
    },
  }).catch(() => { /* non blocca */ })

  // Email conferma ospite
  try {
    await sendEmailConfermaPrenotazione({
      guestEmail: prenotazione.guestEmail,
      guestNome: prenotazione.guestNome,
      hostNome: prenotazione.struttura?.nome ?? '',
      strutturaNome: prenotazione.struttura?.nome ?? '',
      dataArrivo: prenotazione.dataArrivo,
      dataPartenza: prenotazione.dataPartenza,
      numOspiti: prenotazione.numOspiti,
      prezzoTotale: prenotazione.prezzoTotale,
      hostId,
    })
  } catch (e) {
    logger.warn('Email conferma prenotazione non inviata', 'conferma/route', { error: String(e) })
  }

  return NextResponse.json({ ok: true, stato: 'CONFERMATA' })
}
