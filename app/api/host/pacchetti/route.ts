import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireHostOrAdmin, isUnauthorized } from '@/lib/auth-middleware'
import { auditFromAuth } from '@/lib/audit'
import { z } from 'zod'
import { parseBody } from '@/lib/validations'

const pachettoCreateSchema = z.object({
  strutturaId: z.string().min(1),
  nome: z.string().min(1).max(200),
  descrizione: z.string().optional(),
  immagine: z.string().optional(),
  eventoId: z.string().optional(),
  eventoEsterno: z.string().optional(),
  notti: z.coerce.number().int().min(1).default(1),
  numOspiti: z.coerce.number().int().min(1).default(2),
  prezzo: z.coerce.number().min(0),
  prezzoOriginale: z.coerce.number().min(0).optional(),
  incluso: z.array(z.string()).default([]),
  attivo: z.boolean().default(true),
  dataInizio: z.string().optional(),
  dataFine: z.string().optional(),
})

export async function GET() {
  const auth = await requireHostOrAdmin()
  if (isUnauthorized(auth)) return auth

  const pacchetti = await prisma.pacchetto.findMany({
    where: { hostId: auth.user.hostId },
    include: {
      struttura: { select: { id: true, nome: true } },
      evento: { select: { id: true, titolo: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(pacchetti)
}

export async function POST(req: NextRequest) {
  const auth = await requireHostOrAdmin()
  if (isUnauthorized(auth)) return auth

  const raw = await req.json()
  const { data, error } = parseBody(pachettoCreateSchema, raw)
  if (error) return error

  // Verify struttura belongs to host
  const struttura = await prisma.struttura.findFirst({
    where: { id: data.strutturaId, hostId: auth.user.hostId },
  })
  if (!struttura) {
    return NextResponse.json({ error: 'Struttura non trovata' }, { status: 404 })
  }

  // Verify evento belongs to host if provided
  if (data.eventoId) {
    const evento = await prisma.evento.findFirst({
      where: { id: data.eventoId, hostId: auth.user.hostId },
    })
    if (!evento) {
      return NextResponse.json({ error: 'Evento non trovato' }, { status: 404 })
    }
  }

  const pacchetto = await prisma.pacchetto.create({
    data: {
      hostId: auth.user.hostId,
      strutturaId: data.strutturaId,
      nome: data.nome,
      descrizione: data.descrizione,
      immagine: data.immagine,
      eventoId: data.eventoId || null,
      eventoEsterno: data.eventoEsterno || null,
      notti: data.notti,
      numOspiti: data.numOspiti,
      prezzo: data.prezzo,
      prezzoOriginale: data.prezzoOriginale,
      incluso: data.incluso,
      attivo: data.attivo,
      dataInizio: data.dataInizio ? new Date(data.dataInizio) : null,
      dataFine: data.dataFine ? new Date(data.dataFine) : null,
    },
  })

  return NextResponse.json(pacchetto, { status: 201 })
}
