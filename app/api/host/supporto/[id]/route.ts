import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

type RouteParams = { params: Promise<{ id: string }> }

// GET /api/host/supporto/[id] — dettaglio + thread risposte
// Verifica ownership: ticket userId deve essere == session.user.id OPPURE
// stesso hostId (per HOST role)
export async function GET(_: NextRequest, { params }: RouteParams) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
  const { id } = await params

  const ticket = await prisma.ticket.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, nome: true, cognome: true, email: true } },
      host: { select: { id: true, nomeAzienda: true } },
      risposte: { orderBy: { createdAt: 'asc' } },
    },
  })
  if (!ticket) return NextResponse.json({ error: 'Non trovato' }, { status: 404 })

  // Ownership
  const isOwner = ticket.userId === session.user.id
  const isSameHost = session.user.role === 'HOST'
    && session.user.hostId
    && ticket.hostId === session.user.hostId
  if (!isOwner && !isSameHost) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })
  }

  return NextResponse.json(ticket)
}
