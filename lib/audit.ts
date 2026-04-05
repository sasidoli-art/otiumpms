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
