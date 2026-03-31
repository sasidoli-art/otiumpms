import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

// PATCH /api/admin/eventi/[id]  — approva o rifiuta
export async function PATCH(req: NextRequest, { params: paramsPromise }: { params: Promise<{ id: string }> }) {
  const params = await paramsPromise
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
  }

  const body = await req.json()
  const { stato, noteAdmin } = body

  const allowedStati = ['APPROVATO', 'RIFIUTATO', 'BOZZA', 'SCADUTO']
  if (!allowedStati.includes(stato)) {
    return NextResponse.json({ error: 'Stato non valido' }, { status: 400 })
  }

  const evento = await prisma.evento.findUnique({ where: { id: params.id } })
  if (!evento) return NextResponse.json({ error: 'Non trovato' }, { status: 404 })

  const updated = await prisma.evento.update({
    where: { id: params.id },
    data: {
      stato,
      noteAdmin: noteAdmin ?? evento.noteAdmin,
      inEvidenza: stato === 'RIFIUTATO' ? false : evento.inEvidenza,
    },
  })

  return NextResponse.json(updated)
}
