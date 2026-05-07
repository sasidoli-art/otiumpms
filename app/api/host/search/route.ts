import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireHostOrAdmin, isUnauthorized } from '@/lib/auth-middleware'
import { notDeleted } from '@/lib/prisma-helpers'

export async function GET(req: NextRequest) {
  const auth = await requireHostOrAdmin()
  if (isUnauthorized(auth)) return auth

  const q = req.nextUrl.searchParams.get('q')?.trim()
  if (!q || q.length < 2) return NextResponse.json({ results: [] })

  const hostId = auth.user.hostId
  const like = `%${q}%`

  const [prenotazioni, ospiti, strutture] = await Promise.all([
    prisma.prenotazione.findMany({
      where: {
        hostId,
        ...notDeleted,
        OR: [
          { guestNome: { contains: q, mode: 'insensitive' } },
          { guestCognome: { contains: q, mode: 'insensitive' } },
          { guestEmail: { contains: q, mode: 'insensitive' } },
        ],
      },
      select: { id: true, guestNome: true, guestCognome: true, guestEmail: true, stato: true, dataArrivo: true },
      orderBy: { createdAt: 'desc' },
      take: 5,
    }),
    prisma.ospiteCRM.findMany({
      where: {
        hostId,
        ...notDeleted,
        OR: [
          { nome: { contains: q, mode: 'insensitive' } },
          { cognome: { contains: q, mode: 'insensitive' } },
          { email: { contains: q, mode: 'insensitive' } },
        ],
      },
      select: { id: true, nome: true, cognome: true, email: true, vip: true },
      take: 5,
    }),
    prisma.struttura.findMany({
      where: {
        hostId,
        ...notDeleted,
        OR: [
          { nome: { contains: q, mode: 'insensitive' } },
          { citta: { contains: q, mode: 'insensitive' } },
        ],
      },
      select: { id: true, nome: true, citta: true, tipo: true },
      take: 5,
    }),
  ])

  return NextResponse.json({
    results: [
      ...prenotazioni.map(p => ({
        type: 'prenotazione' as const,
        id: p.id,
        label: `${p.guestNome} ${p.guestCognome}`,
        sub: p.guestEmail,
        href: `/host/prenotazioni/${p.id}`,
      })),
      ...ospiti.map(o => ({
        type: 'ospite' as const,
        id: o.id,
        label: `${o.nome} ${o.cognome}`,
        sub: o.email,
        href: `/host/crm/${o.id}`,
      })),
      ...strutture.map(s => ({
        type: 'struttura' as const,
        id: s.id,
        label: s.nome,
        sub: s.citta ?? s.tipo,
        href: `/host/strutture/${s.id}`,
      })),
    ],
  })
}
