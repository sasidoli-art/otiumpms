import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { Prisma } from '@prisma/client'
import {
  triggerEmailPreCheckin,
  triggerEmailReminderArrivo,
  triggerEmailFollowUp,
  triggerEmailReminderSpa,
} from '@/lib/email-triggers'
import { isModuloAttivo } from '@/lib/moduli'
import { logger } from '@/lib/logger'

/**
 * Cron email automatiche — chiamato ogni ora.
 *
 *  Per ogni host con modulo `emailAuto` attivo esegue in sequenza:
 *   a) PRE CHECK-IN  — arrivi entro orePreCheckin (default 72h), reminderInviato=false
 *   b) REMINDER ARR. — arrivi domani, reminderArrivoInviato=false
 *   c) FOLLOW UP      — partenze ieri, stato COMPLETATA, followUpInviato=false
 *   d) REMINDER SPA   — appuntamenti domani, reminderInviato=false
 *
 *  Ogni trigger gia` gestisce:
 *   - check ConfigEmail.attiva
 *   - early-return se flag gia` true
 *   - enqueue + update flag
 *   - audit log per success/fail tramite email-queue
 *
 *  Protezione: Bearer token = CRON_SECRET
 */
export async function GET(req: NextRequest) {
  const secret = req.headers.get('authorization')?.replace('Bearer ', '')
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now = new Date()
  const domani = new Date(now); domani.setDate(domani.getDate() + 1); domani.setHours(0, 0, 0, 0)
  const dopodomani = new Date(domani); dopodomani.setDate(dopodomani.getDate() + 1)
  const oggi = new Date(now); oggi.setHours(0, 0, 0, 0)
  const ieri = new Date(oggi); ieri.setDate(ieri.getDate() - 1)

  const results = { hosts: 0, preCheckin: 0, reminderArrivo: 0, followUp: 0, reminderSpa: 0, errori: 0 }

  // Hosts con modulo emailAuto attivo
  const hosts = await prisma.host.findMany({
    where: { moduliAttivi: { not: Prisma.DbNull } },
    select: { id: true, orePreCheckin: true, moduliAttivi: true },
  })

  for (const host of hosts) {
    if (!isModuloAttivo(host.moduliAttivi, 'emailAuto')) continue
    results.hosts++

    // ── a) PRE CHECK-IN ───────────────────────────────────────────────────
    try {
      const ore = host.orePreCheckin || 72
      const soglia = new Date(now.getTime() + ore * 60 * 60 * 1000)
      const preCheckinList = await prisma.prenotazione.findMany({
        where: {
          hostId: host.id,
          stato: 'CONFERMATA',
          statoCheckIn: 'NON_INIZIATO',
          reminderInviato: false,
          dataArrivo: { gte: oggi, lte: soglia },
          guestEmail: { not: '' },
          deletedAt: null,
        },
        select: { id: true },
      })
      for (const p of preCheckinList) {
        try {
          await triggerEmailPreCheckin(p.id)
          results.preCheckin++
        } catch (err) {
          logger.error('pre_checkin trigger failed', 'cron/email-automatiche', { prenotazioneId: p.id, error: String(err) })
          results.errori++
        }
      }
    } catch (err) {
      logger.error('pre_checkin query failed', 'cron/email-automatiche', { hostId: host.id, error: String(err) })
      results.errori++
    }

    // ── b) REMINDER ARRIVO (24h prima) ────────────────────────────────────
    try {
      const reminderList = await prisma.prenotazione.findMany({
        where: {
          hostId: host.id,
          stato: 'CONFERMATA',
          dataArrivo: { gte: domani, lt: dopodomani },
          reminderArrivoInviato: false,
          emailInviata: true,
          guestEmail: { not: '' },
          deletedAt: null,
        },
        select: { id: true },
      })
      for (const p of reminderList) {
        try {
          await triggerEmailReminderArrivo(p.id)
          results.reminderArrivo++
        } catch (err) {
          logger.error('reminder_arrivo trigger failed', 'cron/email-automatiche', { prenotazioneId: p.id, error: String(err) })
          results.errori++
        }
      }
    } catch (err) {
      logger.error('reminder_arrivo query failed', 'cron/email-automatiche', { hostId: host.id, error: String(err) })
      results.errori++
    }

    // ── c) FOLLOW UP (dopo checkout) ──────────────────────────────────────
    try {
      const followUpList = await prisma.prenotazione.findMany({
        where: {
          hostId: host.id,
          stato: 'COMPLETATA',
          dataPartenza: { gte: ieri, lt: oggi },
          followUpInviato: false,
          guestEmail: { not: '' },
          deletedAt: null,
        },
        select: { id: true },
      })
      for (const p of followUpList) {
        try {
          await triggerEmailFollowUp(p.id)
          results.followUp++
        } catch (err) {
          logger.error('follow_up trigger failed', 'cron/email-automatiche', { prenotazioneId: p.id, error: String(err) })
          results.errori++
        }
      }
    } catch (err) {
      logger.error('follow_up query failed', 'cron/email-automatiche', { hostId: host.id, error: String(err) })
      results.errori++
    }

    // ── d) REMINDER SPA (24h prima) ───────────────────────────────────────
    if (isModuloAttivo(host.moduliAttivi, 'spa')) {
      try {
        const spaList = await prisma.appuntamentoSpa.findMany({
          where: {
            hostId: host.id,
            stato: { in: ['CONFERMATO', 'PRENOTATO'] },
            dataOra: { gte: domani, lt: dopodomani },
            reminderInviato: false,
            guestEmail: { not: null },
          },
          select: { id: true },
        })
        for (const a of spaList) {
          try {
            await triggerEmailReminderSpa(a.id)
            results.reminderSpa++
          } catch (err) {
            logger.error('reminder_spa trigger failed', 'cron/email-automatiche', { appuntamentoId: a.id, error: String(err) })
            results.errori++
          }
        }
      } catch (err) {
        logger.error('reminder_spa query failed', 'cron/email-automatiche', { hostId: host.id, error: String(err) })
        results.errori++
      }
    }
  }

  const totale = results.preCheckin + results.reminderArrivo + results.followUp + results.reminderSpa

  // Log in AuditLog (aggregato, host-less)
  try {
    await prisma.auditLog.create({
      data: {
        hostId: null,
        azione: 'cron.email_automatiche.eseguito',
        entita: 'cron',
        entitaId: null,
        dettagli: `Cron email: ${totale} email accodate per ${results.hosts} host (pre=${results.preCheckin}, reminder=${results.reminderArrivo}, followup=${results.followUp}, spa=${results.reminderSpa}, errori=${results.errori})`,
      },
    })
  } catch { /* non bloccante */ }

  logger.info('Cron email automatiche completato', 'cron/email-automatiche', results)

  return NextResponse.json({ ok: true, totale, ...results })
}
