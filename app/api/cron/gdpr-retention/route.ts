import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { runAllRetentionPolicies } from '@/lib/gdpr-retention'
import { logger } from '@/lib/logger'

/**
 * GET /api/cron/gdpr-retention
 *
 * Cron job per la pulizia automatica dei dati personali scaduti.
 * Esegue tutte le policy di retention per ogni host attivo.
 *
 * Schedulazione consigliata: ogni giorno alle 03:00 (basso traffico)
 * Protetto da CRON_SECRET.
 */
export async function GET(req: NextRequest) {
  // Verifica CRON_SECRET
  const authHeader = req.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  logger.info('Cron GDPR retention avviato', 'cron/gdpr-retention')

  try {
    // Trova tutti gli host attivi
    const hosts = await prisma.host.findMany({
      where: { statoAbbonamento: { not: 'SOSPESO' } },
      select: { id: true, nomeAzienda: true },
    })

    const allResults: { hostId: string; hostName: string; results: Awaited<ReturnType<typeof runAllRetentionPolicies>> }[] = []

    for (const host of hosts) {
      const results = await runAllRetentionPolicies(host.id)
      allResults.push({
        hostId: host.id,
        hostName: host.nomeAzienda,
        results,
      })
    }

    const summary = {
      hostsProcessed: hosts.length,
      totalProcessed: allResults.reduce((s, h) => s + h.results.reduce((ss, r) => ss + r.processed, 0), 0),
      totalErrors: allResults.reduce((s, h) => s + h.results.reduce((ss, r) => ss + r.errors, 0), 0),
      details: allResults.map(h => ({
        host: h.hostName,
        policies: h.results.map(r => ({
          policy: r.policy,
          processed: r.processed,
          errors: r.errors,
        })),
      })),
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
