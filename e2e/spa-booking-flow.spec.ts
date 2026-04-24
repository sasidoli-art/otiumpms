/**
 * E2E SPA booking flow — ospite prenota un trattamento.
 *
 * PRECONDIZIONI: `npm run seed:e2e` → trattamento "Massaggio svedese"
 * (`test-tratt-001`) con `prenotabileOnline: true`, terapista + cabina seed.
 *
 * Waiver: il flow pubblico richiede waiver obbligatorio (clinical declaration)
 * prima di poter confermare l'appuntamento. Test copre sia "percorso sano"
 * (dichiarazioneNessuna=true) sia "percorso completo" (campi clinici compilati).
 *
 * NOTA: wait.skip per step che dipendono dal markup del form e dal signature
 * canvas — vanno verificati al primo run contro la UI reale.
 */

import { test, expect } from '@playwright/test'
import { E2E_STRUTTURA_ID } from './helpers-e2e'

test.describe('SPA booking flow', () => {
  test('pagina SPA carica con trattamento seed', async ({ page }) => {
    await page.goto(`/book/${E2E_STRUTTURA_ID}/spa`)
    await page.waitForLoadState('networkidle')

    await expect(page).not.toHaveURL(/not-found|error/)

    // Il trattamento seed si chiama "Massaggio svedese"
    await expect(page.getByText('Massaggio svedese', { exact: false })).toBeVisible({
      timeout: 10_000,
    })
  })

  test('mostra prezzo e durata del trattamento (80€, 60min)', async ({ page }) => {
    await page.goto(`/book/${E2E_STRUTTURA_ID}/spa`)
    await page.waitForLoadState('networkidle')

    // Prezzo 80 (può essere "€80", "80,00", "80€")
    const prezzo = page.getByText(/\b80\b/).first()
    await expect(prezzo).toBeVisible()

    // Durata 60 min
    const durata = page.getByText(/60\s*(min|minuti)/i).first()
    await expect(durata).toBeVisible()
  })

  // Full flow: seleziona trattamento → data/ora → dati ospite → waiver → conferma
  // Gli step richiedono interazione con UI custom (calendar, canvas firma,
  // checkbox "percorso sano" o "dichiarazioni cliniche")
  test.skip('percorso sano — dichiarazioneNessuna=true', async () => {
    // 1. Click su "Massaggio svedese" → Avanti
    // 2. Seleziona data (primo slot disponibile)
    // 3. Seleziona orario
    // 4. Dati ospite: nome, cognome, email
    // 5. Waiver: click "Sto bene, nessuna condizione"
    // 6. Accetta termini + privacy
    // 7. Firma canvas
    // 8. Metodo pagamento: "Contanti in SPA"
    // 9. Conferma
    // Verify: AppuntamentoSpa + WaiverSpa creati, no campi clinici
  })

  test.skip('percorso completo — condizioni + allergie + zone da evitare', async () => {
    // Come sopra ma al waiver:
    // - Click "Ho qualcosa da segnalare"
    // - Seleziona condizioni (es. ipertensione)
    // - Allergie (es. "oli essenziali")
    // - Body map: click zone da evitare
    // Verify: WaiverSpa con campi popolati + consensoArt9At presente
  })

  test.skip('non consente prenotazione nel passato', async () => {
    // Usa date picker per data < oggi → expect errore visibile
  })
})
