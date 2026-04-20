/**
 * Audit Log — tracking azioni utente nel PMS.
 *
 * Uso:
 *   await audit({
 *     hostId, userId, userEmail,
 *     azione: 'prenotazione.confermata',
 *     entita: 'prenotazione',
 *     entitaId: prenotazione.id,
 *     dettagli: 'Confermata prenotazione di Mario Rossi',
 *   })
 */

import { prisma } from '@/lib/db'

export interface AuditEntry {
  hostId?: string | null
  userId?: string | null
  userEmail?: string | null
  azione: string
  entita: string
  entitaId?: string | null
  dettagli?: string | null
  datiJson?: Record<string, unknown> | null
  ip?: string | null
  userAgent?: string | null
}

/**
 * Registra un'azione nel log di audit.
 * Non bloccante — errori silenziosi per non impattare il flusso principale.
 */
export async function audit(entry: AuditEntry): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        hostId: entry.hostId ?? null,
        userId: entry.userId ?? null,
        userEmail: entry.userEmail ?? null,
        azione: entry.azione,
        entita: entry.entita,
        entitaId: entry.entitaId ?? null,
        dettagli: entry.dettagli ?? null,
        datiJson: entry.datiJson as object ?? undefined,
        ip: entry.ip ?? null,
        userAgent: entry.userAgent ?? null,
      },
    })
  } catch {
    // Silenzioso — l'audit non deve bloccare le operazioni
  }
}

/**
 * Convenience wrapper per azioni SuperAdmin.
 * Imposta automaticamente entita='superadmin' se non specificato.
 */
export async function logAuditAction(params: {
  userId: string
  userEmail?: string
  azione: string
  dettaglio?: string
  datiJson?: Record<string, unknown>
  ip?: string
  userAgent?: string
}): Promise<void> {
  await audit({
    userId: params.userId,
    userEmail: params.userEmail,
    azione: params.azione,
    entita: 'superadmin',
    dettagli: params.dettaglio,
    datiJson: params.datiJson,
    ip: params.ip,
    userAgent: params.userAgent,
  })
}

// ─── GDPR: log degli ACCESSI ai dati personali ─────────────────────────────
// Differenza da `audit()` generico: questo tracciamento e' specifico per il
// registro degli accessi ai dati personali (Art. 32 GDPR — misure di sicurezza).
// Permette di rispondere a "chi ha visto i dati di X il giorno Y?".

export type EntitaDatiPersonali =
  | 'prenotazione'
  | 'ospite_crm'
  | 'waiver_spa'
  | 'fattura'
  | 'accompagnatore'
  | 'conversazione_wa'

export type TipoAccesso = 'visualizzazione' | 'export' | 'modifica' | 'cancellazione'

const TIPO_ACCESSO_VERB: Record<TipoAccesso, string> = {
  visualizzazione: 'visualizzato',
  export: 'esportato',
  modifica: 'modificato',
  cancellazione: 'cancellato',
}

/**
 * Registra un accesso a dati personali. Progettato per essere chiamato
 * fire-and-forget (senza await) dentro le API route, per non rallentare
 * la risposta. Gli errori sono silenziati.
 *
 * Prefix `dati_personali.{tipoAccesso}` per filtraggio in /host/audit.
 */
export async function logAccesso(params: {
  hostId: string
  userId: string
  userEmail: string
  entita: EntitaDatiPersonali
  entitaId: string
  tipoAccesso: TipoAccesso
  ip?: string | null
  userAgent?: string | null
}): Promise<void> {
  await audit({
    hostId: params.hostId,
    userId: params.userId,
    userEmail: params.userEmail,
    azione: `dati_personali.${params.tipoAccesso}`,
    entita: params.entita,
    entitaId: params.entitaId,
    dettagli: `${params.userEmail} ha ${TIPO_ACCESSO_VERB[params.tipoAccesso]} ${params.entita} ${params.entitaId}`,
    ip: params.ip,
    userAgent: params.userAgent,
  })
}

/**
 * Variante fire-and-forget esplicita: non throw, non attende, non logga
 * nulla in caso di errore. Usa questa nelle hot path read-heavy.
 */
export function logAccessoAsync(params: Parameters<typeof logAccesso>[0]): void {
  void logAccesso(params).catch(() => { /* silenzioso */ })
}

/**
 * Helper per audit da API route autenticata.
 * Estrae userId/email/hostId dalla sessione auth.
 */
export async function auditFromAuth(
  auth: { user: { id: string; email: string; hostId: string | null } },
  params: {
    azione: string
    entita: string
    entitaId?: string | null
    dettagli?: string | null
    datiJson?: Record<string, unknown> | null
  }
): Promise<void> {
  await audit({
    hostId: auth.user.hostId,
    userId: auth.user.id,
    userEmail: auth.user.email,
    ...params,
  })
}
