import { encrypt, decrypt, isEncrypted, maybeDecrypt } from './crypto';

export const SECRET_MASK = '••••••••';

export function maskSecret(stored: string | null | undefined): string | null {
  if (!stored) return null;
  return SECRET_MASK;
}

export function isMasked(value: string | null | undefined): boolean {
  return value === SECRET_MASK;
}

export function applySecretUpdate(
  incoming: string | null | undefined,
  existing: string | null,
): string | null {
  if (incoming === undefined) return existing;
  if (isMasked(incoming)) return existing;
  if (!incoming) return null;
  return isEncrypted(incoming) ? incoming : encrypt(incoming);
}

export function revealSecret(stored: string | null | undefined): string | null {
  if (!stored) return null;
  return maybeDecrypt(stored);
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

export { encrypt, decrypt, maybeDecrypt };
