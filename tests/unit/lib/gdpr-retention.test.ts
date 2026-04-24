/**
 * Test lib/gdpr-retention.ts
 *
 * Il lib esporta `RETENTION_POLICIES` (array const) + funzioni async che fanno
 * update/delete su Prisma. I test coprono:
 *   1. Correttezza delle policy (data-driven, no DB)
 *   2. Completezza: ogni entità sensibile ha la sua policy
 *   3. Coerenza baseGiuridica ↔ riferimentoNormativo
 *
 * Test con comportamento eseguibile (es. `eseguiRetention` che fa update DB)
 * sono skippati — richiedono integration test con Prisma mock profondo, out of
 * scope per questo unit test (si presterebbero meglio come integration/).
 */

import { describe, test, expect } from 'vitest'
import { RETENTION_POLICIES } from '@/lib/gdpr-retention'

describe('RETENTION_POLICIES — correttezza data-driven', () => {
  test('contiene almeno 10 policy (snapshot minimale)', () => {
    expect(RETENTION_POLICIES.length).toBeGreaterThanOrEqual(10)
  })

  test('ogni policy ha id univoco', () => {
    const ids = RETENTION_POLICIES.map((p) => p.id)
    const unique = new Set(ids)
    expect(unique.size).toBe(ids.length)
  })

  test('policy ospite_prenotazione: anonimizza a 40 giorni da dataPartenza', () => {
    const p = RETENTION_POLICIES.find((x) => x.id === 'ospite_prenotazione')
    expect(p).toBeDefined()
    expect(p!.giorniRetention).toBe(40)
    expect(p!.contatoreDataDa).toBe('dataPartenza')
    expect(p!.azione).toBe('anonimizza')
    expect(p!.baseGiuridica).toBe('contratto')
    expect(p!.entita).toBe('Prenotazione')
  })

  test('policy waiver_spa: CANCELLA (non anonimizza) a 90 giorni (Art. 9 GDPR)', () => {
    const p = RETENTION_POLICIES.find((x) => x.id === 'waiver_spa')
    expect(p).toBeDefined()
    expect(p!.giorniRetention).toBe(90)
    expect(p!.azione).toBe('cancella') // dati sanitari vanno distrutti, non anonimizzati
    expect(p!.baseGiuridica).toBe('consenso')
    expect(p!.riferimentoNormativo).toContain('Art. 9')
  })

  test('policy alloggiati: 5 anni (1825 giorni, Art. 109 TULPS)', () => {
    const p = RETENTION_POLICIES.find((x) => x.id === 'alloggiati')
    expect(p).toBeDefined()
    expect(p!.giorniRetention).toBe(1825)
    expect(p!.baseGiuridica).toBe('obbligo_legale')
    expect(p!.riferimentoNormativo).toContain('TULPS')
  })

  test('policy fatture: 10 anni (Art. 2220 Codice Civile)', () => {
    const p = RETENTION_POLICIES.find((x) => x.id === 'fatture')
    expect(p).toBeDefined()
    expect(p!.giorniRetention).toBe(3650)
    expect(p!.baseGiuridica).toBe('obbligo_legale')
    expect(p!.riferimentoNormativo).toContain('Art. 2220')
  })

  test('policy foto_documenti: cancella a 7 giorni dal checkout', () => {
    const p = RETENTION_POLICIES.find((x) => x.id === 'foto_documenti')
    expect(p).toBeDefined()
    expect(p!.giorniRetention).toBe(7)
    expect(p!.azione).toBe('cancella')
    expect(p!.contatoreDataDa).toBe('dataPartenza')
  })

  test('policy wifi_sessions: 12 mesi per Decreto Pisanu', () => {
    const p = RETENTION_POLICIES.find((x) => x.id === 'wifi_sessions')
    expect(p).toBeDefined()
    expect(p!.giorniRetention).toBe(365)
    expect(p!.riferimentoNormativo).toContain('Pisanu')
  })

  test('policy crm_ospite: 3 anni da ultimo soggiorno (legittimo interesse)', () => {
    const p = RETENTION_POLICIES.find((x) => x.id === 'crm_ospite')
    expect(p).toBeDefined()
    expect(p!.giorniRetention).toBe(1095)
    expect(p!.baseGiuridica).toBe('legittimo_interesse')
    expect(p!.contatoreDataDa).toBe('dataUltimoSoggiorno')
  })

  test('policy conversazioni_wa: cancella a 180 giorni (Concierge)', () => {
    const p = RETENTION_POLICIES.find((x) => x.id === 'conversazioni_wa')
    expect(p).toBeDefined()
    expect(p!.giorniRetention).toBe(180)
    expect(p!.azione).toBe('cancella')
  })

  test('policy audit_log: 2 anni', () => {
    const p = RETENTION_POLICIES.find((x) => x.id === 'audit_log')
    expect(p).toBeDefined()
    expect(p!.giorniRetention).toBe(730)
  })

  test('tutte le policy sanitarie (Art. 9) hanno azione=cancella (no anonimizza)', () => {
    const sanitarie = RETENTION_POLICIES.filter(
      (p) => p.riferimentoNormativo?.includes('Art. 9'),
    )
    expect(sanitarie.length).toBeGreaterThan(0)
    for (const p of sanitarie) {
      expect(p.azione).toBe('cancella')
    }
  })

  test('tutte le policy di obbligo legale hanno riferimentoNormativo compilato', () => {
    const legali = RETENTION_POLICIES.filter((p) => p.baseGiuridica === 'obbligo_legale')
    for (const p of legali) {
      expect(p.riferimentoNormativo).toBeTruthy()
    }
  })

  test('giorniRetention è sempre positivo', () => {
    for (const p of RETENTION_POLICIES) {
      expect(p.giorniRetention).toBeGreaterThan(0)
    }
  })

  test('baseGiuridica è sempre uno dei valori consentiti', () => {
    const consentiti = ['contratto', 'obbligo_legale', 'consenso', 'legittimo_interesse']
    for (const p of RETENTION_POLICIES) {
      expect(consentiti).toContain(p.baseGiuridica)
    }
  })

  test('azione è sempre anonimizza o cancella', () => {
    for (const p of RETENTION_POLICIES) {
      expect(['anonimizza', 'cancella']).toContain(p.azione)
    }
  })
})

