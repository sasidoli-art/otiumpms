import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { randomUUID } from 'crypto'

// POST → genera (o restituisce) il check-in token per la prenotazione
export async function POST(
  _req: NextRequest,
  { params: paramsPromise }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user.hostId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await paramsPromise

  const prenotazione = await prisma.prenotazione.findFirst({
    where: { id, hostId: session.user.hostId },
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

  const baseUrl = process.env.NEXTAUTH_URL ?? 'http://localhost:3000'
  return NextResponse.json({ token, url: `${baseUrl}/checkin/${token}` })
}
