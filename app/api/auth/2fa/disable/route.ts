import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import bcrypt from 'bcryptjs'
import { audit } from '@/lib/audit'

/**
 * POST /api/auth/2fa/disable
 * Body: { password: string } — richiede la password attuale come conferma
 *
 * Disattiva 2FA: cancella secret + backup codes. Audit log obbligatorio.
 */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
  }

  let body: { password?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Body non valido' }, { status: 400 })
  }
  if (!body.password) {
    return NextResponse.json({ error: 'Conferma con la tua password' }, { status: 400 })
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { password: true, email: true, role: true, twoFactorEnabled: true },
  })
  if (!user) {
    return NextResponse.json({ error: 'Utente non trovato' }, { status: 404 })
  }

  const passwordOk = await bcrypt.compare(body.password, user.password)
  if (!passwordOk) {
    return NextResponse.json({ error: 'Password non corretta' }, { status: 400 })
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      twoFactorEnabled: false,
      twoFactorSecret: null,
      twoFactorBackupCodes: [],
    },
  })

  await audit({
    userId: session.user.id,
    userEmail: user.email,
    azione: '2fa.disabled',
    entita: 'auth',
    dettagli: `2FA disattivato per ${user.role}`,
  })

  return NextResponse.json({ ok: true })
}
