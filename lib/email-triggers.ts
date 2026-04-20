/**
 * Email triggers — high-level entry points chiamati dai route handler e cron.
 *
 * Ogni funzione:
 *   1. Carica i record DB necessari
 *   2. Early-return se l'email e` gia` stata inviata (flag su Prenotazione o AppuntamentoSpa)
 *   3. Chiama renderEmail(templateId, ctx) per ottenere subject+html
 *   4. Accoda l'invio con emailQueue (hostId propagato per notifica failure)
 *   5. Marca il flag (emailInviata / reminderInviato / followUpInviato) a seguito dell'accodamento
 *
 * Nota: le email "host" (prenotazione_richiesta_host) usano l'SMTP della piattaforma,
 * le email "ospite" usano l'SMTP del host se configurato (fallback piattaforma).
 */

import nodemailer from 'nodemailer'
import { prisma } from '@/lib/db'
import { emailQueue } from '@/lib/email-queue'
import { revealSecret } from '@/lib/secrets'
import { renderEmail, isTemplateAttivo, type EmailTemplateId, type RenderContext } from '@/lib/email-templates'
import { logger } from '@/lib/logger'

// ─── SMTP transport helper ──────────────────────────────────────────────────

async function getTransporterAndFrom(hostId?: string | null): Promise<{
  transporter: nodemailer.Transporter
  from: string
}> {
  if (hostId) {
    const host = await prisma.host.findUnique({
      where: { id: hostId },
      select: { smtpHost: true, smtpPort: true, smtpUser: true, smtpPass: true, emailMittente: true },
    })
    if (host?.smtpUser && host.smtpPass && host.smtpHost) {
      const t = nodemailer.createTransport({
        host: host.smtpHost,
        port: host.smtpPort ?? 587,
        secure: (host.smtpPort ?? 587) === 465,
        auth: { user: host.smtpUser, pass: revealSecret(host.smtpPass) ?? '' },
      })
      return { transporter: t, from: host.emailMittente ?? host.smtpUser }
    }
  }
  const port = Number(process.env.SMTP_PORT) || 587
  const t = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port,
    secure: port === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  })
  return { transporter: t, from: process.env.SMTP_FROM || process.env.SMTP_USER || '' }
}

async function dispatchMail(
  opts: { to: string; subject: string; html: string },
  hostId?: string | null,
) {
  const { transporter, from } = await getTransporterAndFrom(hostId)
  await transporter.sendMail({ from, ...opts })
}

/** Accoda un invio generico con metadata per audit/notifica. */
function enqueueSend(params: {
  templateId: EmailTemplateId | string
  to: string
  subject: string
  html: string
  hostId: string | null
  label?: string
}) {
  emailQueue.enqueue(
    params.label ?? `${params.templateId}:${params.to}`,
    () => dispatchMail({ to: params.to, subject: params.subject, html: params.html }, params.hostId),
    {
      hostId: params.hostId,
      templateId: params.templateId,
      to: params.to,
    },
  )
}

// ─── Trigger: Conferma prenotazione (ospite) ────────────────────────────────

export async function triggerEmailConfermaPrenotazione(prenotazioneId: string): Promise<void> {
  const p = await prisma.prenotazione.findUnique({
    where: { id: prenotazioneId },
    include: {
      struttura: { select: { id: true, nome: true, indirizzo: true, citta: true } },
      host: { select: { id: true, nomeAzienda: true, telefono: true } },
      unita: { select: { nome: true } },
    },
  })
  if (!p || !p.guestEmail || p.emailInviata) return
  if (!(await isTemplateAttivo(p.hostId, 'conferma_prenotazione'))) return

  try {
    const { subject, html } = await renderEmail('conferma_prenotazione', {
      struttura: p.struttura,
      host: p.host,
      prenotazione: {
        id: p.id,
        guestNome: p.guestNome,
        guestCognome: p.guestCognome,
        guestEmail: p.guestEmail,
        guestTelefono: p.guestTelefono,
        guestLingua: p.guestLingua,
        dataArrivo: p.dataArrivo,
        dataPartenza: p.dataPartenza,
        numOspiti: p.numOspiti,
        prezzoTotale: p.prezzoTotale,
        pin: p.pin,
        checkInToken: p.checkInToken,
        unita: p.unita,
      },
      lingua: p.guestLingua,
    })

    enqueueSend({
      templateId: 'conferma_prenotazione',
      to: p.guestEmail,
      subject, html,
      hostId: p.hostId,
    })

    await prisma.prenotazione.update({
      where: { id: prenotazioneId },
      data: { emailInviata: true },
    })
  } catch (err) {
    logger.error('triggerEmailConfermaPrenotazione failed', 'email-triggers', { prenotazioneId, error: String(err) })
  }
}

