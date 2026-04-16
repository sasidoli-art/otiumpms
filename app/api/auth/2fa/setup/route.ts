import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { TOTP, Secret } from 'otpauth'
import QRCode from 'qrcode'

/**
 * POST /api/auth/2fa/setup
 * Genera un nuovo secret TOTP per l'utente loggato (non attiva ancora 2FA).
 * Ritorna: secret (base32), qrCodeDataUrl, uri (otpauth://) per testare.
 *
 * Il secret viene salvato TEMPORANEAMENTE su User.twoFactorSecret in attesa
 * di conferma via /enable. Se l'utente non conferma entro la sessione,
 * il secret resta ma twoFactorEnabled=false → login funziona senza TOTP.
 *
 * Regenerare il setup invalida il secret precedente.
 */
export async function POST(_req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { email: true, twoFactorEnabled: true },
  })
  if (!user) {
    return NextResponse.json({ error: 'Utente non trovato' }, { status: 404 })
  }

  // Genera secret casuale (20 bytes = 160 bit, standard TOTP)
  const secret = new Secret({ size: 20 })
  const totp = new TOTP({
    issuer: 'Otium PMS',
    label: user.email,
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
    secret,
  })

  const uri = totp.toString()
  const qrCodeDataUrl = await QRCode.toDataURL(uri, {
    errorCorrectionLevel: 'M',
    margin: 2,
    width: 256,
  })

  // Salva il secret pending. NON attiva 2FA: l'utente deve verificare.
  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      twoFactorSecret: secret.base32,
      twoFactorEnabled: false, // attivato solo dopo verifica /enable
    },
  })

  return NextResponse.json({
    secret: secret.base32,
    qrCodeDataUrl,
    uri,
    alreadyEnabled: user.twoFactorEnabled,
  })
}
