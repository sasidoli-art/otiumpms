import { NextRequest, NextResponse } from 'next/server'
import { requireHostOrAdmin, isUnauthorized } from '@/lib/auth-middleware'
import { auditFromAuth, logAccessoAsync } from '@/lib/audit'
import { getClientIp } from '@/lib/rate-limit'
import { prisma } from '@/lib/db'
import { sendEmailConfermaAppuntamentoSpa, sendEmailCancellazioneAppuntamentoSpa } from '@/lib/email'
import { logger } from '@/lib/logger'

/**
 * GET /api/host/spa/appuntamenti/[id] — dettaglio appuntamento con waiver.
 * Se il waiver contiene dati sanitari (dichiarazioneNessuna=false), logga
 * l'accesso come 'waiver_spa' (dati Art. 9).
 */
export async function GET(req: NextRequest, { params: p }: { params: Promise<{ id: string }> }) {
  const { id } = await p
  const auth = await requireHostOrAdmin()
  if (isUnauthorized(auth)) return auth

  const appuntamento = await prisma.appuntamentoSpa.findFirst({
    where: { id, hostId: auth.user.hostId },
    include: {
      terapista: true,
      cabina: true,
      trattamento: true,
      percorso: true,
      ospite: true,
      waiver: true,
      pagamento: true,
    },
  })
  if (!appuntamento) return NextResponse.json({ error: 'Non trovato' }, { status: 404 })

  // GDPR: log accesso. Se waiver contiene dati sanitari → entità waiver_spa,
  // altrimenti accesso all'appuntamento (dati personali standard).
  const hasDatiSanitari = appuntamento.waiver && !appuntamento.waiver.dichiarazioneNessuna
  if (hasDatiSanitari && appuntamento.waiver) {
    logAccessoAsync({
      hostId: auth.user.hostId!,
      userId: auth.user.id,
      userEmail: auth.user.email,
      entita: 'waiver_spa',
      entitaId: appuntamento.waiver.id,
      tipoAccesso: 'visualizzazione',
      ip: getClientIp(req),
      userAgent: req.headers.get('user-agent'),
    })
  }

  return NextResponse.json(appuntamento)
}

