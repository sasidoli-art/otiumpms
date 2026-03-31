import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

// GET /api/admin/fatture/[id]
export async function GET(_: NextRequest, { params: paramsPromise }: { params: Promise<{ id: string }> }) {
  const params = await paramsPromise
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
  }

  const fattura = await prisma.fattura.findUnique({
    where: { id: params.id },
    include: { host: { select: { nomeAzienda: true } } },
  })

  if (!fattura) return NextResponse.json({ error: 'Non trovato' }, { status: 404 })
  return NextResponse.json(fattura)
}

// PATCH /api/admin/fatture/[id]
export async function PATCH(req: NextRequest, { params: paramsPromise }: { params: Promise<{ id: string }> }) {
  const params = await paramsPromise
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
  }

  const fattura = await prisma.fattura.findUnique({ where: { id: params.id } })
  if (!fattura) return NextResponse.json({ error: 'Non trovato' }, { status: 404 })

  const body = await req.json()

  const updated = await prisma.fattura.update({
    where: { id: params.id },
    data: {
      stato: body.stato ?? fattura.stato,
      note: body.note ?? fattura.note,
    },
  })

  return NextResponse.json(updated)
}
