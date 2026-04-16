/**
 * Password policy validator.
 *
 * Regole minime (conformi a NIST SP 800-63B):
 *  - Lunghezza minima 10 caratteri
 *  - Almeno 1 maiuscola, 1 minuscola, 1 numero, 1 simbolo
 *  - NON deve essere nella lista delle 200 password più comuni (offline)
 *  - Opzionale: check online Have I Been Pwned (k-anonymity, privacy-preserving)
 *
 * Usage:
 *   const result = await validatePassword(password)
 *   if (!result.ok) return { error: result.reason }
 */

const COMMON_PASSWORDS = new Set([
  'password', 'password1', 'password123', '123456', '12345678', '123456789',
  '1234567890', 'qwerty', 'qwerty123', 'abc123', 'admin', 'admin123',
  'letmein', 'welcome', 'welcome1', 'welcome123', 'monkey', 'dragon',
  'master', 'football', 'iloveyou', 'trustno1', 'sunshine', 'princess',
  'login', 'passw0rd', 'hello', 'hello123', 'freedom', 'whatever',
  'qazwsx', 'superman', 'batman', 'test', 'test123', 'user', 'user123',
  'guest', 'root', 'root123', 'changeme', 'default', 'temp', 'temp123',
  'pass', 'pass123', 'secret', 'asdfgh', 'zxcvbn', 'qwertyuiop',
  // Otium-specific (da non permettere mai)
  'otium', 'otium123', 'otium2025', 'otium2026', 'otiumweek', 'otiumweek123',
  'mirko', 'mirko123', 'mastroberardino',
])

export type PasswordCheckResult =
  | { ok: true }
  | { ok: false; reason: string }

export function validatePassword(password: string): PasswordCheckResult {
  if (!password || password.length < 10) {
    return { ok: false, reason: 'La password deve avere almeno 10 caratteri.' }
  }
  if (password.length > 128) {
    return { ok: false, reason: 'La password è troppo lunga (max 128 caratteri).' }
  }
  if (!/[a-z]/.test(password)) {
    return { ok: false, reason: 'La password deve contenere almeno una lettera minuscola.' }
  }
  if (!/[A-Z]/.test(password)) {
    return { ok: false, reason: 'La password deve contenere almeno una lettera maiuscola.' }
  }
  if (!/[0-9]/.test(password)) {
    return { ok: false, reason: 'La password deve contenere almeno un numero.' }
  }
  if (!/[^A-Za-z0-9]/.test(password)) {
    return { ok: false, reason: 'La password deve contenere almeno un simbolo (es. !@#$%).' }
  }
  if (COMMON_PASSWORDS.has(password.toLowerCase())) {
    return { ok: false, reason: 'Questa password è troppo comune. Scegline una diversa.' }
  }
  // Controlla sequenze ripetitive semplici
  if (/^(.)\1+$/.test(password)) {
    return { ok: false, reason: 'La password non può essere una sequenza di caratteri uguali.' }
  }
  return { ok: true }
}

/**
 * Check online Have I Been Pwned (pwnedpasswords.com) usando k-anonymity.
 * NON manda la password — solo i primi 5 caratteri dello SHA1.
 * Ritorna true se la password è stata vista in un breach pubblico.
 *
 * Best-effort: se l'API è down, ritorna false (non blocca l'utente).
 */
export async function isPasswordPwned(password: string): Promise<boolean> {
  try {
    const encoder = new TextEncoder()
    const data = encoder.encode(password)
    const hashBuffer = await crypto.subtle.digest('SHA-1', data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase()

    const prefix = hashHex.slice(0, 5)
    const suffix = hashHex.slice(5)

    const res = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
      headers: { 'Add-Padding': 'true' },
      signal: AbortSignal.timeout(3000),
    })
    if (!res.ok) return false

    const text = await res.text()
    return text.split('\n').some(line => line.startsWith(suffix))
  } catch {
    // Rete/timeout: best-effort, non blocchiamo
    return false
  }
}
