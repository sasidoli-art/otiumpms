import { NextResponse } from 'next/server'
import { requireHost, isUnauthorized } from '@/lib/auth-middleware'
import { eseguiRetention } from '@/lib/gdpr-retention'
import { audit } from '@/lib/audit'

/**
 * POST /api/host/gdpr/retention-esegui
 *
 * Esecuzione manuale del job di retention — limitata all'host corrente.
 * Solo DIREZIONE / HOST / MANAGER.
 */
export async function POST() {
  const auth = await requireHost()
  if (isUnauthorized(auth)) return auth

  // requireHost già ammette solo role=HOST con hostId — l'host operativo
  // può eseguire. Se serve limitare a STAFF con staffRole=MANAGER, aggiungere
  // un'ulteriore guardia lib/permissions.ts quando i token staff sono emessi.

  const report = await eseguiRetention(auth.user.hostId, { timeoutMs: 50_000 })

  const totalProcessed = report.azioni.reduce((s, a) => s + a.processed, 0)
  const totalErrors = report.azioni.reduce((s, a) => s + a.errors, 0)

  await audit({
    hostId: auth.user.hostId,
    userId: auth.user.id,
    userEmail: auth.user.email,
    azione: 'gdpr.retention.eseguita_manualmente',
    entita: 'host',
    entitaId: auth.user.hostId,
    dettagli: `Retention manuale: ${totalProcessed} record processati, ${totalErrors} errori`,
  })

  return NextResponse.json({
    eseguitoAt: report.eseguitoAt,
    completato: report.completato,
    totalProcessed,
    totalErrors,
    azioni: report.azioni.map((a) => ({
      policy: a.policyId,
      entita: a.entita,
      azione: a.azione,
      processed: a.processed,
      errors: a.errors,
    })),
  })
}
