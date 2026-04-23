/**
 * Signed resource tokens — HMAC-SHA256 deterministico sul pair (scope, resourceId).
 *
 * Usato per URL pubblici che devono rimanere validi ma non pubblicamente
 * enumerabili (es. link iCal, link accept upselling inviato via email).
 * Nessuna persistenza: stesso secret + stesso (scope, resourceId) → stesso token.
 */

import { createHmac, timingSafeEqual } from 'crypto'

function secret(): string {
  const s = process.env.NEXTAUTH_SECRET
  if (!s) throw new Error('NEXTAUTH_SECRET required for signed tokens')
  return s
}

export function signResourceToken(scope: string, resourceId: string): string {
  return createHmac('sha256', secret())
    .update(`${scope}:${resourceId}`)
    .digest('hex')
    .slice(0, 32)
}

export function verifyResourceToken(
  token: string,
  scope: string,
  resourceId: string,
): boolean {
  try {
    const expected = signResourceToken(scope, resourceId)
    if (!token || token.length !== expected.length) return false
    return timingSafeEqual(Buffer.from(token), Buffer.from(expected))
  } catch {
    return false
  }
}
