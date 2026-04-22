/**
 * Impersonation system — ADMIN/SUPERADMIN può "accedere come" un host
 * per debugging e supporto.
 *
 * Design:
 *   - Cookie `otium-imp-token` (httpOnly) — payload firmato HMAC-SHA256
 *     con NEXTAUTH_SECRET. Contiene { hostId, adminUserId, exp }.
 *   - Cookie `otium-imp-name` (NON httpOnly) — nome host, letto dal client
 *     per mostrare il banner.
 *
 * Flusso:
 *   1. ADMIN POST /api/admin/host/[id]/impersona → cookies settati
 *   2. requireHostOrAdmin() in auth-middleware rileva e usa impersonated hostId
 *   3. Banner client-side mostra "Stai visualizzando come {name}"
 *   4. POST /api/admin/impersona/stop → cookies cleared
 *
 * Sicurezza:
 *   - Solo ADMIN/SUPERADMIN possono creare l'impersonation
 *   - Scadenza: 4 ore
 *   - Audit log su start/stop
 *   - Firma HMAC impedisce tampering lato client
 */

import crypto from 'crypto'
import { cookies as getCookies } from 'next/headers'

export const IMPERSONATION_COOKIE_TOKEN = 'otium-imp-token'
export const IMPERSONATION_COOKIE_NAME = 'otium-imp-name'
const MAX_AGE_SECONDS = 4 * 60 * 60 // 4 ore

export interface ImpersonationPayload {
  hostId: string
  adminUserId: string
  exp: number
}

function getSecret(): string {
  const s = process.env.NEXTAUTH_SECRET
  if (!s) throw new Error('NEXTAUTH_SECRET non configurato')
  return s
}

function sign(payload: ImpersonationPayload): string {
  const json = JSON.stringify(payload)
  const body = Buffer.from(json, 'utf8').toString('base64url')
  const sig = crypto.createHmac('sha256', getSecret()).update(body).digest('base64url')
  return `${body}.${sig}`
}

function verify(token: string): ImpersonationPayload | null {
  const [body, sig] = token.split('.')
  if (!body || !sig) return null
  const expectedSig = crypto.createHmac('sha256', getSecret()).update(body).digest('base64url')
  try {
    const a = Buffer.from(sig, 'base64url')
    const b = Buffer.from(expectedSig, 'base64url')
    if (a.length !== b.length) return null
    if (!crypto.timingSafeEqual(a, b)) return null
  } catch { return null }

  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as ImpersonationPayload
    if (!payload.hostId || !payload.adminUserId || !payload.exp) return null
    if (payload.exp < Math.floor(Date.now() / 1000)) return null
    return payload
  } catch { return null }
}

/**
 * Legge il payload di impersonation dalla cookie request (server-side).
 * null se assente/scaduto/invalido.
 */
export async function getImpersonation(): Promise<ImpersonationPayload | null> {
  const c = await getCookies()
  const raw = c.get(IMPERSONATION_COOKIE_TOKEN)?.value
  if (!raw) return null
  return verify(raw)
}

/**
 * Per route handler: riceve un cookies() ResponseCookies-like e setta i cookie.
 * Usalo in /api/admin/host/[id]/impersona.
 */
export async function setImpersonation(
  hostId: string,
  hostName: string,
  adminUserId: string,
): Promise<void> {
  const exp = Math.floor(Date.now() / 1000) + MAX_AGE_SECONDS
  const token = sign({ hostId, adminUserId, exp })

  const c = await getCookies()
  c.set({
    name: IMPERSONATION_COOKIE_TOKEN,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: MAX_AGE_SECONDS,
  })
  c.set({
    name: IMPERSONATION_COOKIE_NAME,
    value: encodeURIComponent(hostName),
    httpOnly: false, // Letto lato client per il banner
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: MAX_AGE_SECONDS,
  })
}

/** Pulisce i cookie impersonation. */
export async function clearImpersonation(): Promise<void> {
  const c = await getCookies()
  c.delete(IMPERSONATION_COOKIE_TOKEN)
  c.delete(IMPERSONATION_COOKIE_NAME)
}
