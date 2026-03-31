import { NextRequest, NextResponse } from 'next/server'
import { requireHostOrAdmin, isUnauthorized } from '@/lib/auth-middleware'
import { prisma } from '@/lib/db'

export async function PUT(req: NextRequest, { params: p }: { params: Promise<{ id: string }> }) {
  const { id } = await p
  const auth = await requireHostOrAdmin()
  if (isUnauthorized(auth)) return auth

  const existing = await prisma.cabinaSpa.findFirst({ where: { id, hostId: auth.user.hostId } })
  if (!existing) return NextResponse.json({ error: 'Non trovato' }, { status: 404 })

  const body = await req.json()
  const updated = await prisma.cabinaSpa.update({
    where: { id },
    data: {
      nome: body.nome ?? existing.nome,
      descrizione: body.descrizione !== undefined ? (body.descrizione || null) : existing.descrizione,
      colore: body.colore ?? existing.colore,
      capacita: body.capacita !== undefined ? Number(body.capacita) : existing.capacita,
      attiva: body.attiva !== undefined ? body.attiva : existing.attiva,
    },
  })
  return NextResponse.json(updated)
}

export async function DELETE(_req: NextRequest, { params: p }: { params: Promise<{ id: string }> }) {
  const { id } = await p
  const auth = await requireHostOrAdmin()
  if (isUnauthorized(auth)) return auth

  const existing = await prisma.cabinaSpa.findFirst({ where: { id, hostId: auth.user.hostId } })
  if (!existing) return NextResponse.json({ error: 'Non trovato' }, { status: 404 })

  await prisma.cabinaSpa.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
