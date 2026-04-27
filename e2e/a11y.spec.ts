/**
 * Smoke a11y: scansione axe-core sulle pagine pubbliche e su un campione di
 * pagine host post-login. Fallisce solo per violazioni `serious` o `critical`
 * (i `minor` / `moderate` finiscono nel report ma non bloccano CI — il
 * codebase ha ~ 500 warning ESLint su any/unused, riprodurre la stessa
 * tolleranza qui sarebbe rumore).
 */
import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { loginAsE2EHost, E2E_STRUTTURA_ID } from './helpers-e2e'

const BLOCKING_IMPACTS = ['critical', 'serious'] as const

async function scan(page: import('@playwright/test').Page, label: string) {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    // Disabilitiamo color-contrast su pagine custom-themed (white-label):
    // l'host puo' scegliere palette che va valutata visualmente, non con axe.
    .disableRules(['color-contrast'])
    .analyze()

  const blocking = results.violations.filter((v) =>
    (BLOCKING_IMPACTS as readonly string[]).includes(v.impact ?? ''),
  )

  if (blocking.length > 0) {
    const summary = blocking
      .map((v) => `  - [${v.impact}] ${v.id} (${v.nodes.length} nodes): ${v.help}`)
      .join('\n')
    throw new Error(`a11y violations on ${label}:\n${summary}`)
  }
}

test.describe('a11y smoke (axe-core)', () => {
  test('login page', async ({ page }) => {
    await page.goto('/login')
    await page.waitForLoadState('networkidle')
    await scan(page, '/login')
  })

  test('public booking flow', async ({ page }) => {
    await page.goto(`/book/${E2E_STRUTTURA_ID}`)
    await page.waitForLoadState('networkidle')
    await scan(page, '/book/[id]')
  })

  test('host dashboard (post-login)', async ({ page }) => {
    await loginAsE2EHost(page)
    await page.goto('/host/dashboard')
    await page.waitForLoadState('networkidle')
    // Aspetta che la SWR-driven dashboard abbia popolato le card iniziali
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 10_000 })
    await scan(page, '/host/dashboard')
  })

  test('host prenotazioni list', async ({ page }) => {
    await loginAsE2EHost(page)
    await page.goto('/host/prenotazioni')
    await page.waitForLoadState('networkidle')
    await scan(page, '/host/prenotazioni')
  })
})
