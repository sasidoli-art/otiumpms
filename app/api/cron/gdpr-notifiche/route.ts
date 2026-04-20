import { NextRequest, NextResponse } from 'next/server'
import { notificaRetentionImminente } from '@/lib/gdpr-retention'
import { logger } from '@/lib/logger'
import * as Sentry from '@sentry/nextjs'

/**
 * GET /api/cron/gdpr-notifiche
 *
 * Cron mattutino (consigliato 08:00 UTC = 09:00 CET) che avvisa gli host
 * dei dati in scadenza imminente. Complementare al cron retention che
 * gira di notte e esegue l'anonimizzazione/cancellazione effettiva.
 *
 * Per ogni policy con `notificaHostGiorniPrima`, crea Notifica host con
 * dedup 1/giorno per policy+host.
 *
 * Autenticazione: header `Authorization: Bearer {CRON_SECRET}`.
 */
export const maxDuration = 30

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  logger.info('Cron GDPR notifiche avviato', 'cron/gdpr-notifiche')

  try {
    const result = await notificaRetentionImminente()
    logger.info('Cron GDPR notifiche terminato', 'cron/gdpr-notifiche', result)
    return NextResponse.json({
      eseguitoAt: new Date(),
      notificheCreate: result.notificheCreate,
      perPolicy: result.perPolicy,
    })
  } catch (err) {
    Sentry.captureException(err)
    logger.error('Cron GDPR notifiche fallito', 'cron/gdpr-notifiche', {
      error: err instanceof Error ? err.message : String(err),
    })
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
