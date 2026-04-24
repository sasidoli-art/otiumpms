/**
 * Test lib/consent.ts — Art. 7 GDPR consent management.
 *
 * Copre:
 *   - CONSENT_TYPES data-driven (integrità catalogo)
 *   - Token helpers (HMAC deterministico, verify timing-safe, round-trip portale)
 *
 * `registraConsenso` / `consensoAttivo` / `cancellaDatiSanitariOspite` toccano
 * Prisma → integration test con mock (out of scope di questo file, flaggati
 * come `skip` + TODO).
 */

import { describe, test, expect } from 'vitest'
import {
  CONSENT_TYPES,
  generaGuestToken, verificaGuestToken,
  generaPortaleToken,
} from '@/lib/consent'

describe('CONSENT_TYPES — integrità catalogo', () => {
  test('contiene tutti i tipi necessari', () => {
    const expected = [
      'privacy_ospite', 'termini_servizio',
      'marketing_email', 'marketing_sms',
      'spa_art9',
      'profilazione_crm',
      'cookie_analytics', 'cookie_marketing',
    ]
    for (const k of expected) {
      expect(CONSENT_TYPES).toHaveProperty(k)
    }
  })

  test('privacy_ospite e termini sono contratto + NON revocabili', () => {
    expect(CONSENT_TYPES.privacy_ospite.baseGiuridica).toBe('contratto')
    expect(CONSENT_TYPES.privacy_ospite.revocabile).toBe(false)
    expect(CONSENT_TYPES.privacy_ospite.obbligatorio).toBe(true)

    expect(CONSENT_TYPES.termini_servizio.baseGiuridica).toBe('contratto')
    expect(CONSENT_TYPES.termini_servizio.revocabile).toBe(false)
  })

  test('spa_art9 è consenso_esplicito + revocabile (revoca → cancellazione dati sanitari)', () => {
    expect(CONSENT_TYPES.spa_art9.baseGiuridica).toBe('consenso_esplicito')
    expect(CONSENT_TYPES.spa_art9.revocabile).toBe(true)
    expect(CONSENT_TYPES.spa_art9.riferimentoNormativo).toContain('Art. 9')
  })

  test('marketing_email e marketing_sms sono opzionali + revocabili', () => {
    for (const k of ['marketing_email', 'marketing_sms'] as const) {
      expect(CONSENT_TYPES[k].obbligatorio).toBe(false)
      expect(CONSENT_TYPES[k].revocabile).toBe(true)
      expect(CONSENT_TYPES[k].baseGiuridica).toBe('consenso')
    }
  })

  test('cookie_analytics e cookie_marketing sono consenso revocabile (ePrivacy)', () => {
    for (const k of ['cookie_analytics', 'cookie_marketing'] as const) {
      expect(CONSENT_TYPES[k].revocabile).toBe(true)
      expect(CONSENT_TYPES[k].obbligatorio).toBe(false)
    }
  })

  test('profilazione_crm è opzionale + revocabile', () => {
    expect(CONSENT_TYPES.profilazione_crm.obbligatorio).toBe(false)
    expect(CONSENT_TYPES.profilazione_crm.revocabile).toBe(true)
  })

  test('ogni consenso ha una label non vuota', () => {
    for (const [, def] of Object.entries(CONSENT_TYPES)) {
      expect(def.label.length).toBeGreaterThan(0)
    }
  })
})

