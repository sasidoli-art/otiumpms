import { NextRequest, NextResponse } from 'next/server'
import { requireHost, isUnauthorized } from '@/lib/auth-middleware'
import { auditFromAuth } from '@/lib/audit'
import { prisma } from '@/lib/db'
import { z } from 'zod'
import { parseBody } from '@/lib/validations'

const accompagnatoreSchema = z.object({
  nome: z.string().min(1, 'Nome obbligatorio').max(100),
  cognome: z.string().min(1, 'Cognome obbligatorio').max(100),
  sesso: z.enum(['M', 'F']).optional().nullable(),
  dataNascita: z.string().optional().nullable(),
  luogoNascita: z.string().max(100).optional().nullable(),
  provinciaNascita: z.string().max(2).optional().nullable(),
  nazionalita: z.string().max(50).optional().nullable(),
  tipoDocumento: z.string().max(20).optional().nullable(),
  numeroDocumento: z.string().max(50).optional().nullable(),
  luogoRilascio: z.string().max(100).optional().nullable(),
  provinciaRilascio: z.string().max(2).optional().nullable(),
  comuneNascitaIstat: z.string().max(20).optional().nullable(),
  statoNascitaIstat: z.string().max(20).optional().nullable(),
  cittadinanzaIstat: z.string().max(20).optional().nullable(),
  comuneRilascioIstat: z.string().max(20).optional().nullable(),
  statoRilascioIstat: z.string().max(20).optional().nullable(),
  email: z.string().email().optional().nullable(),
  telefono: z.string().max(30).optional().nullable(),
  note: z.string().max(500).optional().nullable(),
  isMinore: z.boolean().default(false),
})

// GET /api/host/prenotazioni/[id]/accompagnatori
export async function GET(
  _: NextRequest,
  { params: paramsPromise }: { params: Promise<{ id: string }> },
) {
  const auth = await requireHost()
  if (isUnauthorized(auth)) return auth
  const { id } = await paramsPromise

  const prenotazione = await prisma.prenotazione.findFirst({
    where: { id, hostId: auth.user.hostId },
    select: { id: true },
  })
  if (!prenotazione) return NextResponse.json({ error: 'Prenotazione non trovata' }, { status: 404 })

  const accompagnatori = await prisma.accompagnatore.findMany({
    where: { prenotazioneId: id },
    orderBy: { createdAt: 'asc' },
  })

  return NextResponse.json(accompagnatori)
}

// POST /api/host/prenotazioni/[id]/accompagnatori
export async function POST(
  req: NextRequest,
  { params: paramsPromise }: { params: Promise<{ id: string }> },
) {
  const auth = await requireHost()
  if (isUnauthorized(auth)) return auth
  const { id } = await paramsPromise

  const prenotazione = await prisma.prenotazione.findFirst({
    where: { id, hostId: auth.user.hostId },
    select: { id: true },
  })
  if (!prenotazione) return NextResponse.json({ error: 'Prenotazione non trovata' }, { status: 404 })

  const parsed = parseBody(accompagnatoreSchema, await req.json())
  if (parsed.error) return parsed.error

  const { dataNascita, ...rest } = parsed.data

  const accompagnatore = await prisma.accompagnatore.create({
    data: {
      prenotazioneId: id,
      ...rest,
      dataNascita: dataNascita ? new Date(dataNascita) : null,
    },
  })

  await auditFromAuth(auth, {
    azione: 'accompagnatore.creato',
    entita: 'accompagnatore',
    entitaId: accompagnatore.id,
    dettagli: `Accompagnatore ${accompagnatore.cognome} ${accompagnatore.nome} aggiunto a prenotazione ${id}${accompagnatore.isMinore ? ' (minore)' : ''}`,
  })

  return NextResponse.json(accompagnatore, { status: 201 })
}

// DELETE /api/host/prenotazioni/[id]/accompagnatori?accId=xxx
export async function DELETE(
  req: NextRequest,
  { params: paramsPromise }: { params: Promise<{ id: string }> },
) {
  const auth = await requireHost()
  if (isUnauthorized(auth)) return auth
  const { id } = await paramsPromise

  const accId = new URL(req.url).searchParams.get('accId')
  if (!accId) return NextResponse.json({ error: 'accId richiesto' }, { status: 400 })

  // Verifica ownership
  const accompagnatore = await prisma.accompagnatore.findFirst({
    where: { id: accId, prenotazione: { id, hostId: auth.user.hostId } },
  })
  if (!accompagnatore) return NextResponse.json({ error: 'Non trovato' }, { status: 404 })

  await prisma.accompagnatore.delete({ where: { id: accId } })

  await auditFromAuth(auth, {
    azione: 'accompagnatore.eliminato',
    entita: 'accompagnatore',
    entitaId: accId,
    dettagli: `Accompagnatore ${accompagnatore.cognome} ${accompagnatore.nome} rimosso da prenotazione ${id}`,
  })

  return NextResponse.json({ ok: true })
}
