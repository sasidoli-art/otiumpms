import { NextRequest, NextResponse } from 'next/server'
import { requireHostOrAdmin, isUnauthorized } from '@/lib/auth-middleware'
import { prisma } from '@/lib/db'
import { sendEmailConfermaAppuntamentoSpa, sendEmailCancellazioneAppuntamentoSpa } from '@/lib/email'
import { logger } from '@/lib/logger'

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

  // ── Email notifiche su cambio stato (non bloccanti) ──────────────────
  const emailOspite = updated.guestEmail
  if (stato && stato !== existing.stato && emailOspite) {
    const servizioNome = updated.trattamento?.nome ?? updated.percorso?.nome ?? 'Trattamento SPA'

    if (stato === 'ANNULLATO') {
      prisma.host.findUnique({ where: { id: auth.user.hostId }, select: { nomeAzienda: true } })
        .then(host => sendEmailCancellazioneAppuntamentoSpa({
          guestEmail: emailOspite,
          guestNome: updated.guestNome,
          hostNome: host?.nomeAzienda ?? 'SPA',
          servizioNome,
          dataOra: new Date(updated.dataOra),
        }))
        .catch(err => logger.error('Email cancellazione SPA fallita', 'host/spa/appuntamenti/[id]', { error: String(err) }))
    } else if (stato === 'CONFERMATO' && existing.stato === 'PRENOTATO') {
      prisma.host.findUnique({ where: { id: auth.user.hostId }, select: { nomeAzienda: true } })
        .then(host => sendEmailConfermaAppuntamentoSpa({
          guestEmail: emailOspite,
          guestNome: updated.guestNome,
          hostNome: host?.nomeAzienda ?? 'SPA',
          servizioNome,
          dataOra: new Date(updated.dataOra),
          durata: updated.durata,
          prezzoTotale: updated.prezzoTotale,
        }))
        .catch(err => logger.error('Email conferma SPA fallita', 'host/spa/appuntamenti/[id]', { error: String(err) }))
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
  return NextResponse.json({ ok: true })
}
