import { NextRequest, NextResponse } from 'next/server'
import { requireHostOrAdmin, isUnauthorized } from '@/lib/auth-middleware'
import { prisma } from '@/lib/db'
import { randomUUID } from 'crypto'

// POST → genera (o restituisce) il check-in token per la prenotazione
export async function POST(
  _req: NextRequest,
  { params: paramsPromise }: { params: Promise<{ id: string }> }
) {
  const auth = await requireHostOrAdmin()
  if (isUnauthorized(auth)) return auth

  const { id } = await paramsPromise

  const prenotazione = await prisma.prenotazione.findFirst({
    where: { id, hostId: auth.user.hostId },
    select: { id: true, checkInToken: true, stato: true },
  })

  if (!prenotazione) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (prenotazione.stato === 'ANNULLATA') {
    return NextResponse.json({ error: 'Prenotazione annullata' }, { status: 400 })
  }

  // Riusa il token esistente o ne genera uno nuovo
  const token = prenotazione.checkInToken ?? randomUUID()

  if (!prenotazione.checkInToken) {
    await prisma.prenotazione.update({
      where: { id },
      data: { checkInToken: token },
    })
  }

  const baseUrl = (process.env.NEXTAUTH_URL ?? 'http://localhost:3000').trim().replace(/\/+$/, '')
  return NextResponse.json({ token, url: `${baseUrl}/checkin/${token}` })
}
