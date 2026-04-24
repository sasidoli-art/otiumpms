/**
 * Vitest setup — eseguito prima di ogni test file.
 *
 * - jest-dom matchers (`toBeInTheDocument`, `toHaveClass`, ecc.) per test React
 * - Fix ENV var di default per test (no crash su secret mancanti)
 */

import '@testing-library/jest-dom/vitest'

// Chiave encryption deterministica per test (32 bytes / 64 hex chars).
// Non è mai la chiave di produzione — vive solo nel test runner.
process.env.ENCRYPTION_KEY ??=
  '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'

// NextAuth secret per test (HMAC helpers che lo richiedono).
process.env.NEXTAUTH_SECRET ??= 'test-secret-nextauth-0123456789abcdef'

// Database URL placeholder — Prisma client viene mockato nei test unit,
// ma alcune chiamate possono provare a istanziarlo.
process.env.DATABASE_URL ??= 'postgresql://test:test@localhost:5432/test'