describe('consent — generaGuestToken / verificaGuestToken (HMAC)', () => {
  const email = 'mario.rossi@example.com'
  const hostId = 'host-test-001'

  test('genera token di 32 char hex', () => {
    const token = generaGuestToken(email, hostId)
    expect(token).toHaveLength(32)
    expect(token).toMatch(/^[a-f0-9]+$/)
  })

  test('stesso (email, hostId) → stesso token (deterministico)', () => {
    const a = generaGuestToken(email, hostId)
    const b = generaGuestToken(email, hostId)
    expect(a).toBe(b)
  })

  test('email viene normalizzata (trim + lowercase)', () => {
    const a = generaGuestToken(email, hostId)
    const b = generaGuestToken('  MARIO.ROSSI@EXAMPLE.COM  ', hostId)
    expect(a).toBe(b)
  })

  test('hostId diverso → token diverso', () => {
    const a = generaGuestToken(email, hostId)
    const b = generaGuestToken(email, 'altro-host')
    expect(a).not.toBe(b)
  })

  test('email diversa → token diverso', () => {
    const a = generaGuestToken(email, hostId)
    const b = generaGuestToken('altro@example.com', hostId)
    expect(a).not.toBe(b)
  })

  test('verificaGuestToken ritorna true per token valido', () => {
    const token = generaGuestToken(email, hostId)
    expect(verificaGuestToken(token, email, hostId)).toBe(true)
  })

  test('verificaGuestToken ritorna false per token non valido', () => {
    expect(verificaGuestToken('fake-token-' + '0'.repeat(20), email, hostId)).toBe(false)
  })

  test('verificaGuestToken ritorna false per email/host cambiati', () => {
    const token = generaGuestToken(email, hostId)
    expect(verificaGuestToken(token, 'altro@example.com', hostId)).toBe(false)
    expect(verificaGuestToken(token, email, 'altro-host')).toBe(false)
  })

  test('verificaGuestToken su token corto → false (no crash)', () => {
    expect(verificaGuestToken('short', email, hostId)).toBe(false)
  })

  test('verificaGuestToken su string vuota → false', () => {
    expect(verificaGuestToken('', email, hostId)).toBe(false)
  })
})

describe('consent — generaPortaleToken (firmato + contiene payload)', () => {
  const email = 'mario@example.com'
  const hostId = 'host-test-001'

  test('ritorna stringa in formato base64url.sign', () => {
    const token = generaPortaleToken(email, hostId)
    expect(token).toContain('.')
    const [payloadB64, sigB64] = token.split('.')
    expect(payloadB64.length).toBeGreaterThan(0)
    expect(sigB64.length).toBeGreaterThan(0)
    // base64url: no +, no /, no =
    expect(token).not.toContain('+')
    expect(token).not.toContain('/')
    expect(token).not.toContain('=')
  })

  test('payload contiene email + hostId decodificabili da b64url', () => {
    const token = generaPortaleToken(email, hostId)
    const [payloadB64] = token.split('.')
    // Ricostruisci base64 standard da base64url
    const pad = payloadB64.length % 4 === 0 ? '' : '='.repeat(4 - (payloadB64.length % 4))
    const std = payloadB64.replace(/-/g, '+').replace(/_/g, '/') + pad
    const decoded = Buffer.from(std, 'base64').toString('utf8')
    const payload = JSON.parse(decoded)
    expect(payload.email).toBe(email)
    expect(payload.hostId).toBe(hostId)
    expect(typeof payload.iat).toBe('number')
  })

  test('due chiamate consecutive producono token diversi (iat aggiornato)', async () => {
    const a = generaPortaleToken(email, hostId)
    await new Promise((r) => setTimeout(r, 1100)) // iat è in secondi
    const b = generaPortaleToken(email, hostId)
    expect(a).not.toBe(b)
  })
})

// Integration test (Prisma-touching) flaggati come TODO.
describe.skip('consent — registraConsenso + consensoAttivo (richiede Prisma mock)', () => {
  test.todo('registra consenso con metadati (ip, userAgent, metodo)')
  test.todo('revoca crea nuovo record accettato=false + marca precedente revocatoAt')
  test.todo('consensoAttivo ritorna false dopo revoca')
  test.todo('revoca spa_art9 triggera cancellaDatiSanitariOspite')
  test.todo('non permette revoca di consenso non revocabile (privacy_ospite)')
  test.todo('subject può essere userId, guestEmail o guestToken')
})
