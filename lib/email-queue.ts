import { logger } from '@/lib/logger'

/**
 * In-memory email queue con retry a backoff esponenziale.
 *
 *  - Tentativi: immediato → 5 minuti → 30 minuti (default)
 *  - Log in AuditLog ogni invio (success/fail)
 *  - Se fallisce definitivamente crea una Notifica per l'host
 *  - Dead-letter queue per monitoraggio
 *  - Singleton persistente tra hot reloads in dev
 *
 * Per produzione a scala, sostituire con Bull/BullMQ + Redis.
 */

interface EmailJobMeta {
  hostId?: string | null
  templateId?: string | null
  to?: string | null
  label: string
}

interface EmailJob extends EmailJobMeta {
  id: string
  fn: () => Promise<void>
  retries: number
  maxRetries: number
  nextRetry: number
  error?: string
  createdAt: number
}

interface DeadLetterEntry extends EmailJobMeta {
  id: string
  error: string
  retries: number
  createdAt: number
  failedAt: number
}

// Ritardi per tentativo (ms): 0 (immediato), 5 minuti, 30 minuti
const RETRY_DELAYS_MS = [0, 5 * 60 * 1000, 30 * 60 * 1000]

class EmailQueue {
  private queue: EmailJob[] = []
  private deadLetter: DeadLetterEntry[] = []
  private processing = false
  private timer: ReturnType<typeof setInterval> | null = null
  private idCounter = 0

  readonly MAX_DEAD_LETTER = 100
  readonly DEFAULT_MAX_RETRIES = 3 // tentativi totali (retries = n° fallimenti pregressi)

  constructor() {
    this.startProcessing()
  }

  /** Accoda un job email. `label` e` una descrizione breve (usata nei log). */
  enqueue(
    label: string,
    fn: () => Promise<void>,
    opts?: { maxRetries?: number; hostId?: string | null; templateId?: string | null; to?: string | null },
  ) {
    const id = `email-${Date.now()}-${++this.idCounter}`
    this.queue.push({
      id,
      fn,
      label,
      retries: 0,
      maxRetries: opts?.maxRetries ?? this.DEFAULT_MAX_RETRIES,
      nextRetry: Date.now(),
      createdAt: Date.now(),
      hostId: opts?.hostId ?? null,
      templateId: opts?.templateId ?? null,
      to: opts?.to ?? null,
    })
    logger.info(`Email queued: ${label}`, 'email-queue', { id })
  }

  getDeadLetters(): DeadLetterEntry[] { return [...this.deadLetter] }

  getStats() {
    return {
      queued: this.queue.length,
      deadLetter: this.deadLetter.length,
      processing: this.processing,
    }
  }

  retryDeadLetter(id: string, fn: () => Promise<void>) {
    const idx = this.deadLetter.findIndex((d) => d.id === id)
    if (idx >= 0) {
      const entry = this.deadLetter[idx]
      this.deadLetter.splice(idx, 1)
      this.enqueue(`retry:${entry.label}`, fn, {
        maxRetries: 1,
        hostId: entry.hostId,
        templateId: entry.templateId,
        to: entry.to,
      })
    }
  }

  clearDeadLetters() { this.deadLetter = [] }

  private startProcessing() {
    if (this.timer) return
    this.timer = setInterval(() => this.processNext(), 2000)
  }

