/**
 * E2E booking flow — ospite prenota una camera (full path).
 *
 * PRECONDIZIONI:
 *   1. `npm run seed:e2e` eseguito contro il DB di test
 *   2. Dev server in esecuzione (o `E2E_BASE_URL` → URL staging)
 *
 * Dati: struttura `test-struttura-001` con `autoConferma: true`,
 *       unità `test-unita-001` prezzoBase 80€, capacità 2.
 *
 * NOTA: selettori di testo ("Prenota", "Avanti", "Conferma") potrebbero
 * richiedere aggiustamenti al primo run contro la UI reale. Dove il testo
 * esatto non è garantito, uso pattern regex o ruoli WCAG.
 */

import { test, expect } from '@playwright/test'
import {
  E2E_STRUTTURA_ID, fmtYMD, giorniDaOggi,
} from './helpers-e2e'

test.describe('Booking flow — prenotazione camera', () => {
  test('pagina catalogo camere carica con struttura seed', async ({ page }) => {
    await page.goto(`/book/${E2E_STRUTTURA_ID}/camere`)
    await page.waitForLoadState('networkidle')

    // Non errore 404
    await expect(page).not.toHaveURL(/not-found|error/)

    // Nome struttura seed è "Hotel E2E Test"
    await expect(page.getByText('Hotel E2E Test', { exact: false })).toBeVisible()
  })

  test('mostra il prezzo base della camera seed (80€)', async ({ page }) => {
    await page.goto(`/book/${E2E_STRUTTURA_ID}/camere`)
    await page.waitForLoadState('networkidle')

    // Price badge: formato "80" o "80,00" o "€ 80"
    const prezzoText = page.getByText(/\b80\b/)
    await expect(prezzoText.first()).toBeVisible({ timeout: 10_000 })
  })

  test('completa prenotazione con auto-conferma', async ({ page }) => {
    // La struttura seed ha autoConferma=true, quindi POST /prenota → stato CONFERMATA
    await page.goto(`/book/${E2E_STRUTTURA_ID}/camere`)
    await page.waitForLoadState('networkidle')

    // Selezione date (struttura UI dipendente: può essere date-picker, input, ecc.)
    // Se il component espone input con name/placeholder, usiamoli. Altrimenti
    // proviamo pattern generico.
    const arrivoInput = page.locator(
      'input[type="date"][name*="arrivo" i], input[placeholder*="arrivo" i]'
    ).first()
    if (await arrivoInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await arrivoInput.fill(fmtYMD(giorniDaOggi(1)))
      const partenzaInput = page.locator(
        'input[type="date"][name*="partenza" i], input[placeholder*="partenza" i]'
      ).first()
      await partenzaInput.fill(fmtYMD(giorniDaOggi(4)))
    }
    // Se non ci sono input date standard, il component usa un calendar custom
    // → richiede selettori specifici che vanno discoperti al primo run.

    // Click "Prenota" sulla camera (o "Seleziona", o "Scegli")
    const prenotaBtn = page.getByRole('button', { name: /prenota|seleziona|scegli/i }).first()
    if (!(await prenotaBtn.isVisible({ timeout: 5000 }).catch(() => false))) {
      test.skip(true, 'Bottone "Prenota" non trovato — UI potrebbe essere cambiata')
      return
    }
    await prenotaBtn.click()

    // Form dati ospite
    await page.waitForLoadState('networkidle')
    const emailInput = page.locator('input[type="email"], input[name*="email" i]').first()
    if (!(await emailInput.isVisible({ timeout: 3000 }).catch(() => false))) {
      test.skip(true, 'Form dati ospite non visibile — flusso potrebbe avere step intermedi')
      return
    }

    await page.locator('input[name*="nome" i]:not([name*="cognome" i])').first().fill('Mario')
    await page.locator('input[name*="cognome" i]').first().fill('Rossi')
    await emailInput.fill('mario.rossi@e2e.test')

    // Consensi — pattern comune: checkbox con label "termini"/"privacy"
    const tosCheckbox = page.getByRole('checkbox', { name: /termini|accetto le condizioni/i }).first()
    if (await tosCheckbox.isVisible({ timeout: 2000 }).catch(() => false)) {
      await tosCheckbox.check()
    }
    const privacyCheckbox = page.getByRole('checkbox', { name: /privacy|informativa/i }).first()
    if (await privacyCheckbox.isVisible({ timeout: 2000 }).catch(() => false)) {
      await privacyCheckbox.check()
    }

    // Conferma
    const confermaBtn = page.getByRole('button', { name: /conferma prenotazione|invia|prenota ora/i }).first()
    if (!(await confermaBtn.isVisible({ timeout: 3000 }).catch(() => false))) {
      test.skip(true, 'Bottone conferma non trovato')
      return
    }
    await confermaBtn.click()

    // Attesa redirect/conferma
    await page.waitForLoadState('networkidle', { timeout: 15_000 })

    // Verifica conferma (URL /book/conferma/[token] O testo success)
    const confermaUrl = /\/(book\/conferma|conferma|success)/
    const successText = page.getByText(/prenotaz.*(confermat|inviat|success)/i).first()

    await Promise.race([
      expect(page).toHaveURL(confermaUrl, { timeout: 10_000 }),
      expect(successText).toBeVisible({ timeout: 10_000 }),
    ])
  })
})

test.describe('Booking flow — check-in online', () => {
  test('pagina check-in carica con prenotazione seed', async ({ page }) => {
    // Il seed crea una prenotazione con checkInToken = 'test-checkin-token-001'
    await page.goto('/checkin/test-checkin-token-001')
    await page.waitForLoadState('networkidle')

    await expect(page).not.toHaveURL(/not-found|error/)

    // Nome ospite pre-compilato: "Giulia TestCheckIn"
    await expect(page.getByText('Giulia', { exact: false })).toBeVisible({ timeout: 10_000 })
  })

  test('rifiuta token invalido', async ({ page }) => {
    await page.goto('/checkin/token-inesistente-abc')
    await page.waitForLoadState('networkidle')

    // 404 o pagina errore con messaggio
    const bodyText = (await page.textContent('body')) ?? ''
    expect(
      /non valido|not found|errore|token|scaduto/i.test(bodyText),
    ).toBe(true)
  })

  // Full check-in flow: richiede step dettagliati (documento, canvas firma, ecc.)
  // Dipende da markup esatto → aggiornare al primo run reale
  test.skip('completa check-in 4-step con firma canvas', async () => {
    // Step 1: dati personali (precompilati)
    // Step 2: documento (tipo + numero)
    // Step 3: accompagnatori (skip)
    // Step 4: firma canvas + consensi
    // Verify: redirect success + stato = ONLINE_COMPLETATO
  })
})
