import { NextRequest, NextResponse } from 'next/server'
import { requireHost, isUnauthorized } from '@/lib/auth-middleware'
import { prisma } from '@/lib/db'
import { z } from 'zod'
import { parseBody } from '@/lib/validations'

// TODO: i18n

const createSchema = z.object({
  guestNome: z.string().min(1).max(100).trim(),
  guestEmail: z.string().email().max(254).trim().toLowerCase(),
  guestTelefono: z.string().max(30).trim().optional().nullable(),
  trattamentoId: z.string().optional().nullable(),
  terapistaId: z.string().optional().nullable(),
  dataDesiderata: z.string().min(1, 'Data desiderata obbligatoria'),
  fasceOrarie: z.enum(['mattina', 'pomeriggio', 'qualsiasi']).default('qualsiasi'),
  note: z.string().max(1000).trim().optional().nullable(),
  prenotazioneId: z.string().optional().nullable(),
})

const patchSchema = z.object({
  id: z.string().min(1),
  stato: z.enum(['IN_ATTESA', 'CONTATTATO', 'PRENOTATO', 'SCADUTO', 'CANCELLATO']),
  note: z.string().max(1000).trim().optional().nullable(),
})

// ─── GET: lista waiting list ────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const auth = await requireHost()
  if (isUnauthorized(auth)) return auth

  const { searchParams } = new URL(req.url)
  const stato = searchParams.get('stato')

  const where: Record<string, unknown> = { hostId: auth.user.hostId }
  if (stato && ['IN_ATTESA', 'CONTATTATO', 'PRENOTATO', 'SCADUTO', 'CANCELLATO'].includes(stato)) {
    where.stato = stato
  }

  const entries = await prisma.waitingListSpa.findMany({
    where,
    include: {
      trattamento: { select: { id: true, nome: true, categoria: true, durata: true, prezzo: true } },
      terapista: { select: { id: true, nome: true, cognome: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(entries)
}

// ─── POST: aggiungi alla waiting list ───────────────────────────────────────

export async function POST(req: NextRequest) {
  const auth = await requireHost()
  if (isUnauthorized(auth)) return auth

  const parsed = parseBody(createSchema, await req.json())
  if (parsed.error) return parsed.error

  const entry = await prisma.waitingListSpa.create({
    data: {
      hostId: auth.user.hostId,
      guestNome: parsed.data.guestNome,
      guestEmail: parsed.data.guestEmail,
      guestTelefono: parsed.data.guestTelefono ?? null,
      trattamentoId: parsed.data.trattamentoId ?? null,
      terapistaId: parsed.data.terapistaId ?? null,
      dataDesiderata: new Date(parsed.data.dataDesiderata),
      fasceOrarie: parsed.data.fasceOrarie,
      note: parsed.data.note ?? null,
      prenotazioneId: parsed.data.prenotazioneId ?? null,
    },
    include: {
      trattamento: { select: { id: true, nome: true } },
    },
  })

  return NextResponse.json(entry, { status: 201 })
}

// ─── PATCH: aggiorna stato ──────────────────────────────────────────────────

export async function PATCH(req: NextRequest) {
  const auth = await requireHost()
  if (isUnauthorized(auth)) return auth

  const parsed = parseBody(patchSchema, await req.json())
  if (parsed.error) return parsed.error

  // Verifica ownership
  const existing = await prisma.waitingListSpa.findFirst({
    where: { id: parsed.data.id, hostId: auth.user.hostId },
  })
  if (!existing) {
    return NextResponse.json({ error: 'Elemento non trovato' }, { status: 404 })
  }

  const updated = await prisma.waitingListSpa.update({
    where: { id: parsed.data.id },
    data: {
      stato: parsed.data.stato,
      ...(parsed.data.note !== undefined ? { note: parsed.data.note } : {}),
      ...(parsed.data.stato === 'CONTATTATO' ? { notificatoAt: new Date() } : {}),
    },
    include: {
      trattamento: { select: { id: true, nome: true } },
    },
  })

  return NextResponse.json(updated)
}
