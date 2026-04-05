import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { requireHostOrAdmin, isUnauthorized } from '@/lib/auth-middleware'
import { auditFromAuth } from '@/lib/audit'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

// POST /api/host/prenotazioni/[id]/chat  — crea chat se non esiste
export async function POST(_: NextRequest, { params: paramsPromise }: { params: Promise<{ id: string }> }) {
  const params = await paramsPromise
  const auth = await requireHostOrAdmin()
  if (isUnauthorized(auth)) return auth
  const session = auth

  const prenotazione = await prisma.prenotazione.findFirst({
    where: { id: params.id, hostId: auth.user.hostId },
  })
  if (!prenotazione) return NextResponse.json({ error: 'Non trovato' }, { status: 404 })

  // Usa upsert per evitare duplicati
  const chat = await prisma.chat.upsert({
    where: { prenotazioneId: params.id },
    create: {
      prenotazioneId: params.id,
      hostId: auth.user.hostId,
    },
    update: {},
  })

  return NextResponse.json(chat, { status: 201 })
}
