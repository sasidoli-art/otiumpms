import { NextResponse } from 'next/server'
import { requireSuperAdmin, isUnauthorized } from '@/lib/auth-middleware'
import { prisma } from '@/lib/db'
import { emailQueue } from '@/lib/email-queue'
import { subHours, subDays } from 'date-fns'

/**
 * GET /api/superadmin/health
 *
 * Ping aggregato dei servizi piattaforma. Ritorna stato + response time.
 * Usato dalla pagina /superadmin/monitoring per dashboard health check.
 */
export async function GET() {
  const auth = await requireSuperAdmin()
  if (isUnauthorized(auth)) return auth

  const now = Date.now()
  const oggi = new Date()
  oggi.setHours(0, 0, 0, 0)
  const ieri = subDays(new Date(), 1)
  const ora1 = subHours(new Date(), 1)

  // ── 1. Database ping ────────────────────────────────────────────────────
  let dbStatus: 'up' | 'down' = 'down'
  let dbLatency = -1
  const dbStart = Date.now()
  try {
    await prisma.$queryRaw`SELECT 1`
    dbLatency = Date.now() - dbStart
    dbStatus = 'up'
  } catch {
    dbStatus = 'down'
    dbLatency = Date.now() - dbStart
  }

  // ── 2. SMTP / Email ─────────────────────────────────────────────────────
  const emailQueueStats = emailQueue.getStats()
  const ultimaEmailOK = await prisma.auditLog.findFirst({
    where: { azione: 'email.inviata' },
    orderBy: { createdAt: 'desc' },
    select: { createdAt: true },
  })
  const ultimaEmailFail = await prisma.auditLog.findFirst({
    where: { azione: 'email.fallita' },
    orderBy: { createdAt: 'desc' },
    select: { createdAt: true },
  })
  const emailFallite24h = await prisma.auditLog.count({
    where: { azione: 'email.fallita', createdAt: { gte: ieri } },
  })

  // ── 3. Cron jobs (ultima esecuzione da AuditLog) ────────────────────────
  const cronJobs = ['email_automatiche', 'gdpr_retention', 'gdpr_notifiche', 'wifi_heartbeat_check']
  const ultimiCron = await Promise.all(
    cronJobs.map(async (job) => {
      const last = await prisma.auditLog.findFirst({
        where: { azione: { contains: `cron.${job}` } },
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true, dettagli: true },
      })
      const ore = last ? Math.round((Date.now() - last.createdAt.getTime()) / 3600000) : -1
      return {
        nome: job,
        lastRun: last?.createdAt.toISOString() ?? null,
        oreFa: ore,
        status: last && ore <= 26 ? 'ok' : (last && ore <= 48 ? 'warn' : 'error'),
        dettagli: last?.dettagli ?? null,
      }
    }),
  )

  // ── 4. Errori recenti dal AuditLog ──────────────────────────────────────
  const errori24h = await prisma.auditLog.count({
    where: {
      azione: { contains: '.fallit' }, // .fallita / .fallito
      createdAt: { gte: ieri },
    },
  })

  // ── 5. Superadmin notifications pending (emails in dead letter) ─────────
  const deadLetters = emailQueueStats.deadLetter

  return NextResponse.json({
    checkedAt: new Date().toISOString(),
    database: {
      status: dbStatus,
      latencyMs: dbLatency,
      provider: 'Neon PostgreSQL',
    },
    email: {
      smtpConfigured: Boolean(process.env.SMTP_HOST),
      queueSize: emailQueueStats.queued,
      deadLetters,
      ultimaOK: ultimaEmailOK?.createdAt.toISOString() ?? null,
      ultimaFallita: ultimaEmailFail?.createdAt.toISOString() ?? null,
      fallite24h: emailFallite24h,
    },
    cron: ultimiCron,
    errori: {
      total24h: errori24h,
      deadLetterEmails: deadLetters,
    },
    totalCheckMs: Date.now() - now,
  })
}
