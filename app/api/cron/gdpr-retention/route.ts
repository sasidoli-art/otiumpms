import { NextRequest, NextResponse } from 'next/server'
import { eseguiRetention, notificaRetentionImminente } from '@/lib/gdpr-retention'
import { logger } from '@/lib/logger'

/**
 * GET /api/cron/gdpr-retention
 *
 * Cron giornaliero (consigliato 03:00) per la pulizia automatica dei dati
 * scaduti. Passa null come hostId per applicare a tutti i tenant con una
 * sola query per policy.
 *
 * Inoltre invia notifiche agli host per record in scadenza imminente
 * (waiver SPA a 15gg, prenotazioni a 10gg, configurabile in RETENTION_POLICIES).
 *
 * Protetto da CRON_SECRET.
 */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  logger.info('Cron GDPR retention avviato', 'cron/gdpr-retention')

  try {
    const report = await eseguiRetention(null)
    const notifiche = await notificaRetentionImminente()

    const summary = {
      eseguitoAt: report.eseguitoAt,
      totalProcessed: report.azioni.reduce((s, a) => s + a.processed, 0),
      totalErrors: report.azioni.reduce((s, a) => s + a.errors, 0),
      perPolicy: report.azioni.map((a) => ({
        policy: a.policyId,
        entita: a.entita,
        azione: a.azione,
        processed: a.processed,
        errors: a.errors,
      })),
      notifiche,
    }

    logger.info('Cron GDPR retention completato', 'cron/gdpr-retention', summary)
    return NextResponse.json(summary)
  } catch (err) {
    logger.error('Cron GDPR retention fallito', 'cron/gdpr-retention', {
      error: err instanceof Error ? err.message : String(err),
    })
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
