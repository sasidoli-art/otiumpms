import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireSuperAdmin, isUnauthorized } from '@/lib/auth-middleware'
import { audit } from '@/lib/audit'
import bcrypt from 'bcryptjs'

/**
 * POST /api/superadmin/host/[id]/reset-password
 * Genera una nuova password casuale per il referente dell'host.
 * Ritorna la password in chiaro UNA SOLA VOLTA — non viene salvata in chiaro.
 */
export async function POST(
  _req: NextRequest,
  { params: paramsPromise }: { params: Promise<{ id: string }> }
) {
  const auth = await requireSuperAdmin()
  if (isUnauthorized(auth)) return auth

  const { id } = await paramsPromise
  const host = await prisma.host.findUnique({
    where: { id },
    select: { userId: true, nomeAzienda: true, user: { select: { email: true } } },
  })
  if (!host) return NextResponse.json({ error: 'Host non trovato' }, { status: 404 })

  // Genera password random forte conforme alla policy:
  // 14 char con almeno 1 per ogni classe (min, maiusc, num, simbolo).
  // Caratteri ambigui (0/O, 1/l/I) evitati per leggibilità al telefono.
  const lower = 'abcdefghijkmnpqrstuvwxyz'
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
  const nums = '23456789'
  const syms = '!@#$%&*+?'
  const all = lower + upper + nums + syms

  function pick(set: string): string {
    const buf = new Uint8Array(1)
    crypto.getRandomValues(buf)
    return set[buf[0] % set.length]
  }

  // 4 obbligatori + 10 random dal set completo
  const pool = [pick(lower), pick(upper), pick(nums), pick(syms)]
  for (let i = 0; i < 10; i++) pool.push(pick(all))
  // Shuffle Fisher-Yates crypto-safe
  for (let i = pool.length - 1; i > 0; i--) {
    const buf = new Uint8Array(1)
    crypto.getRandomValues(buf)
    const j = buf[0] % (i + 1)
    ;[pool[i], pool[j]] = [pool[j], pool[i]]
  }
  const password = pool.join('')

  const hashedPassword = await bcrypt.hash(password, 12)

  await prisma.user.update({
    where: { id: host.userId },
    data: { password: hashedPassword },
  })

  await audit({
    hostId: id,
    userId: auth.user.id,
    userEmail: auth.user.email,
    azione: 'superadmin.host.password_reset',
    entita: 'Host',
    entitaId: id,
    dettagli: `Password reset per host "${host.nomeAzienda}" (${host.user.email})`,
  })

  return NextResponse.json({
    ok: true,
    password, // solo questa volta
    email: host.user.email,
  })
}