describe('RETENTION_POLICIES — coverage entità sensibili', () => {
  test('copre Prenotazione (dati personali)', () => {
    const p = RETENTION_POLICIES.filter((x) => x.entita === 'Prenotazione')
    expect(p.length).toBeGreaterThan(0)
  })

  test('copre WaiverSpa (dati sanitari Art. 9)', () => {
    const p = RETENTION_POLICIES.find((x) => x.entita === 'WaiverSpa')
    expect(p).toBeDefined()
  })

  test('copre Fattura (obbligo contabile)', () => {
    const p = RETENTION_POLICIES.find((x) => x.entita === 'Fattura')
    expect(p).toBeDefined()
  })

  test('copre OspiteCRM (profilazione)', () => {
    const p = RETENTION_POLICIES.find((x) => x.entita === 'OspiteCRM')
    expect(p).toBeDefined()
  })

  test('copre WifiSession e WifiAccessLog (Pisanu)', () => {
    const sessions = RETENTION_POLICIES.find((x) => x.entita === 'WifiSession')
    const logs = RETENTION_POLICIES.find((x) => x.entita === 'WifiAccessLog')
    expect(sessions).toBeDefined()
    expect(logs).toBeDefined()
  })
})

// NOTA: test di eseguiRetention() / cancellaTuttiDatiOspite() richiedono
// integration test con Prisma mock profondo o DB test in memoria.
// Vedi tests/integration/gdpr-retention.test.ts (out of scope di questo file).
