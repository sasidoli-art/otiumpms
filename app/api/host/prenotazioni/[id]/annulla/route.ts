import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { requireHost, isUnauthorized } from '@/lib/auth-middleware'
import { auditFromAuth } from '@/lib/audit'
import { sendEmailCancellazionePrenotazione } from '@/lib/email'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'

const annullaSchema = z.object({
  motivo: z.string().trim().max(500).optional(),
  notificaOspite: z.boolean().default(true),
})

/**
 * POST /api/host/prenotazioni/[id]/annulla
 * Porta una prenotazione a ANNULLATA.
 * Libera la disponibilità (Disponibilita.postiOccupati decrement).
 * Invia email all'ospite se richiesto.
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
      id: true, stato: true, unitaId: true,
      guestNome: true, guestCognome: true, guestEmail: true,
      dataArrivo: true, dataPartenza: true, numOspiti: true,
      prezzoTotale: true,
      struttura: { select: { nome: true } },
    },
  })

  if (!prenotazione) {
    return NextResponse.json({ error: 'Prenotazione non trovata' }, { status: 404 })
  }
  if (prenotazione.stato === 'ANNULLATA') {
    return NextResponse.json({ error: 'Prenotazione già annullata' }, { status: 422 })
  }

  let rawBody: unknown
  try { rawBody = await req.json() } catch { rawBody = {} }
  const parsed = annullaSchema.safeParse(rawBody)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Dati non validi', details: parsed.error.issues }, { status: 422 })
  }
  const body = parsed.data

  // Calcola i giorni occupati [arrivo, partenza)
  const giorni: Date[] = []
  const cur = new Date(prenotazione.dataArrivo)
  cur.setHours(0, 0, 0, 0)
  const fine = prenotazione.dataPartenza ? new Date(prenotazione.dataPartenza) : new Date(cur)
  fine.setHours(0, 0, 0, 0)
  while (cur < fine) {
    giorni.push(new Date(cur))
    cur.setDate(cur.getDate() + 1)
  }

  await prisma.$transaction(async (tx) => {
    // 1. Annulla prenotazione
    await tx.prenotazione.update({
      where: { id },
      data: { stato: 'ANNULLATA' },
    })

    // 2. Libera disponibilità (decrement postiOccupati)
    if (prenotazione.unitaId) {
      for (const giorno of giorni) {
        await tx.disponibilita.updateMany({
          where: { unitaId: prenotazione.unitaId, data: giorno, postiOccupati: { gt: 0 } },
          data: { postiOccupati: { decrement: 1 } },
        })
      }
    }

    // 3. Notifica interna
    await tx.notifica.create({
      data: {
        hostId,
        tipo: 'prenotazione',
        titolo: 'Prenotazione annullata',
        messaggio: `${prenotazione.guestNome} ${prenotazione.guestCognome}${body.motivo ? ` · ${body.motivo}` : ''}`,
        linkUrl: `/host/prenotazioni/${id}`,
      },
    })
  })

  await auditFromAuth(auth, {
    azione: 'prenotazione.annullata',
    entita: 'prenotazione',
    entitaId: id,
    dettagli: `Annullata: ${prenotazione.guestNome} ${prenotazione.guestCognome}${body.motivo ? ` — ${body.motivo}` : ''}`,
  })

  // Email cancellazione ospite
  if (body.notificaOspite) {
    try {
      await sendEmailCancellazionePrenotazione({
        guestEmail: prenotazione.guestEmail,
        guestNome: prenotazione.guestNome,
        hostNome: prenotazione.struttura?.nome ?? '',
        strutturaNome: prenotazione.struttura?.nome ?? '',
        dataArrivo: prenotazione.dataArrivo,
        hostId,
      })
    } catch (e) {
      logger.warn('Email cancellazione non inviata', 'annulla/route', { error: String(e) })
    }
  }

  return NextResponse.json({ ok: true, stato: 'ANNULLATA' })
}
