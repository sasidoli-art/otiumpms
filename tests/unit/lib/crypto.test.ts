/**
 * Test lib/crypto.ts — AES-256-GCM con IV random + GCM auth tag.
 *
 * La `ENCRYPTION_KEY` di test è settata in `vitest.setup.ts` (deterministica).
 * Test con `PLAIN_PREFIX` (dev mode no-key) modificano l'env per singolo test
 * e la ripristinano via `afterEach`.
 */

import { describe, test, expect, afterEach } from 'vitest'
import {
  encrypt, decrypt, encryptNullable, decryptNullable,
  isEncrypted, validateEncryptionKey, EncryptionError,
} from '@/lib/crypto'

const TEST_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'

describe('crypto — encrypt/decrypt round-trip', () => {
  test('encrypt + decrypt ritorna valore originale', () => {
    const plain = 'super secret token 123'
    const enc = encrypt(plain)
    expect(enc).not.toBe(plain)
    expect(decrypt(enc)).toBe(plain)
  })

  test('supporta unicode e caratteri speciali', () => {
    const plain = 'àèìòù · 🎉 · Ω · password!@#$%'
    expect(decrypt(encrypt(plain))).toBe(plain)
  })

  test('due encrypt dello stesso valore danno risultati diversi (IV random)', () => {
    const plain = 'same-value'
    const a = encrypt(plain)
    const b = encrypt(plain)
    expect(a).not.toBe(b)
    // Ma entrambi decifrano allo stesso plain
    expect(decrypt(a)).toBe(plain)
    expect(decrypt(b)).toBe(plain)
  })

  test('encrypt su stringa vuota ritorna stringa vuota', () => {
    expect(encrypt('')).toBe('')
    expect(decrypt('')).toBe('')
  })
})

describe('crypto — tampering detection (GCM auth tag)', () => {
  test('decrypt lancia EncryptionError se auth tag manomesso', () => {
    const enc = encrypt('valore')
    const parts = enc.split(':')
    // Modifica un byte del tag (ultimo segmento base64)
    const tampered = [parts[0], parts[1], 'aaaaaaaaaaaaaaaaaaaaaaaa'].join(':')
    expect(() => decrypt(tampered)).toThrow(EncryptionError)
  })

  test('decrypt lancia EncryptionError se formato non valido', () => {
    expect(() => decrypt('not-a-valid-format')).toThrow(EncryptionError)
  })
})

describe('crypto — modalità dev (no ENCRYPTION_KEY)', () => {
  afterEach(() => {
    process.env.ENCRYPTION_KEY = TEST_KEY
  })

  test('senza key, encrypt usa "plain:" prefix', () => {
    delete process.env.ENCRYPTION_KEY
    const enc = encrypt('foo')
    expect(enc).toBe('plain:foo')
    expect(decrypt(enc)).toBe('foo')
  })

  test('isEncrypted riconosce il formato plain:', () => {
    expect(isEncrypted('plain:ciao')).toBe(true)
  })
})

describe('crypto — isEncrypted', () => {
  test('riconosce ciphertext nuovo formato', () => {
    const enc = encrypt('test')
    expect(isEncrypted(enc)).toBe(true)
  })

  test('riconosce prefix legacy enc:v1:', () => {
    expect(isEncrypted('enc:v1:aaa:bbb:ccc')).toBe(true)
  })

  test('ritorna false per null/undefined/empty', () => {
    expect(isEncrypted(null)).toBe(false)
    expect(isEncrypted(undefined)).toBe(false)
    expect(isEncrypted('')).toBe(false)
  })

  test('ritorna false per stringhe random (non base64 puro)', () => {
    expect(isEncrypted('hello world')).toBe(false)
  })
})

describe('crypto — nullable helpers', () => {
  test('encryptNullable(null) ritorna null', () => {
    expect(encryptNullable(null)).toBeNull()
    expect(encryptNullable(undefined)).toBeNull()
    expect(encryptNullable('')).toBeNull()
  })

  test('encryptNullable(valore) cifra il valore', () => {
    const enc = encryptNullable('secret')
    expect(enc).not.toBe('secret')
    expect(enc).not.toBeNull()
    expect(decryptNullable(enc)).toBe('secret')
  })

  test('decryptNullable ritorna null per input null/vuoto', () => {
    expect(decryptNullable(null)).toBeNull()
    expect(decryptNullable(undefined)).toBeNull()
    expect(decryptNullable('')).toBeNull()
  })

  test('decryptNullable ritorna input plain se non è cifrato (fallback legacy)', () => {
    // Vecchi dati in DB pre-encryption: ritornano così come sono
    expect(decryptNullable('plain-legacy-value')).toBe('plain-legacy-value')
  })
})

describe('crypto — validateEncryptionKey', () => {
  afterEach(() => {
    process.env.ENCRYPTION_KEY = TEST_KEY
    ;(process.env as Record<string, string | undefined>).NODE_ENV = 'test'
  })

  test('non lancia se key è valida (64 hex chars)', () => {
    expect(() => validateEncryptionKey()).not.toThrow()
  })

  test('non lancia in dev mode se manca key (solo warning)', () => {
    delete process.env.ENCRYPTION_KEY
    ;(process.env as Record<string, string | undefined>).NODE_ENV = 'development'
    expect(() => validateEncryptionKey()).not.toThrow()
  })

  test('lancia EncryptionError in produzione se manca key', () => {
    delete process.env.ENCRYPTION_KEY
    ;(process.env as Record<string, string | undefined>).NODE_ENV = 'production'
    expect(() => validateEncryptionKey()).toThrow(EncryptionError)
    expect(() => validateEncryptionKey()).toThrow(/required in production/)
  })

  test('lancia EncryptionError se key non è 64 hex chars', () => {
    process.env.ENCRYPTION_KEY = 'too-short'
    expect(() => validateEncryptionKey()).toThrow(EncryptionError)
  })
})
