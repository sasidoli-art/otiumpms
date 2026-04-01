import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'

const ticketSchema = z.object({
  oggetto: z.string().min(3).max(200),
  descrizione: z.string().min(10).max(5000),
  categoria: z.enum(['BUG', 'FEATURE_REQUEST', 'DOMANDA', 'PROBLEMA_ACCOUNT', 'ALTRO']).default('BUG'),
  priorita: z.enum(['BASSA', 'NORMALE', 'ALTA', 'URGENTE']).default('NORMALE'),
  paginaUrl: z.string().optional(),
  userAgent: z.string().optional(),
  screenshot: z.string().optional(),
})

// POST /api/ticket — crea un nuovo ticket
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })

  const body = await req.json()
  const parsed = ticketSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Dati non validi', details: parsed.error.flatten() }, { status: 422 })
  }

  const d = parsed.data

  // Get hostId if user is HOST
  let hostId: string | null = null
  if (session.user.role === 'HOST' && session.user.hostId) {
    hostId = session.user.hostId
  }

  const ticket = await prisma.ticket.create({
    data: {
      userId: session.user.id,
      hostId: hostId ?? undefined,
      oggetto: d.oggetto,
      descrizione: d.descrizione,
      categoria: d.categoria,
      priorita: d.priorita,
      paginaUrl: d.paginaUrl,
      userAgent: d.userAgent,
      screenshot: d.screenshot,
    },
  })

  return NextResponse.json(ticket, { status: 201 })
}

// GET /api/ticket — lista ticket dell'utente corrente
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })

  const tickets = await prisma.ticket.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: 'desc' },
    take: 50,
  })

  return NextResponse.json(tickets)
}
