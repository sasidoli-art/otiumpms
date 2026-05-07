import { NextRequest, NextResponse } from 'next/server'
import { requireHostOrAdmin, isUnauthorized } from '@/lib/auth-middleware'
import { prisma } from '@/lib/db'

// PATCH /api/host/strutture/[id]/impostazioni
export async function PATCH(req: NextRequest, { params: paramsPromise }: { params: Promise<{ id: string }> }) {
  const params = await paramsPromise
  const auth = await requireHostOrAdmin()
  if (isUnauthorized(auth)) return auth
  const session = auth

  const existing = await prisma.struttura.findFirst({
    where: { id: params.id, hostId: auth.user.hostId },
  })
  if (!existing) return NextResponse.json({ error: 'Non trovata' }, { status: 404 })

  const body = await req.json()

  const struttura = await prisma.struttura.update({
    where: { id: params.id },
    data: {
      // Alloggiati Web
      ...(body.alloggiatiAbilitato !== undefined && { alloggiatiAbilitato: body.alloggiatiAbilitato }),
      ...(body.alloggiatiCodiceStruttura !== undefined && { alloggiatiCodiceStruttura: body.alloggiatiCodiceStruttura }),
      ...(body.alloggiatiComuneIstat !== undefined && { alloggiatiComuneIstat: body.alloggiatiComuneIstat }),
      ...(body.alloggiatiDenominazioneComune !== undefined && { alloggiatiDenominazioneComune: body.alloggiatiDenominazioneComune }),
      // Branding
      ...(body.logo !== undefined && { logo: body.logo }),
      ...(body.colorePrimario !== undefined && { colorePrimario: body.colorePrimario }),
      ...(body.coloreSecondario !== undefined && { coloreSecondario: body.coloreSecondario }),
      ...(body.fotoHero !== undefined && { fotoHero: body.fotoHero }),
      ...(body.messaggioChiusura !== undefined && { messaggioChiusura: body.messaggioChiusura }),
      ...(body.linkFacebook !== undefined && { linkFacebook: body.linkFacebook }),
      ...(body.linkInstagram !== undefined && { linkInstagram: body.linkInstagram }),
      ...(body.linkSitoWeb !== undefined && { linkSitoWeb: body.linkSitoWeb }),
    },
  })

  return NextResponse.json(struttura)
}
