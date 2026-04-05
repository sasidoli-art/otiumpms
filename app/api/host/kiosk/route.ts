import { NextRequest, NextResponse } from 'next/server'
import { requireHost, isUnauthorized } from '@/lib/auth-middleware'
import { auditFromAuth } from '@/lib/audit'
import { prisma } from '@/lib/db'
import { z } from 'zod'
import { randomUUID } from 'crypto'

const kioskSchema = z.object({
  prenotazioneId: z.string().min(1),
  tipo: z.enum(['checkin', 'checkout', 'documenti', 'spa_waiver']),
})

/**
 * POST /api/host/kiosk — genera un token kiosk per firma su tablet
 * Il token scade dopo 15 minuti (è per uso immediato alla reception)
 */
export async function POST(req: NextRequest) {
  const auth = await requireHost()
  if (isUnauthorized(auth)) return auth

  const body = await req.json()
  const parsed = kioskSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Dati non validi' }, { status: 422 })
  }

  const { prenotazioneId, tipo } = parsed.data

  // Verifica che la prenotazione appartenga a questo host
  const prenotazione = await prisma.prenotazione.findFirst({
    where: { id: prenotazioneId, hostId: auth.user.hostId },
    select: {
      id: true,
      guestNome: true,
      guestCognome: true,
      guestEmail: true,
      checkInToken: true,
      struttura: { select: { nome: true } },
      host: { select: { nomeAzienda: true } },
    },
  })

  if (!prenotazione) {
    return NextResponse.json({ error: 'Prenotazione non trovata' }, { status: 404 })
  }

  // Genera token kiosk (riusa checkInToken se esiste, altrimenti ne crea uno)
  let token = prenotazione.checkInToken
  if (!token) {
    token = randomUUID()
    await prisma.prenotazione.update({
      where: { id: prenotazioneId },
      data: { checkInToken: token },
    })
  }

  const baseUrl = (process.env.NEXTAUTH_URL ?? 'http://localhost:3000').trim().replace(/\/+$/, '')

  return NextResponse.json({
    token,
    url: `${baseUrl}/kiosk/${token}?tipo=${tipo}`,
    guest: `${prenotazione.guestNome} ${prenotazione.guestCognome}`,
    struttura: prenotazione.struttura?.nome,
  })
}
