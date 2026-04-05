import { NextRequest, NextResponse } from 'next/server'
import { requireHostOrAdmin, isUnauthorized } from '@/lib/auth-middleware'
import { auditFromAuth } from '@/lib/audit'
import { prisma } from '@/lib/db'

/**
 * GET  /api/host/spa/terapisti/[id]/disponibilita
 * POST /api/host/spa/terapisti/[id]/disponibilita
 */
export async function GET(_req: NextRequest, { params: p }: { params: Promise<{ id: string }> }) {
  const { id } = await p
  const auth = await requireHostOrAdmin()
  if (isUnauthorized(auth)) return auth

  // Ownership check
  const terapista = await prisma.terapistaSpa.findFirst({ where: { id, hostId: auth.user.hostId } })
  if (!terapista) return NextResponse.json({ error: 'Non trovato' }, { status: 404 })

  const disponibilita = await prisma.disponibilitaTerapista.findMany({
    where: { terapistaId: id },
    orderBy: [{ tipo: 'asc' }, { giorno: 'asc' }, { orarioInizio: 'asc' }],
  })
  return NextResponse.json(disponibilita)
}

export async function POST(req: NextRequest, { params: p }: { params: Promise<{ id: string }> }) {
  const { id } = await p
  const auth = await requireHostOrAdmin()
  if (isUnauthorized(auth)) return auth

  const terapista = await prisma.terapistaSpa.findFirst({ where: { id, hostId: auth.user.hostId } })
  if (!terapista) return NextResponse.json({ error: 'Non trovato' }, { status: 404 })

  const body = await req.json()
  const { tipo, giorno, data, orarioInizio, orarioFine } = body

  if (!orarioInizio || !orarioFine) {
    return NextResponse.json({ error: 'Orario inizio e fine obbligatori' }, { status: 422 })
  }
  if (tipo === 'SETTIMANALE' && (giorno === undefined || giorno === null)) {
    return NextResponse.json({ error: 'Giorno settimana obbligatorio per disponibilità settimanale' }, { status: 422 })
  }

  const slot = await prisma.disponibilitaTerapista.create({
    data: {
      hostId: auth.user.hostId,
      terapistaId: id,
      tipo: tipo || 'SETTIMANALE',
      giorno: (tipo === 'SETTIMANALE' || !tipo) ? Number(giorno) : null,
      data: data ? new Date(data) : null,
      orarioInizio,
      orarioFine,
    },
  })
  return NextResponse.json(slot, { status: 201 })
}
