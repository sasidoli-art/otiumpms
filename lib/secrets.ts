import { encrypt, isEncrypted, decryptNullable } from './crypto';

/**
 * UI-layer helpers for secret masking.
 * Per l'accesso diretto a host secrets, usa lib/host-secrets.ts.
 */

export const SECRET_MASK = '••••••••';

export function maskSecret(stored: string | null | undefined): string | null {
  if (!stored) return null;
  return SECRET_MASK;
}

export function isMasked(value: string | null | undefined): boolean {
  return value === SECRET_MASK;
}

/**
 * Normalizza un update di secret da PATCH API:
 * - incoming undefined → mantieni existing
 * - incoming mask → mantieni existing (utente non ha modificato)
 * - incoming falsy → null
 * - incoming string → encrypt (se non già cifrato)
 */
export function applySecretUpdate(
  incoming: string | null | undefined,
  existing: string | null,
): string | null {
  if (incoming === undefined) return existing;
  if (isMasked(incoming)) return existing;
  if (!incoming) return null;
  return isEncrypted(incoming) ? incoming : encrypt(incoming);
}

/**
 * Decifra un secret appena letto dal DB (per uso server-side immediato).
 * Preferire getHostSecret/getPaymentSecret da lib/host-secrets.ts quando
 * possibile.
 */
export function revealSecret(stored: string | null | undefined): string | null {
  return decryptNullable(stored);
}

export const HOST_SECRET_FIELDS = [
  'smtpPass',
  'conciergeApiKey',
  'whatsappAccessToken',
  'sdiApiKey',
] as const;

export const PAYMENT_SECRET_FIELDS = [
  'stripeSecretKey',
  'adyenApiKey',
  'nexiApiKey',
  'sumupApiKey',
] as const;

export function maskHostSecrets<T extends Record<string, any>>(host: T): T {
  const masked: any = { ...host };
  for (const f of HOST_SECRET_FIELDS) {
    if (host[f]) masked[f] = SECRET_MASK;
  }
  return masked;
}

export function maskPaymentSecrets<T extends Record<string, any>>(cfg: T): T {
  const masked: any = { ...cfg };
  for (const f of PAYMENT_SECRET_FIELDS) {
    if (cfg[f]) masked[f] = SECRET_MASK;
  }
  return masked;
}

export { encrypt, decryptNullable };
