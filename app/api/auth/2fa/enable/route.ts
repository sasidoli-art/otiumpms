import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { TOTP } from 'otpauth'
import { audit } from '@/lib/audit'

/**
 * POST /api/auth/2fa/enable
 * Body: { code: string } — codice TOTP a 6 cifre dall'app Authenticator
 *
 * Verifica il codice contro il secret pending, e se OK:
 *  - attiva twoFactorEnabled = true
 *  - genera 10 backup code (8 char alfanumerici, singolo uso)
 *  - ritorna i backup code IN CHIARO (SOLO QUESTA VOLTA — dopo non più)
 */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
  }

  let body: { code?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Body non valido' }, { status: 400 })
  }
  const code = (body.code || '').trim()
  if (!/^\d{6}$/.test(code)) {
    return NextResponse.json({ error: 'Codice deve essere 6 cifre' }, { status: 400 })
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { twoFactorSecret: true, email: true, role: true },
  })
  if (!user?.twoFactorSecret) {
    return NextResponse.json(
      { error: 'Setup 2FA non iniziato. Vai prima sulla pagina di setup.' },
      { status: 400 },
    )
  }

  const totp = new TOTP({
    issuer: 'Otium PMS',
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
    secret: user.twoFactorSecret,
  })
  const delta = totp.validate({ token: code, window: 1 })
  if (delta === null) {
    return NextResponse.json({ error: 'Codice non valido. Controlla l\'orologio del telefono e riprova.' }, { status: 400 })
  }

  // Genera 10 backup code (8 char alfanumerici, no ambigui)
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const backupCodes: string[] = []
  for (let i = 0; i < 10; i++) {
    const bytes = new Uint8Array(8)
    crypto.getRandomValues(bytes)
    backupCodes.push(Array.from(bytes, b => chars[b % chars.length]).join(''))
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      twoFactorEnabled: true,
      twoFactorBackupCodes: backupCodes,
    },
  })

  await audit({
    userId: session.user.id,
    userEmail: user.email,
    azione: '2fa.enabled',
    entita: 'auth',
    dettagli: `2FA TOTP attivato per ${user.role}`,
  })

  return NextResponse.json({
    ok: true,
    backupCodes, // SOLO QUESTA VOLTA — stampa/salva subito
  })
}
