import { NextResponse } from 'next/server'
import { requireHostOrAdmin, isUnauthorized } from '@/lib/auth-middleware'
import { prisma } from '@/lib/db'
import {
  sendEmailReminderPreArrivo,
  sendEmailFollowUpPostSoggiorno,
  sendEmailReminderAppuntamentoSpa,
} from '@/lib/email'
import { logger } from '@/lib/logger'

/**
 * POST: Manual trigger for automated emails (host-authenticated).
 * Same logic as cron, but scoped to the authenticated host.
 */
export async function POST() {
  const auth = await requireHostOrAdmin()
  if (isUnauthorized(auth)) return auth
  const hostId = auth.user.hostId

  const now = new Date()
  const domani = new Date(now)
  domani.setDate(domani.getDate() + 1)
  domani.setHours(0, 0, 0, 0)
  const dopodomani = new Date(domani)
  dopodomani.setDate(dopodomani.getDate() + 1)
  const ieri = new Date(now)
  ieri.setDate(ieri.getDate() - 1)
  ieri.setHours(0, 0, 0, 0)
  const oggi = new Date(now)
  oggi.setHours(0, 0, 0, 0)

  const results = { reminderArrivo: 0, followUp: 0, reminderSpa: 0, errori: 0 }

  // ─── 1. Pre-arrival reminders ─────────────────────────────────────────────
  const prenotazioniDomani = await prisma.prenotazione.findMany({
    where: {
      hostId,
      stato: 'CONFERMATA',
      dataArrivo: { gte: domani, lt: dopodomani },
      reminderInviato: false,
      guestEmail: { not: '' },
    },
    include: {
      struttura: { select: { nome: true, indirizzo: true, citta: true } },
      unita: { select: { nome: true } },
      host: { select: { nomeAzienda: true, telefono: true } },
    },
  })

  for (const p of prenotazioniDomani) {
    try {
      let checkInUrl: string | null = null
      if (!p.checkInCompletato && p.checkInToken) {
        checkInUrl = `${process.env.NEXTAUTH_URL}/checkin/${p.checkInToken}`
      }

      await sendEmailReminderPreArrivo({
        guestEmail: p.guestEmail,
        guestNome: p.guestNome,
        hostNome: p.host.nomeAzienda,
        strutturaNome: p.struttura?.nome ?? 'La struttura',
        strutturaIndirizzo: p.struttura?.indirizzo,
        strutturaCitta: p.struttura?.citta,
        hostTelefono: p.host.telefono,
        dataArrivo: p.dataArrivo,
        dataPartenza: p.dataPartenza,
        numOspiti: p.numOspiti,
        unitaNome: p.unita?.nome,
        checkInUrl,
        lingua: p.guestLingua,
      })

      await prisma.prenotazione.update({
        where: { id: p.id },
        data: { reminderInviato: true },
      })
      results.reminderArrivo++
    } catch (err) {
      logger.error('Manual trigger: reminder fallito', 'host/email-automatiche/invia', { error: String(err) })
      results.errori++
    }
  }

  // ─── 2. Post-stay follow-ups ──────────────────────────────────────────────
  const partiteIeri = await prisma.prenotazione.findMany({
    where: {
      hostId,
      stato: 'COMPLETATA',
      dataPartenza: { gte: ieri, lt: oggi },
      followUpInviato: false,
      guestEmail: { not: '' },
    },
    include: {
      struttura: { select: { id: true, nome: true } },
      host: { select: { nomeAzienda: true } },
    },
  })

  for (const p of partiteIeri) {
    try {
      await sendEmailFollowUpPostSoggiorno({
        guestEmail: p.guestEmail,
        guestNome: p.guestNome,
        hostNome: p.host.nomeAzienda,
        strutturaNome: p.struttura?.nome ?? 'La struttura',
        dataArrivo: p.dataArrivo,
        dataPartenza: p.dataPartenza!,
        bookingUrl: p.struttura ? `${process.env.NEXTAUTH_URL}/book/${p.struttura.id}` : null,
        lingua: p.guestLingua,
      })

      await prisma.prenotazione.update({
        where: { id: p.id },
        data: { followUpInviato: true },
      })
      results.followUp++
    } catch (err) {
      logger.error('Manual trigger: follow-up fallito', 'host/email-automatiche/invia', { error: String(err) })
      results.errori++
    }
  }

  // ─── 3. SPA appointment reminders ─────────────────────────────────────────
  const appuntamentiDomani = await prisma.appuntamentoSpa.findMany({
    where: {
      hostId,
      stato: { in: ['CONFERMATO', 'PRENOTATO'] },
      dataOra: { gte: domani, lt: dopodomani },
      reminderInviato: false,
      guestEmail: { not: null },
    },
    include: {
      trattamento: { select: { nome: true } },
      percorso: { select: { nome: true } },
      host: { select: { nomeAzienda: true } },
    },
  })

  for (const a of appuntamentiDomani) {
    if (!a.guestEmail) continue
    try {
      await sendEmailReminderAppuntamentoSpa({
        guestEmail: a.guestEmail,
        guestNome: a.guestNome,
        hostNome: a.host.nomeAzienda,
        servizioNome: a.trattamento?.nome ?? a.percorso?.nome ?? 'Trattamento SPA',
        dataOra: a.dataOra,
        durata: a.durata,
      })

      await prisma.appuntamentoSpa.update({
        where: { id: a.id },
        data: { reminderInviato: true },
      })
      results.reminderSpa++
    } catch (err) {
      logger.error('Manual trigger: reminder SPA fallito', 'host/email-automatiche/invia', { error: String(err) })
      results.errori++
    }
  }

  return NextResponse.json({
    ok: true,
    ...results,
    totale: results.reminderArrivo + results.followUp + results.reminderSpa,
  })
}