  private async processNext() {
    if (this.processing || this.queue.length === 0) return

    const now = Date.now()
    const idx = this.queue.findIndex((j) => j.nextRetry <= now)
    if (idx < 0) return

    this.processing = true
    const job = this.queue.splice(idx, 1)[0]

    try {
      await job.fn()
      logger.info(`Email sent: ${job.label}`, 'email-queue', { id: job.id, retries: job.retries })
      // Audit log success (fire and forget)
      void logAuditSuccess(job)
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err)
      job.retries++

      if (job.retries >= job.maxRetries) {
        // Esaurito → dead letter + audit + notifica host
        this.deadLetter.push({
          id: job.id,
          label: job.label,
          error: errorMsg,
          retries: job.retries,
          createdAt: job.createdAt,
          failedAt: Date.now(),
          hostId: job.hostId ?? null,
          templateId: job.templateId ?? null,
          to: job.to ?? null,
        })
        if (this.deadLetter.length > this.MAX_DEAD_LETTER) {
          this.deadLetter = this.deadLetter.slice(-this.MAX_DEAD_LETTER)
        }

        logger.error(`Email permanently failed: ${job.label}`, 'email-queue', {
          id: job.id, retries: job.retries, error: errorMsg,
        })

        void logAuditFailure(job, errorMsg)
        void notifyHostFailure(job, errorMsg)
      } else {
        // Retry con backoff tabellare (0/5m/30m)
        const delay = RETRY_DELAYS_MS[Math.min(job.retries, RETRY_DELAYS_MS.length - 1)]
        job.nextRetry = Date.now() + delay
        job.error = errorMsg
        this.queue.push(job)

        logger.warn(`Email retry ${job.retries}/${job.maxRetries}: ${job.label}`, 'email-queue', {
          id: job.id, nextRetryMs: delay, error: errorMsg,
        })
      }
    } finally {
      this.processing = false
    }
  }
}

// ─── Audit / Notifica helpers (dynamic import per evitare cicli) ───────────

async function logAuditSuccess(job: EmailJob): Promise<void> {
  try {
    const { prisma } = await import('@/lib/db')
    await prisma.auditLog.create({
      data: {
        hostId: job.hostId ?? null,
        azione: 'email.inviata',
        entita: 'email',
        entitaId: job.id,
        dettagli: job.to
          ? `Email "${job.label}" inviata a ${job.to}${job.templateId ? ` (template: ${job.templateId})` : ''}`
          : `Email "${job.label}" inviata`,
      },
    })
  } catch {
    // non bloccante
  }
}

async function logAuditFailure(job: EmailJob, error: string): Promise<void> {
  try {
    const { prisma } = await import('@/lib/db')
    await prisma.auditLog.create({
      data: {
        hostId: job.hostId ?? null,
        azione: 'email.fallita',
        entita: 'email',
        entitaId: job.id,
        dettagli: `Email "${job.label}"${job.to ? ` a ${job.to}` : ''} fallita dopo ${job.retries} tentativi: ${error.slice(0, 300)}`,
      },
    })
  } catch {
    // non bloccante
  }
}

async function notifyHostFailure(job: EmailJob, error: string): Promise<void> {
  try {
    const { prisma } = await import('@/lib/db')

    if (!job.hostId) {
      // Email superadmin/platform fallita → NotificaSuperadmin broadcast
      const admins = await prisma.user.findMany({
        where: { role: 'SUPERADMIN' },
        select: { id: true },
      })
      if (admins.length > 0) {
        await prisma.notificaSuperadmin.createMany({
          data: admins.map((a) => ({
            userId: a.id,
            tipo: 'email.fallita',
            titolo: `Email non inviata: ${job.label}`,
            messaggio: `Destinatario: ${job.to ?? '-'}\nTemplate: ${job.templateId ?? '-'}\nErrore dopo ${job.retries} tentativi: ${error.slice(0, 300)}`,
            priorita: 'ALTA',
            entitaTipo: 'email',
            entitaId: job.id,
          })),
        })
      }
      return
    }

    // Email host-scoped fallita → Notifica host
    await prisma.notifica.create({
      data: {
        hostId: job.hostId,
        tipo: 'sistema',
        titolo: 'Email non inviata',
        messaggio: job.to
          ? `Email "${job.label}" non inviata a ${job.to} dopo ${job.retries} tentativi. Verifica la configurazione SMTP.\n\nErrore: ${error.slice(0, 300)}`
          : `Email "${job.label}" non inviata dopo ${job.retries} tentativi. Verifica la configurazione SMTP.\n\nErrore: ${error.slice(0, 300)}`,
        linkUrl: '/host/profilo',
      },
    })
  } catch {
    // non bloccante
  }
}

// Singleton
const globalForQueue = globalThis as typeof globalThis & { emailQueue?: EmailQueue }
export const emailQueue = globalForQueue.emailQueue ?? new EmailQueue()
if (process.env.NODE_ENV !== 'production') globalForQueue.emailQueue = emailQueue
