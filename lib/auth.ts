import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/db'
import { rateLimit } from '@/lib/rate-limit'
import { audit } from '@/lib/audit'
import { TOTP } from 'otpauth'

/**
 * Verifica un codice TOTP a 6 cifre contro il secret salvato sull'utente.
 * Tollera drift orologio di ±1 step (default 30s = ±30s).
 */
function verifyTotp(secret: string, code: string): boolean {
  try {
    const totp = new TOTP({
      issuer: 'Otium PMS',
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
      secret,
    })
    // window=1 → accetta il codice attuale, il precedente e il successivo
    const delta = totp.validate({ token: code, window: 1 })
    return delta !== null
  } catch {
    return false
  }
}

/**
 * Verifica un backup code: se matcha, lo rimuove dalla lista dei codici disponibili.
 * I backup code sono stringhe plain (8 caratteri alphanumeric) — singolo uso.
 */
async function consumeBackupCode(userId: string, code: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { twoFactorBackupCodes: true },
  })
  if (!user) return false
  const normalized = code.trim().toUpperCase().replace(/[^A-Z0-9]/g, '')
  const idx = user.twoFactorBackupCodes.indexOf(normalized)
  if (idx === -1) return false

  const remaining = [...user.twoFactorBackupCodes]
  remaining.splice(idx, 1)
  await prisma.user.update({
    where: { id: userId },
    data: { twoFactorBackupCodes: remaining },
  })
  return true
}

export const authOptions: NextAuthOptions = {
  session: {
    strategy: 'jwt',
    maxAge: 7 * 24 * 60 * 60, // 7 giorni (security: sessioni lunghe sono rischiose)
    updateAge: 24 * 60 * 60, // rotazione silenziosa ogni 24h per invalidare token rubati
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
        totpCode: { label: 'Codice 2FA', type: 'text' },
      },
      async authorize(credentials, req): Promise<any> {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Email e password obbligatorie')
        }

        const email = credentials.email.toLowerCase().trim()

        // ── Rate limit: 5 tentativi per IP+email ogni 15 minuti ────────────
        // Chiave combinata: IP da solo è troppo permissivo (NAT),
        // email da sola permette a un attaccante su più IP di bloccare l'account.
        const ipHeader = (req?.headers?.['x-forwarded-for'] as string) || 'unknown'
        const ip = ipHeader.split(',')[0].trim()
        const rlKey = `login:${ip}:${email}`
        const rl = rateLimit(rlKey, { windowMs: 15 * 60 * 1000, max: 5 })
        if (!rl.allowed) {
          await audit({
            userEmail: email,
            azione: 'login.rate_limited',
            entita: 'auth',
            dettagli: `Troppi tentativi. Blocco fino a ${rl.retryAfter}s`,
            ip,
            userAgent: (req?.headers?.['user-agent'] as string) || null,
          })
          throw new Error(`Troppi tentativi di login. Riprova tra ${Math.ceil(rl.retryAfter / 60)} minuti.`)
        }

        const user = await prisma.user.findUnique({
          where: { email },
          include: { host: true },
        })

        if (!user) {
          await audit({
            userEmail: email,
            azione: 'login.failed',
            entita: 'auth',
            dettagli: 'Utente non trovato',
            ip,
            userAgent: (req?.headers?.['user-agent'] as string) || null,
          })
          throw new Error('Credenziali non valide')
        }

        if (!user.attivo) {
          await audit({
            userId: user.id,
            userEmail: email,
            azione: 'login.failed',
            entita: 'auth',
            dettagli: 'Account disabilitato',
            ip,
            userAgent: (req?.headers?.['user-agent'] as string) || null,
          })
          throw new Error('Account disabilitato. Contatta il supporto.')
        }

        const passwordOk = await bcrypt.compare(credentials.password, user.password)
        if (!passwordOk) {
          await audit({
            userId: user.id,
            userEmail: email,
            azione: 'login.failed',
            entita: 'auth',
            dettagli: 'Password errata',
            ip,
            userAgent: (req?.headers?.['user-agent'] as string) || null,
          })
          throw new Error('Credenziali non valide')
        }

        // ── 2FA enforcement ───────────────────────────────────────────────
        // SUPERADMIN: 2FA obbligatorio se attivato (e deve attivarlo al primo login).
        // Altri ruoli: 2FA opzionale, controllato solo se twoFactorEnabled=true.
        if (user.twoFactorEnabled && user.twoFactorSecret) {
          const code = (credentials.totpCode || '').trim()
          if (!code) {
            // Segnale standard al client: serve step 2
            throw new Error('2FA_REQUIRED')
          }

          // Prima prova codice TOTP, poi backup code
          const totpOk = verifyTotp(user.twoFactorSecret, code)
          let used: 'totp' | 'backup' | null = totpOk ? 'totp' : null

          if (!totpOk) {
            const backupOk = await consumeBackupCode(user.id, code)
            if (backupOk) used = 'backup'
          }

          if (!used) {
            await audit({
              userId: user.id,
              userEmail: email,
              azione: 'login.2fa_failed',
              entita: 'auth',
              dettagli: 'Codice 2FA errato',
              ip,
              userAgent: (req?.headers?.['user-agent'] as string) || null,
            })
            throw new Error('Codice 2FA non valido')
          }

          await audit({
            userId: user.id,
            userEmail: email,
            azione: used === 'backup' ? 'login.2fa_backup_used' : 'login.success',
            entita: 'auth',
            dettagli: used === 'backup' ? 'Login con backup code' : 'Login con TOTP',
            ip,
            userAgent: (req?.headers?.['user-agent'] as string) || null,
          })
        } else {
          await audit({
            userId: user.id,
            userEmail: email,
            azione: 'login.success',
            entita: 'auth',
            dettagli: user.role === 'SUPERADMIN' ? 'SUPERADMIN senza 2FA — attiva 2FA ASAP' : null,
            ip,
            userAgent: (req?.headers?.['user-agent'] as string) || null,
          })
        }

        return {
          id: user.id,
          email: user.email,
          name: `${user.nome} ${user.cognome}`,
          role: user.role,
          hostId: user.host?.id ?? null,
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = user.role
        token.hostId = user.hostId
      }
      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id
        session.user.role = token.role
        session.user.hostId = token.hostId
      }
      return session
    },
  },
}
