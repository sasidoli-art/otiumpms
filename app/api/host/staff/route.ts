import { getServerSession } from 'next-auth'
import { requireHostOrAdmin, isUnauthorized } from '@/lib/auth-middleware'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { NextResponse } from 'next/server'

// GET /api/host/staff?archiviato=false
export async function GET(req: Request) {
  const auth = await requireHostOrAdmin()
  if (isUnauthorized(auth)) return auth
  const session = auth

  const { searchParams } = new URL(req.url)
  const archiviato = searchParams.get('archiviato') === 'true'

  const comunicazioni = await prisma.comunicazioneStaff.findMany({
    where: { hostId: auth.user.hostId, archiviato },
    orderBy: [{ fissato: 'desc' }, { createdAt: 'desc' }],
  })

  return NextResponse.json(comunicazioni)
}

// POST /api/host/staff
export async function POST(req: Request) {
  const auth = await requireHostOrAdmin()
  if (isUnauthorized(auth)) return auth
  const session = auth

  const body = await req.json()
  const { tipo, titolo, testo, autore, destinatari, fissato, dataScadenza } = body

  if (!titolo || !autore) {
    return NextResponse.json({ error: 'titolo e autore sono obbligatori' }, { status: 400 })
  }

  const com = await prisma.comunicazioneStaff.create({
    data: {
      hostId: auth.user.hostId,
      tipo: tipo ?? 'AVVISO',
      titolo,
      testo: testo ?? null,
      autore,
      destinatari: destinatari ?? [],
      fissato: fissato ?? false,
      dataScadenza: dataScadenza ? new Date(dataScadenza) : null,
    },
  })

  // Notifica in-app per comunicazioni urgenti o task
  if (tipo === 'URGENTE' || tipo === 'TASK') {
    await prisma.notifica.create({
      data: {
        hostId: auth.user.hostId,
        tipo: 'sistema',
        titolo: tipo === 'URGENTE' ? 'Comunicazione urgente' : 'Nuovo task staff',
        messaggio: `${autore}: "${titolo}"`,
        linkUrl: '/host/staff',
      },
    })
  }

  return NextResponse.json(com, { status: 201 })
}