// ─── Trigger: Notifica host su nuova prenotazione ───────────────────────────

export async function triggerEmailPrenotazioneHost(prenotazioneId: string): Promise<void> {
  const p = await prisma.prenotazione.findUnique({
    where: { id: prenotazioneId },
    include: {
      struttura: { select: { id: true, nome: true } },
      host: {
        select: {
          id: true, nomeAzienda: true, telefono: true,
          user: { select: { email: true } },
        },
      },
    },
  })
  const hostEmail = p?.host.user?.email
  if (!p || !hostEmail) return

  try {
    const { subject, html } = await renderEmail('prenotazione_richiesta_host', {
      struttura: p.struttura,
      host: p.host,
      prenotazione: {
        id: p.id,
        guestNome: p.guestNome,
        guestCognome: p.guestCognome,
        guestEmail: p.guestEmail,
        guestTelefono: p.guestTelefono,
        guestNote: p.guestNote,
        dataArrivo: p.dataArrivo,
        dataPartenza: p.dataPartenza,
        numOspiti: p.numOspiti,
      },
      lingua: 'it',
    })

    enqueueSend({
      templateId: 'prenotazione_richiesta_host',
      to: hostEmail,
      subject, html,
      hostId: p.hostId,
    })
  } catch (err) {
    logger.error('triggerEmailPrenotazioneHost failed', 'email-triggers', { prenotazioneId, error: String(err) })
  }
}

// ─── Trigger: Pre check-in online (ospite) ──────────────────────────────────
// Usa reminderInviato come flag (stesso del cron email-automatiche).

export async function triggerEmailPreCheckin(prenotazioneId: string): Promise<void> {
  const p = await prisma.prenotazione.findUnique({
    where: { id: prenotazioneId },
    include: {
      struttura: { select: { id: true, nome: true, indirizzo: true, citta: true } },
      host: { select: { id: true, nomeAzienda: true, telefono: true } },
      unita: { select: { nome: true } },
    },
  })
  if (!p || !p.guestEmail || p.reminderInviato) return
  if (!(await isTemplateAttivo(p.hostId, 'pre_checkin'))) return

  try {
    // Genera checkInToken se assente (link necessario nell'email)
    let token = p.checkInToken
    if (!token) {
      token = crypto.randomUUID()
      await prisma.prenotazione.update({
        where: { id: p.id },
        data: { checkInToken: token },
      })
    }

    const { subject, html } = await renderEmail('pre_checkin', {
      struttura: p.struttura,
      host: p.host,
      prenotazione: {
        id: p.id,
        guestNome: p.guestNome,
        guestEmail: p.guestEmail,
        guestLingua: p.guestLingua,
        dataArrivo: p.dataArrivo,
        dataPartenza: p.dataPartenza,
        numOspiti: p.numOspiti,
        pin: p.pin,
        checkInToken: token,
        unita: p.unita,
      },
      lingua: p.guestLingua,
    })

    enqueueSend({
      templateId: 'pre_checkin',
      to: p.guestEmail,
      subject, html,
      hostId: p.hostId,
    })

    await prisma.prenotazione.update({
      where: { id: prenotazioneId },
      data: { reminderInviato: true },
    })
  } catch (err) {
    logger.error('triggerEmailPreCheckin failed', 'email-triggers', { prenotazioneId, error: String(err) })
  }
}

// ─── Trigger: Reminder arrivo 24h prima (ospite) ────────────────────────────

