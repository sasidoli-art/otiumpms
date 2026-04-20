import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { eseguiRetention } from '@/lib/gdpr-retention'
import { logger } from '@/lib/logger'
import { audit } from '@/lib/audit'
import { sendEmailGeneric } from '@/lib/email'
import * as Sentry from '@sentry/nextjs'

// Budget: Vercel Hobby max 60s, Pro max 300s. Usiamo 50s per essere sicuri
// di poter scrivere il report e chiudere cleanly prima del kill.
const TIMEOUT_BUDGET_MS = 50_000

/**
 * GET /api/cron/gdpr-retention
 *
 * Cron notturno (consigliato 02:00 UTC = 03:00 CET) che esegue le policy di
 * retention. Resilient a timeout: se non finisce entro 50s salva lo stato in
 * PlatformSettings.ultimaEsecuzioneRetention* e la prossima esecuzione
 * riprende dalle policy rimaste.
 *
 * Autenticazione: header `Authorization: Bearer {CRON_SECRET}`.
 */
export const maxDuration = 60

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  logger.info('Cron GDPR retention avviato', 'cron/gdpr-retention')

  // Legge lo stato precedente per resume.
  const state = await prisma.platformSettings.findUnique({
    where: { id: 'singleton' },
    select: {
      ultimaEsecuzioneRetentionCompletata: true,
      ultimaEsecuzioneRetentionReport: true,
    },
  })

  // Se l'ultima esecuzione non è completata, skippa le policy già processate.
  let skipPolicies: string[] = []
  if (state?.ultimaEsecuzioneRetentionCompletata === false && state.ultimaEsecuzioneRetentionReport) {
    const prev = state.ultimaEsecuzioneRetentionReport as {
      policyProcessate?: string[]
    }
    skipPolicies = prev.policyProcessate ?? []
    logger.info('Riprendo retention da stato precedente', 'cron/gdpr-retention', {
      giàProcessate: skipPolicies.length,
    })
  }

  try {
    const report = await eseguiRetention(null, {
      timeoutMs: TIMEOUT_BUDGET_MS,
      skipPolicies,
    })

    // Se completato è true e avevamo skippato, l'intera pipeline è finita:
    // puliamo lo skip per la prossima esecuzione (fresh run).
    const runConcluso = report.completato && report.policyRimaste.length === 0

    // Salva stato per resume / ispezione
    await prisma.platformSettings.upsert({
      where: { id: 'singleton' },
      update: {
        ultimaEsecuzioneRetentionAt: report.eseguitoAt,
        ultimaEsecuzioneRetentionCompletata: runConcluso,
        ultimaEsecuzioneRetentionReport: {
          policyProcessate: runConcluso ? [] : [...skipPolicies, ...report.policyProcessate],
          policyRimaste: report.policyRimaste,
          azioni: report.azioni.map((a) => ({
            policy: a.policyId,
            entita: a.entita,
            azione: a.azione,
            processed: a.processed,
            errors: a.errors,
          })),
        },
      },
      create: {
        id: 'singleton',
        ultimaEsecuzioneRetentionAt: report.eseguitoAt,
        ultimaEsecuzioneRetentionCompletata: runConcluso,
      },
    })

    const totalProcessed = report.azioni.reduce((s, a) => s + a.processed, 0)
    const totalErrors = report.azioni.reduce((s, a) => s + a.errors, 0)

    // Audit log dell'intera esecuzione (senza PII)
    await audit({
      azione: 'gdpr.retention.eseguita',
      entita: 'platformSettings',
      entitaId: 'singleton',
      dettagli: `Retention ${runConcluso ? 'completata' : 'parziale'}: ${totalProcessed} record processati, ${totalErrors} errori, ${report.policyRimaste.length} policy rimaste`,
      datiJson: {
        completato: runConcluso,
        totalProcessed,
        totalErrors,
        policyProcessate: report.policyProcessate,
        policyRimaste: report.policyRimaste,
      },
    })

    // Alert su errori: Sentry + email SUPERADMIN
    if (totalErrors > 0) {
      const errorDetails = report.azioni
        .filter((a) => a.errors > 0)
        .map((a) => `${a.policyId}: ${a.errors} errori — ${a.details.slice(0, 3).join('; ')}`)
        .join('\n')

      Sentry.captureMessage(`GDPR retention: ${totalErrors} errori`, {
        level: 'error',
        extra: { report: { totalProcessed, totalErrors, errorDetails } },
      })

      await notificaSuperadmin(
        `[Otium PMS] GDPR retention: ${totalErrors} errori`,
        `Il job di retention GDPR ha riportato ${totalErrors} errori.\n\n${errorDetails}\n\nEseguito at: ${report.eseguitoAt.toISOString()}\nCompletato: ${runConcluso}`,
      )
    }

    logger.info('Cron GDPR retention terminato', 'cron/gdpr-retention', {
      completato: runConcluso,
      totalProcessed,
      totalErrors,
      policyRimaste: report.policyRimaste.length,
    })

    return NextResponse.json({
      eseguitoAt: report.eseguitoAt,
      completato: runConcluso,
      totalProcessed,
      totalErrors,
      policyRimaste: report.policyRimaste,
      azioni: report.azioni.map((a) => ({
        policy: a.policyId,
        entita: a.entita,
        azione: a.azione,
        processed: a.processed,
        errors: a.errors,
      })),
    })
  } catch (err) {
    Sentry.captureException(err)
    logger.error('Cron GDPR retention fallito', 'cron/gdpr-retention', {
      error: err instanceof Error ? err.message : String(err),
    })
    await notificaSuperadmin(
      '[Otium PMS] GDPR retention: CRASH',
      `Il job di retention GDPR è crashato.\n\nErrore: ${err instanceof Error ? err.message : String(err)}\n\nStack:\n${err instanceof Error ? err.stack : 'n/a'}`,
    ).catch(() => {})
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

async function notificaSuperadmin(subject: string, text: string): Promise<void> {
  const superadmin = await prisma.user.findFirst({
    where: { role: 'SUPERADMIN' },
    select: { email: true },
  })
  if (!superadmin) return
  await sendEmailGeneric({ to: superadmin.email, subject, text })
}
