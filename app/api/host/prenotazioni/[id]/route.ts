import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { sendEmailConfermaPrenotazione, sendEmailCancellazionePrenotazione } from '@/lib/email'
import { requireHostOrAdmin, isUnauthorized } from '@/lib/auth-middleware'
import { auditFromAuth } from '@/lib/audit'
import { parseBody, prenotazioneUpdateSchema } from '@/lib/validations'
import { logger } from '@/lib/logger'

// GET /api/host/prenotazioni/[id]
export async function GET(
  _: NextRequest,
  { params: paramsPromise }: { params: Promise<{ id: string }> },
) {
  const params = await paramsPromise
  const auth = await requireHostOrAdmin()
  if (isUnauthorized(auth)) return auth

  const prenotazione = await prisma.prenotazione.findFirst({
    where: { id: params.id, hostId: auth.user.hostId },
    include: {
      struttura: true,
      unita: true,
      chat: {
        include: {
          messaggi: { orderBy: { createdAt: 'asc' } },
        },
      },
    },
  })

  if (!prenotazione) return NextResponse.json({ error: 'Non trovato' }, { status: 404 })
  return NextResponse.json(prenotazione)
}

// PATCH /api/host/prenotazioni/[id]
export async function PATCH(
  req: NextRequest,
  { params: paramsPromise }: { params: Promise<{ id: string }> },
) {
  const params = await paramsPromise
  const auth = await requireHostOrAdmin()
  if (isUnauthorized(auth)) return auth

  const prenotazione = await prisma.prenotazione.findFirst({
    where: { id: params.id, hostId: auth.user.hostId },
    include: { struttura: { select: { id: true, nome: true, citta: true } } },
  })
  if (!prenotazione) return NextResponse.json({ error: 'Non trovato' }, { status: 404 })

  let raw: unknown
  try {
    raw = await req.json()
  } catch {
    return NextResponse.json({ error: 'Corpo della richiesta malformato' }, { status: 400 })
  }

  const parsed = parseBody(prenotazioneUpdateSchema, raw)
  if (parsed.error) return parsed.error
  const { stato, prezzoTotale, acconto, tassaSoggiorno, noteInterne } = parsed.data

  const updated = await prisma.prenotazione.update({
    where: { id: params.id },
    data: {
      stato: stato ?? prenotazione.stato,
      prezzoTotale: prezzoTotale !== undefined ? prezzoTotale : prenotazione.prezzoTotale,
      acconto: acconto !== undefined ? acconto : prenotazione.acconto,
      tassaSoggiorno: tassaSoggiorno !== undefined ? tassaSoggiorno : prenotazione.tassaSoggiorno,
      noteInterne: noteInterne !== undefined ? noteInterne : prenotazione.noteInterne,
    },
  })

  // ── Email + notifica in-app su cambio stato ────────────────────────────────
  const host = await prisma.host.findUnique({ where: { id: auth.user.hostId } })
  const strutturaNome = prenotazione.struttura?.nome ?? 'N/D'
  const guestFull = `${prenotazione.guestNome} ${prenotazione.guestCognome}`

  // Conferma → email ospite + notifica host
  if (stato === 'CONFERMATA' && prenotazione.stato !== 'CONFERMATA') {
    try {
      await sendEmailConfermaPrenotazione({
        guestEmail: prenotazione.guestEmail,
        guestNome: prenotazione.guestNome,
        strutturaNome,
        hostNome: host?.nomeAzienda ?? 'Host',
        dataArrivo: prenotazione.dataArrivo,
        dataPartenza: prenotazione.dataPartenza,
        numOspiti: prenotazione.numOspiti,
        prezzoTotale: updated.prezzoTotale,
      })
    } catch (err) {
      logger.error('Invio email conferma prenotazione fallito', 'host/prenotazioni/[id]', {
        prenotazioneId: params.id,
        error: err instanceof Error ? err.message : String(err),
      })
    }
    await prisma.notifica.create({
      data: {
        hostId: auth.user.hostId,
        tipo: 'prenotazione',
        titolo: 'Prenotazione confermata',
        messaggio: `${guestFull} — ${strutturaNome} confermata`,
        linkUrl: `/host/prenotazioni/${params.id}`,
      },
    })
  }

  // Cancellazione → email ospite + notifica host
  if (stato === 'ANNULLATA' && prenotazione.stato !== 'ANNULLATA') {
    try {
      await sendEmailCancellazionePrenotazione({
        guestEmail: prenotazione.guestEmail,
        guestNome: prenotazione.guestNome,
        strutturaNome,
        hostNome: host?.nomeAzienda ?? 'Host',
        dataArrivo: prenotazione.dataArrivo,
        lingua: prenotazione.guestLingua ?? 'it',
      })
    } catch (err) {
      logger.error('Invio email cancellazione fallito', 'host/prenotazioni/[id]', {
        prenotazioneId: params.id,
        error: err instanceof Error ? err.message : String(err),
      })
    }
    await prisma.notifica.create({
      data: {
        hostId: auth.user.hostId,
        tipo: 'prenotazione',
        titolo: 'Prenotazione annullata',
        messaggio: `${guestFull} — ${strutturaNome} annullata`,
        linkUrl: `/host/prenotazioni/${params.id}`,
      },
    })
  }

  // Completata → notifica host + libera camera + task HK
  if (stato === 'COMPLETATA' && prenotazione.stato !== 'COMPLETATA') {
    await prisma.notifica.create({
      data: {
        hostId: auth.user.hostId,
        tipo: 'prenotazione',
        titolo: 'Soggiorno completato',
        messaggio: `${guestFull} — checkout da ${strutturaNome}`,
        linkUrl: `/host/prenotazioni/${params.id}`,
      },
    })

    // Libera camera se richiesto
    const rawObj = raw as Record<string, unknown>
    const liberaCamera = rawObj.liberaCamera !== false // default true
    if (liberaCamera && prenotazione.unitaId) {
      await prisma.unitaPrenotabile.update({
        where: { id: prenotazione.unitaId },
        data: { statoHK: 'SPORCA' }, // Camera da pulire dopo checkout
      })

      // Crea task HK automatica
      try {
        await prisma.taskHK.create({
          data: {
            hostId: auth.user.hostId,
            unitaId: prenotazione.unitaId,
            tipo: 'PULIZIA_CHECKOUT',
            priorita: 'ALTA',
            note: `Checkout ${guestFull}`,
          },
        })
      } catch { /* silenzioso se fallisce */ }
    }
  }

  logger.info('Prenotazione aggiornata', 'host/prenotazioni/[id]', {
    prenotazioneId: params.id,
    nuovoStato: stato,
  })

  await auditFromAuth(auth, {
    azione: stato ? `prenotazione.${stato.toLowerCase()}` : 'prenotazione.aggiornata',
    entita: 'prenotazione',
    entitaId: params.id,
    dettagli: `${guestFull} — ${strutturaNome}${stato ? ' → ' + stato : ''}`,
  })

  return NextResponse.json(updated)
}