export async function PUT(req: NextRequest, { params: p }: { params: Promise<{ id: string }> }) {
  const { id } = await p
  const auth = await requireHostOrAdmin()
  if (isUnauthorized(auth)) return auth

  const existing = await prisma.appuntamentoSpa.findFirst({ where: { id, hostId: auth.user.hostId } })
  if (!existing) return NextResponse.json({ error: 'Non trovato' }, { status: 404 })

  const body = await req.json()
  const {
    guestNome, guestCognome, guestEmail, guestTelefono,
    ospiteId, prenotazioneId,
    cabinaId, terapistaId,
    trattamentoId, percorsoId,
    dataOra, durata, prezzoTotale, stato, note,
  } = body

  const updated = await prisma.appuntamentoSpa.update({
    where: { id },
    data: {
      ...(guestNome && { guestNome: guestNome.trim() }),
      ...(guestCognome && { guestCognome: guestCognome.trim() }),
      guestEmail: guestEmail !== undefined ? (guestEmail?.trim() || null) : existing.guestEmail,
      guestTelefono: guestTelefono !== undefined ? (guestTelefono?.trim() || null) : existing.guestTelefono,
      ...(ospiteId !== undefined && { ospiteId: ospiteId || null }),
      ...(prenotazioneId !== undefined && { prenotazioneId: prenotazioneId || null }),
      ...(cabinaId !== undefined && { cabinaId: cabinaId || null }),
      ...(terapistaId !== undefined && { terapistaId: terapistaId || null }),
      ...(trattamentoId !== undefined && { trattamentoId: trattamentoId || null }),
      ...(percorsoId !== undefined && { percorsoId: percorsoId || null }),
      ...(dataOra && { dataOra: new Date(dataOra) }),
      ...(durata && { durata: Number(durata) }),
      ...(prezzoTotale !== undefined && { prezzoTotale: prezzoTotale ? Number(prezzoTotale) : null }),
      ...(stato && { stato }),
      ...(note !== undefined && { note: note?.trim() || null }),
    },
    include: {
      terapista: { select: { id: true, nome: true, cognome: true, colore: true } },
      cabina: { select: { id: true, nome: true, colore: true } },
      trattamento: { select: { id: true, nome: true, categoria: true, durata: true } },
      percorso: { select: { id: true, nome: true } },
    },
  })

  // ── Notifica in-app su cambio stato SPA ──────────────────────────────
  if (stato && stato !== existing.stato) {
    const statoLabels: Record<string, string> = {
      CONFERMATO: 'confermato', ANNULLATO: 'annullato',
      COMPLETATO: 'completato', IN_CORSO: 'in corso', NO_SHOW: 'no show',
    }
    if (statoLabels[stato]) {
      const servizio = updated.trattamento?.nome ?? updated.percorso?.nome ?? 'Trattamento'
      await prisma.notifica.create({
        data: {
          hostId: auth.user.hostId,
          tipo: 'spa',
          titolo: `Appuntamento SPA ${statoLabels[stato]}`,
          messaggio: `${updated.guestNome} ${updated.guestCognome} — "${servizio}" ${statoLabels[stato]}`,
          linkUrl: '/host/spa/appuntamenti',
        },
      })
    }
  }

  // GDPR Art. 30
  const azioni: string[] = []
  if (stato && stato !== existing.stato) azioni.push(`stato ${existing.stato}→${stato}`)
  if (dataOra) azioni.push(`dataOra aggiornata`)
  if (azioni.length > 0) {
    await auditFromAuth(auth, {
      azione: 'appuntamento_spa.aggiornato',
      entita: 'appuntamentoSpa',
      entitaId: id,
      dettagli: `${updated.guestCognome} ${updated.guestNome} · ${azioni.join(' · ')}`,
    })
  }

  // ── Email notifiche su cambio stato (non bloccanti) ──────────────────
  const emailOspite = updated.guestEmail
  if (stato && stato !== existing.stato && emailOspite) {
    const servizioNome = updated.trattamento?.nome ?? updated.percorso?.nome ?? 'Trattamento SPA'
    const host = await prisma.host.findUnique({ where: { id: auth.user.hostId }, select: { nomeAzienda: true } })
    const hostNome = host?.nomeAzienda ?? 'SPA'

    if (stato === 'ANNULLATO') {
      sendEmailCancellazioneAppuntamentoSpa({
        guestEmail: emailOspite, guestNome: updated.guestNome, hostNome, servizioNome,
        dataOra: new Date(updated.dataOra),
      }).catch(err => logger.error('Email cancellazione SPA fallita', 'host/spa/appuntamenti/[id]', { error: String(err) }))
    } else if (stato === 'CONFERMATO' && existing.stato === 'PRENOTATO') {
      sendEmailConfermaAppuntamentoSpa({
        guestEmail: emailOspite, guestNome: updated.guestNome, hostNome, servizioNome,
        dataOra: new Date(updated.dataOra), durata: updated.durata, prezzoTotale: updated.prezzoTotale,
      }).catch(err => logger.error('Email conferma SPA fallita', 'host/spa/appuntamenti/[id]', { error: String(err) }))
    }
  }

  return NextResponse.json(updated)
}

export async function DELETE(_req: NextRequest, { params: p }: { params: Promise<{ id: string }> }) {
  const { id } = await p
  const auth = await requireHostOrAdmin()
  if (isUnauthorized(auth)) return auth

  const existing = await prisma.appuntamentoSpa.findFirst({ where: { id, hostId: auth.user.hostId } })
  if (!existing) return NextResponse.json({ error: 'Non trovato' }, { status: 404 })

  await prisma.appuntamentoSpa.delete({ where: { id } })

  await auditFromAuth(auth, {
    azione: 'appuntamento_spa.eliminato',
    entita: 'appuntamentoSpa',
    entitaId: id,
    dettagli: `Appuntamento SPA ${existing.guestCognome ?? ''} ${existing.guestNome} del ${existing.dataOra.toISOString()} eliminato`,
  })

  return NextResponse.json({ ok: true })
}
