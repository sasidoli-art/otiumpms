/**
 * Servizio centralizzato per notifiche SUPERADMIN.
 *
 * Lookup destinatari:
 *   1. Se esistono record in `ConfigNotificaDestinatario` attivi → usa quelli
 *      (con filtri per tipo evento, priorita minima, canali abilitati).
 *   2. Fallback: tutti i `User` con role=SUPERADMIN (email + inapp).
 *
 * Canali:
 *   - in-app  → record in `NotificaSuperadmin` (solo per destinatari con userId)
 *   - email   → via emailQueue (retry 0/5m/30m + audit + dead-letter)
 *   - Slack   → webhook opzionale (default auto-on per priorita ALTA/URGENTE)
 *
 * Garanzie:
 *   - Fire-and-forget safe: errori loggati ma MAI propagati al caller
 *   - `skipInApp` disponibile ma raramente necessario
 */

import nodemailer from 'nodemailer'
import { prisma } from '@/lib/db'
import { emailQueue } from '@/lib/email-queue'
import { logger } from '@/lib/logger'
import {
  renderSuperadminEmail,
  type SuperadminTemplateId,
  type SuperadminEmailContext,
} from '@/lib/email-templates'

// ─── Tipi ─────────────────────────────────────────────────────────────────────

export type PrioritaNotifica = 'BASSA' | 'NORMALE' | 'ALTA' | 'URGENTE'

const PRIORITA_LEVEL: Record<PrioritaNotifica, number> = {
  BASSA: 0, NORMALE: 1, ALTA: 2, URGENTE: 3,
}

export interface NotificaSuperadminPayload {
  tipo: SuperadminTemplateId | string
  emailTemplate?: SuperadminTemplateId
  titolo: string
  messaggio: string
  linkUrl?: string
  priorita?: PrioritaNotifica
  entitaTipo?: string
  entitaId?: string

  autore?: { nome: string; email: string }
  hostNome?: string
  categoria?: string

  /** Salta creazione in-app (se il caller l'ha gia` scritta in una $transaction). */
  skipInApp?: boolean
  /** Default true. */
  email?: boolean
  /** Default: auto-on per ALTA/URGENTE. */
  slack?: boolean
}

type Destinatario = {
  userId: string | null
  email: string
  nome: string | null
  canali: string[]
}

// ─── Lookup destinatari ───────────────────────────────────────────────────────

async function getDestinatari(
  tipo: string,
  priorita: PrioritaNotifica,
): Promise<Destinatario[]> {
  const level = PRIORITA_LEVEL[priorita]

  const configs = await prisma.configNotificaDestinatario.findMany({
    where: { attivo: true },
    include: { user: { select: { id: true, email: true, nome: true, cognome: true } } },
  })

  if (configs.length > 0) {
    return configs
      .filter((c) => c.tipiEvento.length === 0 || c.tipiEvento.includes(tipo))
      .filter((c) => {
        const min = PRIORITA_LEVEL[(c.prioritaMinima as PrioritaNotifica) ?? 'BASSA'] ?? 0
        return level >= min
      })
      .map<Destinatario | null>((c) => {
        const email = c.user?.email ?? c.emailEsterna
        if (!email) return null
        const userFullName = c.user ? `${c.user.nome} ${c.user.cognome}`.trim() : null
        return {
          userId: c.userId ?? null,
          email,
          nome: c.nome ?? userFullName,
          canali: c.canali,
        }
      })
      .filter((d): d is Destinatario => d !== null)
  }

  // Fallback: tutti i SUPERADMIN
  const admins = await prisma.user.findMany({
    where: { role: 'SUPERADMIN' },
    select: { id: true, email: true, nome: true, cognome: true },
  })
  return admins.map((a) => ({
    userId: a.id,
    email: a.email,
    nome: `${a.nome} ${a.cognome}`.trim(),
    canali: ['email', 'inapp'],
  }))
}

// ─── Servizio principale ──────────────────────────────────────────────────────

