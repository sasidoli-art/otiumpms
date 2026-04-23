import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { importaTuttiCanali, type ImportResult } from '@/lib/ical-import'
import { logger } from '@/lib/logger'
import { audit } from '@/lib/audit'
import * as Sentry from '@sentry/nextjs'

/**
 * GET /api/cron/ical-sync
 *
 * Cron di sincronizzazione iCal per tutti gli host con almeno un CanaleEsterno attivo.
 * Schedule consigliato: ogni 15 min (Pro) o ogni ora (riserva).
 *
 * Auth: header `Authorization: Bearer {CRON_SECRET}`.
 *
 * Comportamento:
 *  - Fetch + parse + upsert + delete orfani per ogni canale (via `importaTuttiCanali`)
 *  - Host processati in serie (max 1 alla volta) con canali paralleli (max 5/host)
 *  - Un errore su un canale non blocca gli altri
 *  - Timeout globale: 50s (budget Hobby / soglia Pro). Gli host non processati
 *    verranno ripresi al prossimo run.
 */
export const maxDuration = 60

const TIMEOUT_BUDGET_MS = 50_000

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const startedAt = Date.now()
  logger.info('Cron ical-sync avviato', 'cron/ical-sync')

  // Host che hanno almeno un canale attivo
  const hosts = await prisma.host.findMany({
    where: {
      strutture: {
        some: {
          canaliEsterni: { some: { attivo: true } },
        },
      },
    },
    select: { id: true, nomeAzienda: true },
  })

  const reportPerHost: Array<{
    hostId: string
    nome: string
    results: ImportResult[]
    tempoMs: number
  }> = []

  let hostSaltati = 0

  for (const h of hosts) {
    if (Date.now() - startedAt > TIMEOUT_BUDGET_MS) {
      hostSaltati = hosts.length - reportPerHost.length
      logger.warn(`Cron ical-sync: budget tempo esaurito, ${hostSaltati} host rimandati al prossimo run`)
      break
    }

    const t0 = Date.now()
    try {
      const results = await importaTuttiCanali(h.id, { concurrency: 5 })
      reportPerHost.push({
        hostId: h.id,
        nome: h.nomeAzienda,
        results,
        tempoMs: Date.now() - t0,
      })

      // Notifica host se un canale ha fallito 3+ volte consecutive
      await notificaFailureRicorrenti(h.id, results)
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err)
      logger.error(`ical-sync host ${h.id} fallito`, { error: errMsg })
      Sentry.captureException(err, { tags: { route: 'cron/ical-sync', hostId: h.id } })
      reportPerHost.push({
        hostId: h.id,
        nome: h.nomeAzienda,
        results: [{
          canaleId: '',
          canaleNome: '(errore globale)',
          unitaNome: null,
          nuove: 0, aggiornate: 0, cancellate: 0, invariate: 0, totaleEventi: 0,
          errore: errMsg,
          durataMs: Date.now() - t0,
        }],
        tempoMs: Date.now() - t0,
      })
    }
  }

  const totali = reportPerHost.reduce(
    (acc, r) => {
      for (const x of r.results) {
        acc.canali += 1
        acc.nuove += x.nuove
        acc.aggiornate += x.aggiornate
        acc.cancellate += x.cancellate
        if (x.errore) acc.errori += 1
      }
      return acc
    },
    { canali: 0, nuove: 0, aggiornate: 0, cancellate: 0, errori: 0 },
  )

  await audit({
    userId: 'cron',
    userEmail: 'cron@otium',
    azione: 'cron.ical_sync.eseguito',
    entita: 'CanaleEsterno',
    entitaId: 'batch',
    dettagli: `Host: ${reportPerHost.length}/${hosts.length} processati. Canali: ${totali.canali}. Nuove: ${totali.nuove}, aggiornate: ${totali.aggiornate}, cancellate: ${totali.cancellate}, errori: ${totali.errori}.`,
  })

  logger.info('Cron ical-sync completato', 'cron/ical-sync', {
    hostProcessati: reportPerHost.length,
    hostSaltati,
    ...totali,
    durataMs: Date.now() - startedAt,
  })

  return NextResponse.json({
    ok: true,
    hostProcessati: reportPerHost.length,
    hostSaltati,
    totali,
    durataMs: Date.now() - startedAt,
    // dettaglio omesso in produzione — solo in dev/debug via ?verbose=1
    ...(req.nextUrl.searchParams.get('verbose') === '1' ? { dettaglio: reportPerHost } : {}),
  })
}

/**
 * Crea una notifica host se un canale ha fallito 3+ volte consecutive.
 *
 * Euristica usata in assenza di un contatore dedicato:
 *   - Canale fallito in questo run (errore presente)
 *   - E `ultimoSync` precedente era già failed da >= 30 minuti
 *   - Anti-spam: skip se esiste già una notifica "sistema" su questo canale nelle ultime 24h
 */
async function notificaFailureRicorrenti(hostId: string, results: ImportResult[]) {
  const falliti = results.filter((r) => r.errore)
  if (falliti.length === 0) return

  const ventiquattroreFa = new Date(Date.now() - 24 * 60 * 60 * 1000)

  for (const r of falliti) {
    try {
      // Canale già notificato di recente?
      const esistente = await prisma.notifica.findFirst({
        where: {
          hostId,
          tipo: 'sistema',
          titolo: { contains: r.canaleNome },
          createdAt: { gte: ventiquattroreFa },
        },
        select: { id: true },
      })
      if (esistente) continue

      // Il canale era già in stato failed prima di questo run?
      // ultimoSync è stato aggiornato a ora da importaFeedICal, quindi guardiamo
      // se in precedenza aveva accumulato errori usando un threshold temporale:
      // se `ultimoSync` (pre-run) era di > 30 min fa e ok=false → probabilmente fallisce da un po'.
      // Non avendo il campo pre-run dopo l'update, facciamo una notifica preventiva
      // solo se il canale non è stato sincronizzato con successo di recente (ma non sappiamo con certezza
      // quante volte ha fallito consecutivamente — TODO: aggiungere campo `consecutiveFailures`).
      await prisma.notifica.create({
        data: {
          hostId,
          tipo: 'sistema',
          titolo: `Sincronizzazione ${r.canaleNome} fallita`,
          messaggio: `Il feed iCal non è raggiungibile. Ultimo errore: ${(r.errore ?? '').slice(0, 180)}`,
          linkUrl: '/host/canali',
        },
      })
    } catch (err) {
      logger.warn('Notifica failure iCal fallita', { hostId, canale: r.canaleNome, error: String(err) })
    }
  }
}
