import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import {
  sendEmailReminderPreArrivo,
  sendEmailFollowUpPostSoggiorno,
  sendEmailReminderAppuntamentoSpa,
} from '@/lib/email'
import { logger } from '@/lib/logger'

/**
 * Cron endpoint for automated emails.
 * Call daily (e.g., via Vercel Cron, external scheduler, or manual trigger).
 * Protected by CRON_SECRET env variable.
 *
 * Sends:
 * 1. Pre-arrival reminders (1 day before check-in)
 * 2. Post-stay follow-ups (1 day after check-out)
 * 3. SPA appointment reminders (1 day before appointment)
 */
export async function GET(req: NextRequest) {
  const secret = req.headers.get('authorization')?.replace('Bearer ', '')
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

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

  // ─── 1. Pre-arrival reminders ───────────────────────────────────────────────
  // Bookings arriving tomorrow, confirmed, with email, not yet sent
  const prenotazioniDomani = await prisma.prenotazione.findMany({
    where: {
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
      // Generate check-in link if not completed
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
      logger.error('Cron: reminder pre-arrivo fallito', 'cron/email-automatiche', {
        prenotazioneId: p.id,
        error: String(err),
      })
      results.errori++
    }
  }

  // ─── 2. Post-stay follow-ups ────────────────────────────────────────────────
  // Bookings that checked out yesterday, completed, not yet sent
  const partiteIeri = await prisma.prenotazione.findMany({
    where: {
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
      const bookingUrl = p.struttura
        ? `${process.env.NEXTAUTH_URL}/book/${p.struttura.id}`
        : null

      await sendEmailFollowUpPostSoggiorno({
        guestEmail: p.guestEmail,
        guestNome: p.guestNome,
        hostNome: p.host.nomeAzienda,
        strutturaNome: p.struttura?.nome ?? 'La struttura',
        dataArrivo: p.dataArrivo,
        dataPartenza: p.dataPartenza!,
        bookingUrl,
        lingua: p.guestLingua,
      })

      await prisma.prenotazione.update({
        where: { id: p.id },
        data: { followUpInviato: true },
      })
      results.followUp++
    } catch (err) {
      logger.error('Cron: follow-up post-soggiorno fallito', 'cron/email-automatiche', {
        prenotazioneId: p.id,
        error: String(err),
      })
      results.errori++
    }
  }

  // ─── 3. SPA appointment reminders ──────────────────────────────────────────
  // Appointments tomorrow, confirmed/prenotato, with email, not yet sent
  const appuntamentiDomani = await prisma.appuntamentoSpa.findMany({
    where: {
      stato: { in: ['CONFERMATO', 'PRENOTATO'] },
      dataOra: { gte: domani, lt: dopodomani },
      reminderInviato: false,
      guestEmail: { not: null },
    },
    include: {
      trattamento: { select: { nome: true } },
      percorso: { select: { nome: true } },
      host: { select: { id: true, nomeAzienda: true } },
      prenotazione: { select: { guestLingua: true } },
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
        lingua: a.prenotazione?.guestLingua ?? null,
        hostId: a.host.id,
      })

      await prisma.appuntamentoSpa.update({
        where: { id: a.id },
        data: { reminderInviato: true },
      })
      results.reminderSpa++
    } catch (err) {
      logger.error('Cron: reminder SPA fallito', 'cron/email-automatiche', {
        appuntamentoId: a.id,
        error: String(err),
      })
      results.errori++
    }
  }

  logger.info('Cron email automatiche completato', 'cron/email-automatiche', results)

  return NextResponse.json({
    ok: true,
    ...results,
    totale: results.reminderArrivo + results.followUp + results.reminderSpa,
  })
}
