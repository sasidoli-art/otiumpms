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

  // Genera password random (10 char, caratteri non ambigui)
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const bytes = new Uint8Array(10)
  crypto.getRandomValues(bytes)
  const password = Array.from(bytes, (b) => chars[b % chars.length]).join('')

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