export async function triggerEmailReminderArrivo(prenotazioneId: string): Promise<void> {
  const p = await prisma.prenotazione.findUnique({
    where: { id: prenotazioneId },
    include: {
      struttura: { select: { id: true, nome: true, indirizzo: true, citta: true } },
      host: { select: { id: true, nomeAzienda: true, telefono: true } },
      unita: { select: { nome: true } },
    },
  })
  if (!p || !p.guestEmail || p.reminderArrivoInviato) return
  if (!(await isTemplateAttivo(p.hostId, 'reminder_arrivo'))) return

  try {
    const { subject, html } = await renderEmail('reminder_arrivo', {
      struttura: p.struttura,
      host: p.host,
      prenotazione: {
        id: p.id,
        guestNome: p.guestNome,
        guestEmail: p.guestEmail,
        guestLingua: p.guestLingua,
        dataArrivo: p.dataArrivo,
        dataPartenza: p.dataPartenza,
        numOspiti: p.numOspiti,
        checkInToken: p.checkInToken,
        unita: p.unita,
      },
      lingua: p.guestLingua,
    })

    enqueueSend({
      templateId: 'reminder_arrivo',
      to: p.guestEmail,
      subject, html,
      hostId: p.hostId,
    })

    await prisma.prenotazione.update({
      where: { id: prenotazioneId },
      data: { reminderArrivoInviato: true },
    })
  } catch (err) {
    logger.error('triggerEmailReminderArrivo failed', 'email-triggers', { prenotazioneId, error: String(err) })
  }
}

// ─── Trigger: Benvenuto dopo check-in verificato (ospite) ───────────────────
// Non c'e` un flag dedicato sul modello → usiamo AuditLog come dedup.

export async function triggerEmailBenvenuto(prenotazioneId: string): Promise<void> {
  const p = await prisma.prenotazione.findUnique({
    where: { id: prenotazioneId },
    include: {
      struttura: { select: { id: true, nome: true, indirizzo: true, citta: true } },
      host: { select: { id: true, nomeAzienda: true, telefono: true } },
      unita: { select: { nome: true } },
    },
  })
  if (!p || !p.guestEmail) return
  if (!(await isTemplateAttivo(p.hostId, 'benvenuto'))) return

  // Dedup: controlla se gia` inviata via audit log
  const giaInviata = await prisma.auditLog.findFirst({
    where: {
      hostId: p.hostId,
      azione: 'email.inviata',
      entita: 'email',
      dettagli: { contains: 'benvenuto' },
    },
    select: { id: true },
  })
  if (giaInviata) return

  try {
    const { subject, html } = await renderEmail('benvenuto', {
      struttura: p.struttura,
      host: p.host,
      prenotazione: {
        id: p.id,
        guestNome: p.guestNome,
        guestEmail: p.guestEmail,
        guestLingua: p.guestLingua,
        dataArrivo: p.dataArrivo,
        dataPartenza: p.dataPartenza,
        numOspiti: p.numOspiti,
        pin: p.pin,
        unita: p.unita,
      },
      lingua: p.guestLingua,
    })

    enqueueSend({
      templateId: 'benvenuto',
      to: p.guestEmail,
      subject, html,
      hostId: p.hostId,
      label: `benvenuto:${p.guestEmail}`,
    })
  } catch (err) {
    logger.error('triggerEmailBenvenuto failed', 'email-triggers', { prenotazioneId, error: String(err) })
  }
}

// ─── Trigger: Follow-up post-checkout (ospite) ──────────────────────────────

export async function triggerEmailFollowUp(prenotazioneId: string): Promise<void> {
  const p = await prisma.prenotazione.findUnique({
    where: { id: prenotazioneId },
    include: {
      struttura: { select: { id: true, nome: true } },
      host: { select: { id: true, nomeAzienda: true, telefono: true } },
      unita: { select: { nome: true } },
    },
  })
  if (!p || !p.guestEmail || p.followUpInviato) return
  if (!(await isTemplateAttivo(p.hostId, 'follow_up'))) return

  try {
    const { subject, html } = await renderEmail('follow_up', {
      struttura: p.struttura,
      host: p.host,
      prenotazione: {
        id: p.id,
        guestNome: p.guestNome,
        guestEmail: p.guestEmail,
        guestLingua: p.guestLingua,
        dataArrivo: p.dataArrivo,
        dataPartenza: p.dataPartenza,
        numOspiti: p.numOspiti,
        unita: p.unita,
      },
      lingua: p.guestLingua,
    })

    enqueueSend({
      templateId: 'follow_up',
      to: p.guestEmail,
      subject, html,
      hostId: p.hostId,
    })

    await prisma.prenotazione.update({
      where: { id: prenotazioneId },
      data: { followUpInviato: true },
    })
  } catch (err) {
    logger.error('triggerEmailFollowUp failed', 'email-triggers', { prenotazioneId, error: String(err) })
  }
}

// ─── Trigger: Cancellazione prenotazione (ospite) ───────────────────────────

