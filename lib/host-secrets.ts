/**
 * Host secrets access layer.
 *
 * Tutti i consumer che leggono/scrivono chiavi sensibili dell'Host (o del suo
 * PaymentProviderConfig) DEVONO passare da qui. Mai leggere il campo raw.
 *
 * - Lettura: decifra trasparentemente (supporta legacy enc:v1 e plain: dev mode)
 * - Scrittura: cifra trasparentemente + audit log
 */

import { prisma } from '@/lib/db';
import { encryptNullable, decryptNullable } from '@/lib/crypto';
import { audit } from '@/lib/audit';

export type HostSecretField =
  | 'smtpPass'
  | 'conciergeApiKey'
  | 'whatsappAccessToken'
  | 'sdiApiKey';

export type PaymentSecretField =
  | 'stripeSecretKey'
  | 'adyenApiKey'
  | 'nexiApiKey'
  | 'sumupApiKey';

/** Legge e decifra un secret dell'host. Ritorna null se mancante. */
export async function getHostSecret(
  hostId: string,
  field: HostSecretField,
): Promise<string | null> {
  const host = await prisma.host.findUnique({
    where: { id: hostId },
    select: { [field]: true } as Record<HostSecretField, true>,
  });
  const raw = (host as Record<string, string | null> | null)?.[field] ?? null;
  return decryptNullable(raw);
}

/** Legge e decifra tutti i secret necessari in una singola query (performance). */
export async function getHostSecrets<K extends HostSecretField>(
  hostId: string,
  fields: readonly K[],
): Promise<Record<K, string | null>> {
  const select = fields.reduce((acc, f) => ({ ...acc, [f]: true }), {} as Record<K, true>);
  const host = await prisma.host.findUnique({ where: { id: hostId }, select });
  const out: Record<string, string | null> = {};
  for (const f of fields) {
    out[f] = decryptNullable((host as Record<string, string | null> | null)?.[f] ?? null);
  }
  return out as Record<K, string | null>;
}

/** Scrive un secret cifrandolo. Registra nell'audit log (senza il valore). */
export async function setHostSecret(
  hostId: string,
  field: HostSecretField,
  value: string | null,
  auditContext?: { userId?: string | null; userEmail?: string | null },
): Promise<void> {
  await prisma.host.update({
    where: { id: hostId },
    data: { [field]: encryptNullable(value) } as Record<HostSecretField, string | null>,
  });
  await audit({
    hostId,
    userId: auditContext?.userId ?? null,
    userEmail: auditContext?.userEmail ?? null,
    azione: 'host.secret.updated',
    entita: 'host',
    entitaId: hostId,
    dettagli: `Secret updated: ${field}`,
  });
}

/** Variante batch per aggiornare più secret in una volta (una sola audit entry). */
export async function setHostSecrets(
  hostId: string,
  patch: Partial<Record<HostSecretField, string | null>>,
  auditContext?: { userId?: string | null; userEmail?: string | null },
): Promise<void> {
  const data: Record<string, string | null> = {};
  for (const [k, v] of Object.entries(patch)) {
    data[k] = encryptNullable(v as string | null);
  }
  if (Object.keys(data).length === 0) return;
  await prisma.host.update({ where: { id: hostId }, data });
  await audit({
    hostId,
    userId: auditContext?.userId ?? null,
    userEmail: auditContext?.userEmail ?? null,
    azione: 'host.secret.updated',
    entita: 'host',
    entitaId: hostId,
    dettagli: `Secrets updated: ${Object.keys(patch).join(', ')}`,
  });
}

/** PaymentProviderConfig secret reader. */
export async function getPaymentSecret(
  hostId: string,
  field: PaymentSecretField,
): Promise<string | null> {
  const cfg = await prisma.paymentProviderConfig.findUnique({
    where: { hostId },
    select: { [field]: true } as Record<PaymentSecretField, true>,
  });
  const raw = (cfg as Record<string, string | null> | null)?.[field] ?? null;
  return decryptNullable(raw);
}
