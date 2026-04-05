import { NextRequest, NextResponse } from 'next/server'
import { requireHostOrAdmin, isUnauthorized } from '@/lib/auth-middleware'
import { auditFromAuth } from '@/lib/audit'
import { prisma } from '@/lib/db'

export async function PUT(req: NextRequest, { params: p }: { params: Promise<{ id: string }> }) {
  const { id } = await p
  const auth = await requireHostOrAdmin()
  if (isUnauthorized(auth)) return auth

  const existing = await prisma.percorsoBenessere.findFirst({ where: { id, hostId: auth.user.hostId } })
  if (!existing) return NextResponse.json({ error: 'Non trovato' }, { status: 404 })

  const body = await req.json()
  const { passaggi, ...rest } = body

  // Se vengono inviati passaggi, ricostruisci
  const durataCalcolata = Array.isArray(passaggi)
    ? passaggi.reduce((s: number, p: { durata: number }) => s + (Number(p.durata) || 0), 0)
    : existing.durataMinuti

  const updated = await prisma.percorsoBenessere.update({
    where: { id },
    data: {
      nome: rest.nome ?? existing.nome,
      descrizione: rest.descrizione !== undefined ? (rest.descrizione || null) : existing.descrizione,
      prezzo: rest.prezzo !== undefined ? Number(rest.prezzo) : existing.prezzo,
      durataMinuti: durataCalcolata,
      colore: rest.colore ?? existing.colore,
      attivo: rest.attivo !== undefined ? rest.attivo : existing.attivo,
      ...(Array.isArray(passaggi) ? {
        passaggi: {
          deleteMany: {},
          create: passaggi.map((p: { trattamentoId: string; ordine: number; durata: number; note?: string }) => ({
            trattamentoId: p.trattamentoId,
            ordine: Number(p.ordine) || 0,
            durata: Number(p.durata) || 60,
            note: p.note || null,
          })),
        },
      } : {}),
    },
    include: {
      passaggi: {
        include: { trattamento: { select: { id: true, nome: true, durata: true, colore: true } } },
        orderBy: { ordine: 'asc' },
      },
    },
  })
  return NextResponse.json(updated)
}

export async function DELETE(_req: NextRequest, { params: p }: { params: Promise<{ id: string }> }) {
  const { id } = await p
  const auth = await requireHostOrAdmin()
  if (isUnauthorized(auth)) return auth

  const existing = await prisma.percorsoBenessere.findFirst({ where: { id, hostId: auth.user.hostId } })
  if (!existing) return NextResponse.json({ error: 'Non trovato' }, { status: 404 })

  await prisma.percorsoBenessere.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
