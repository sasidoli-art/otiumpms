import { NextRequest, NextResponse } from 'next/server'
import { requireHostOrAdmin, isUnauthorized } from '@/lib/auth-middleware'
import { prisma } from '@/lib/db'

export async function PUT(req: NextRequest, { params: p }: { params: Promise<{ id: string }> }) {
  const { id } = await p
  const auth = await requireHostOrAdmin()
  if (isUnauthorized(auth)) return auth

  const existing = await prisma.terapistaSpa.findFirst({ where: { id, hostId: auth.user.hostId } })
  if (!existing) return NextResponse.json({ error: 'Non trovato' }, { status: 404 })

  const body = await req.json()
  const { nome, cognome, email, telefono, colore, specializzazioni, note, attivo } = body

  const updated = await prisma.terapistaSpa.update({
    where: { id },
    data: {
      nome: nome ?? existing.nome,
      cognome: cognome ?? existing.cognome,
      email: email !== undefined ? (email || null) : existing.email,
      telefono: telefono !== undefined ? (telefono || null) : existing.telefono,
      colore: colore ?? existing.colore,
      specializzazioni: specializzazioni ?? existing.specializzazioni,
      note: note !== undefined ? (note || null) : existing.note,
      attivo: attivo !== undefined ? attivo : existing.attivo,
    },
  })
  return NextResponse.json(updated)
}

export async function DELETE(_req: NextRequest, { params: p }: { params: Promise<{ id: string }> }) {
  const { id } = await p
  const auth = await requireHostOrAdmin()
  if (isUnauthorized(auth)) return auth

  const existing = await prisma.terapistaSpa.findFirst({ where: { id, hostId: auth.user.hostId } })
  if (!existing) return NextResponse.json({ error: 'Non trovato' }, { status: 404 })

  await prisma.terapistaSpa.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