export async function triggerEmailCancellazione(prenotazioneId: string): Promise<void> {
  const p = await prisma.prenotazione.findUnique({
    where: { id: prenotazioneId },
    include: {
      struttura: { select: { id: true, nome: true } },
      host: { select: { id: true, nomeAzienda: true, telefono: true } },
    },
  })
  if (!p || !p.guestEmail) return
  if (!(await isTemplateAttivo(p.hostId, 'cancellazione'))) return

  try {
    const { subject, html } = await renderEmail('cancellazione', {
      struttura: p.struttura,
      host: p.host,
      prenotazione: {
        id: p.id,
        guestNome: p.guestNome,
        guestEmail: p.guestEmail,
        guestLingua: p.guestLingua,
        dataArrivo: p.dataArrivo,
        numOspiti: p.numOspiti,
      },
      lingua: p.guestLingua,
    })

    enqueueSend({
      templateId: 'cancellazione',
      to: p.guestEmail,
      subject, html,
      hostId: p.hostId,
    })
  } catch (err) {
    logger.error('triggerEmailCancellazione failed', 'email-triggers', { prenotazioneId, error: String(err) })
  }
}

// ─── Trigger: Conferma appuntamento SPA (ospite) ────────────────────────────

export async function triggerEmailConfermaSpa(appuntamentoId: string): Promise<void> {
  const a = await prisma.appuntamentoSpa.findUnique({
    where: { id: appuntamentoId },
    include: {
      host: { select: { id: true, nomeAzienda: true, telefono: true } },
      trattamento: { select: { nome: true } },
      percorso: { select: { nome: true } },
      prenotazione: { select: { guestLingua: true, struttura: { select: { id: true, nome: true } } } },
    },
  })
  if (!a || !a.guestEmail) return
  if (!(await isTemplateAttivo(a.hostId, 'conferma_spa'))) return

  try {
    const lingua = a.prenotazione?.guestLingua ?? 'it'
    const { subject, html } = await renderEmail('conferma_spa', {
      struttura: a.prenotazione?.struttura ?? null,
      host: a.host,
      appuntamentoSpa: {
        id: a.id,
        guestNome: a.guestNome,
        guestCognome: a.guestCognome,
        guestEmail: a.guestEmail,
        guestTelefono: a.guestTelefono,
        dataOra: a.dataOra,
        durata: a.durata,
        prezzoTotale: a.prezzoTotale,
        trattamento: a.trattamento,
        percorso: a.percorso,
      },
      lingua,
    })

    enqueueSend({
      templateId: 'conferma_spa',
      to: a.guestEmail,
      subject, html,
      hostId: a.hostId,
    })
  } catch (err) {
    logger.error('triggerEmailConfermaSpa failed', 'email-triggers', { appuntamentoId, error: String(err) })
  }
}

// ─── Trigger: Reminder SPA 24h prima (ospite) ───────────────────────────────

export async function triggerEmailReminderSpa(appuntamentoId: string): Promise<void> {
  const a = await prisma.appuntamentoSpa.findUnique({
    where: { id: appuntamentoId },
    include: {
      host: { select: { id: true, nomeAzienda: true, telefono: true } },
      trattamento: { select: { nome: true } },
      percorso: { select: { nome: true } },
      prenotazione: { select: { guestLingua: true, struttura: { select: { id: true, nome: true } } } },
    },
  })
  if (!a || !a.guestEmail || a.reminderInviato) return
  if (!(await isTemplateAttivo(a.hostId, 'reminder_spa'))) return

  try {
    const lingua = a.prenotazione?.guestLingua ?? 'it'
    const { subject, html } = await renderEmail('reminder_spa', {
      struttura: a.prenotazione?.struttura ?? null,
      host: a.host,
      appuntamentoSpa: {
        id: a.id,
        guestNome: a.guestNome,
        guestEmail: a.guestEmail,
        dataOra: a.dataOra,
        durata: a.durata,
        trattamento: a.trattamento,
        percorso: a.percorso,
      },
      lingua,
    })

    enqueueSend({
      templateId: 'reminder_spa',
      to: a.guestEmail,
      subject, html,
      hostId: a.hostId,
    })

    await prisma.appuntamentoSpa.update({
      where: { id: appuntamentoId },
      data: { reminderInviato: true },
    })
  } catch (err) {
    logger.error('triggerEmailReminderSpa failed', 'email-triggers', { appuntamentoId, error: String(err) })
  }
}
