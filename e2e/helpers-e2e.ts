/**
 * Helpers per i test E2E che dipendono da `prisma/seed-e2e.ts`.
 *
 * Questi test richiedono `npm run seed:e2e` eseguito contro il DB di test.
 * IDs attesi:
 *   - Host: e2e-host-001
 *   - Struttura: test-struttura-001
 *   - Unità: test-unita-001
 *   - Trattamento SPA: test-tratt-001 (nome "Massaggio svedese")
 *   - Prenotazione check-in: test-pren-001 (checkInToken: test-checkin-token-001)
 *   - Login: e2e-host@otium.test / Otium2025!
 */

import { type Page } from '@playwright/test'

export const E2E_HOST_EMAIL = 'e2e-host@otium.test'
export const E2E_PASSWORD = 'Otium2025!'
export const E2E_STRUTTURA_ID = 'test-struttura-001'
export const E2E_UNITA_ID = 'test-unita-001'
export const E2E_TRATTAMENTO_ID = 'test-tratt-001'
export const E2E_TERAPISTA_ID = 'test-terap-001'
export const E2E_CABINA_ID = 'test-cabina-001'
export const E2E_CHECKIN_TOKEN = 'test-checkin-token-001'

/** Login come host E2E (user dedicato dal seed-e2e). */
export async function loginAsE2EHost(page: Page) {
  await page.goto('/login')
  await page.fill('input[type="email"]', E2E_HOST_EMAIL)
  await page.fill('input[type="password"]', E2E_PASSWORD)
  await page.click('button[type="submit"]')
  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 15000 })
  await page.waitForLoadState('networkidle')
}

/** Formatta data in yyyy-MM-dd per selettori/URL. */
export function fmtYMD(d: Date): string {
  return d.toISOString().slice(0, 10)
}

/** Data "domani". */
export function domani(): Date {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  d.setHours(0, 0, 0, 0)
  return d
}

/** Data a N giorni da oggi. */
export function giorniDaOggi(n: number): Date {
  const d = new Date()
  d.setDate(d.getDate() + n)
  d.setHours(0, 0, 0, 0)
  return d
}
