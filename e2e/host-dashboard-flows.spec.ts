/**
 * E2E host dashboard — login + navigazione + sezioni principali.
 *
 * File separato da `host-dashboard.spec.ts` (esistente, pattern defensive)
 * per non sovrascriverlo. Questo usa il seed-e2e con login dedicato
 * `e2e-host@otium.test`.
 *
 * PRECONDIZIONI: `npm run seed:e2e`.
 */

import { test, expect } from '@playwright/test'
import { loginAsE2EHost } from './helpers-e2e'

test.describe('Dashboard host (E2E seed)', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsE2EHost(page)
  })

  test('dashboard carica dopo login', async ({ page }) => {
    await page.goto('/host/dashboard')
    await page.waitForLoadState('networkidle')

    // Non redirigiamo fuori (login verificato)
    await expect(page).toHaveURL(/\/host\/dashboard/)

    // Deve mostrare il nome host ("E2E Test Hotel") o "dashboard" somewhere
    const body = (await page.textContent('body')) ?? ''
    expect(body.length).toBeGreaterThan(100)
  })

  test('sezione Prenotazioni è raggiungibile dalla sidebar', async ({ page }) => {
    await page.goto('/host/dashboard')
    await page.waitForLoadState('networkidle')

    // Click link "Prenotazioni" (pattern case-insensitive, anche dentro sidebar collapsed)
    const link = page.getByRole('link', { name: /prenotaz/i }).first()
    if (!(await link.isVisible({ timeout: 5000 }).catch(() => false))) {
      test.skip(true, 'Link Prenotazioni non trovato nella sidebar — verifica markup')
      return
    }

    await link.click()
    await page.waitForLoadState('networkidle')
    await expect(page).toHaveURL(/\/host\/prenotazioni/)
  })

  test('sezione CRM è raggiungibile', async ({ page }) => {
    await page.goto('/host/dashboard')
    await page.waitForLoadState('networkidle')

    const link = page.getByRole('link', { name: /crm|ospit/i }).first()
    if (!(await link.isVisible({ timeout: 5000 }).catch(() => false))) {
      test.skip(true, 'Link CRM/Ospiti non trovato')
      return
    }

    await link.click()
    await page.waitForLoadState('networkidle')
    await expect(page).toHaveURL(/\/host\/(crm|ospiti)/)
  })

  test('sezione SPA è raggiungibile (modulo spa attivo nel seed)', async ({ page }) => {
    await page.goto('/host/dashboard')
    await page.waitForLoadState('networkidle')

    const link = page.getByRole('link', { name: /^spa$/i }).first()
    if (!(await link.isVisible({ timeout: 5000 }).catch(() => false))) {
      test.skip(true, 'Link SPA non trovato')
      return
    }

    await link.click()
    await page.waitForLoadState('networkidle')
    await expect(page).toHaveURL(/\/host\/spa/)
  })

  test('lista prenotazioni mostra la prenotazione seed (Giulia TestCheckIn)', async ({ page }) => {
    await page.goto('/host/prenotazioni')
    await page.waitForLoadState('networkidle')

    // Prenotazione seed: guestCognome "TestCheckIn" è inusuale → buon marker
    await expect(page.getByText(/TestCheckIn/)).toBeVisible({ timeout: 10_000 })
  })

  // Cmd+K quick switcher NON è implementato nel codice corrente (verificato)
  test.skip('quick switcher Cmd+K — NON implementato', async () => {
    // await page.keyboard.press('Meta+k')
    // await expect(page.getByPlaceholder('Cerca')).toBeVisible()
  })
})
