import { NextRequest, NextResponse } from 'next/server'
import { requireHostOrAdmin, isUnauthorized } from '@/lib/auth-middleware'
import { prisma } from '@/lib/db'

export async function PUT(req: NextRequest, { params: p }: { params: Promise<{ id: string }> }) {
  const { id } = await p
  const auth = await requireHostOrAdmin()
  if (isUnauthorized(auth)) return auth

  const existing = await prisma.trattamentoSpa.findFirst({ where: { id, hostId: auth.user.hostId } })
  if (!existing) return NextResponse.json({ error: 'Non trovato' }, { status: 404 })

  const body = await req.json()
  const updated = await prisma.trattamentoSpa.update({
    where: { id },
    data: {
      nome: body.nome ?? existing.nome,
      categoria: body.categoria ?? existing.categoria,
      durata: body.durata !== undefined ? Number(body.durata) : existing.durata,
      prezzo: body.prezzo !== undefined ? Number(body.prezzo) : existing.prezzo,
      descrizione: body.descrizione !== undefined ? (body.descrizione || null) : existing.descrizione,
      colore: body.colore ?? existing.colore,
      attivo: body.attivo !== undefined ? body.attivo : existing.attivo,
      prenotabileOnline: body.prenotabileOnline !== undefined ? Boolean(body.prenotabileOnline) : existing.prenotabileOnline,
    },
  })
  return NextResponse.json(updated)
}

export async function DELETE(_req: NextRequest, { params: p }: { params: Promise<{ id: string }> }) {
  const { id } = await p
  const auth = await requireHostOrAdmin()
  if (isUnauthorized(auth)) return auth

  const existing = await prisma.trattamentoSpa.findFirst({ where: { id, hostId: auth.user.hostId } })
  if (!existing) return NextResponse.json({ error: 'Non trovato' }, { status: 404 })

  await prisma.trattamentoSpa.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