export async function notificaSuperadmin(payload: NotificaSuperadminPayload): Promise<void> {
  try {
    const priorita = payload.priorita ?? 'NORMALE'
    const destinatari = await getDestinatari(payload.tipo, priorita)

    if (destinatari.length === 0) {
      logger.warn('notificaSuperadmin: nessun destinatario', 'notify-superadmin', {
        tipo: payload.tipo,
      })
      return
    }

    // 1) In-app (solo destinatari con userId) — salta se gia` fatto dal caller
    if (!payload.skipInApp) {
      const inappRecipients = destinatari.filter(
        (d) => d.userId && d.canali.includes('inapp'),
      )
      if (inappRecipients.length > 0) {
        await prisma.notificaSuperadmin.createMany({
          data: inappRecipients.map((d) => ({
            userId: d.userId!,
            tipo: payload.tipo,
            titolo: payload.titolo,
            messaggio: payload.messaggio,
            linkUrl: payload.linkUrl ?? null,
            priorita,
            entitaTipo: payload.entitaTipo ?? null,
            entitaId: payload.entitaId ?? null,
          })),
        })
      }
    }

    // 2) Email via queue
    if (payload.email !== false) {
      const emailRecipients = destinatari.filter((d) => d.canali.includes('email'))
      if (emailRecipients.length > 0) {
        const templateId = payload.emailTemplate ?? inferTemplate(payload.tipo, priorita)
        const ctx: SuperadminEmailContext = {
          titolo: payload.titolo,
          messaggio: payload.messaggio,
          linkUrl: payload.linkUrl,
          priorita,
          entitaTipo: payload.entitaTipo,
          entitaId: payload.entitaId,
          autore: payload.autore,
          hostNome: payload.hostNome,
          categoria: payload.categoria,
        }
        const { subject, html } = renderSuperadminEmail(templateId, ctx)

        for (const d of emailRecipients) {
          emailQueue.enqueue(
            `superadmin:${payload.tipo}:${d.email}`,
            () => sendPlatformEmail(d.email, subject, html),
            { hostId: null, templateId, to: d.email },
          )
        }
      }
    }

    // 3) Slack (fire-and-forget, no retry)
    const wantsSlack = payload.slack ?? (priorita === 'URGENTE' || priorita === 'ALTA')
    if (wantsSlack && process.env.SLACK_WEBHOOK_URL) {
      void sendSlackAlert(payload).catch((err) => {
        logger.warn('Slack webhook fallito (non bloccante)', 'notify-superadmin', {
          error: err instanceof Error ? err.message : String(err),
        })
      })
    }
  } catch (err) {
    logger.error('notificaSuperadmin fallita', 'notify-superadmin', {
      tipo: payload.tipo,
      error: err instanceof Error ? err.message : String(err),
    })
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function inferTemplate(tipo: string, priorita: PrioritaNotifica): SuperadminTemplateId {
  if (tipo.startsWith('ticket.')) {
    return (priorita === 'URGENTE' || priorita === 'ALTA')
      ? 'ticket_urgente_superadmin'
      : 'ticket_nuovo_superadmin'
  }
  if (tipo === 'host.signup') return 'host_signup_superadmin'
  return 'sistema_avviso_superadmin'
}

async function sendPlatformEmail(to: string, subject: string, html: string): Promise<void> {
  const port = Number(process.env.SMTP_PORT) || 587
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port,
    secure: port === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  })
  await transporter.sendMail({
    from: process.env.SMTP_FROM ?? process.env.SMTP_USER ?? 'no-reply@otiumpms.com',
    to,
    subject,
    html,
  })
}

async function sendSlackAlert(payload: NotificaSuperadminPayload): Promise<void> {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL
  if (!webhookUrl) return

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://otium-pms.vercel.app'
  const link = payload.linkUrl ? `${appUrl}${payload.linkUrl}` : null
  const priorita = payload.priorita ?? 'NORMALE'

  const emoji = priorita === 'URGENTE' ? ':rotating_light:'
    : priorita === 'ALTA' ? ':warning:'
    : ':bell:'

  const color = priorita === 'URGENTE' ? '#dc2626'
    : priorita === 'ALTA' ? '#ea580c'
    : '#4f46e5'

  const body = {
    text: `${emoji} *${payload.titolo}*`,
    attachments: [
      {
        color,
        fields: [
          { title: 'Tipo', value: payload.tipo, short: true },
          { title: 'Priorita', value: priorita, short: true },
          ...(payload.hostNome ? [{ title: 'Host', value: payload.hostNome, short: true }] : []),
          ...(payload.autore
            ? [{ title: 'Autore', value: `${payload.autore.nome} <${payload.autore.email}>`, short: false }]
            : []),
          { title: 'Messaggio', value: payload.messaggio.slice(0, 1000), short: false },
        ],
        actions: link ? [{ type: 'button', text: 'Apri nel pannello', url: link }] : [],
        footer: 'Otium PMS',
        ts: Math.floor(Date.now() / 1000),
      },
    ],
  }

  const res = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(5000),
  })

  if (!res.ok) {
    const errText = await res.text().catch(() => '')
    throw new Error(`Slack HTTP ${res.status}: ${errText.slice(0, 200)}`)
  }
}
