import { z } from 'zod'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireHostOrAdmin, isUnauthorized } from '@/lib/auth-middleware'
import { auditFromAuth } from '@/lib/audit'

const createSchema = z.object({
  nome: z.string().min(1),
  referenteNome: z.string().min(1),
  referenteCognome: z.string().min(1),
  referenteEmail: z.string().email(),
  referenteTelefono: z.string().nullable().optional(),
  dataArrivo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  dataPartenza: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  numOspitiTotali: z.number().int().min(1),
  prezzoTotale: z.number().nullable().optional(),
  scontoPercent: z.number().min(0).max(100).nullable().optional(),
  note: z.string().nullable().optional(),
  eventoEsterno: z.string().nullable().optional(),
  // Opzionale: prenotazioni da collegare al gruppo
  prenotazioneIds: z.array(z.string()).optional(),
})

// GET /api/host/gruppi?da=&a=
export async function GET(req: Request) {
  const auth = await requireHostOrAdmin()
  if (isUnauthorized(auth)) return auth

  const { searchParams } = new URL(req.url)
  const da = searchParams.get('da')
  const a = searchParams.get('a')

  const where: Record<string, unknown> = { hostId: auth.user.hostId, deletedAt: null }
  if (da || a) {
    const range: Record<string, Date> = {}
    if (da) range.gte = new Date(da)
    if (a) range.lte = new Date(a)
    where.dataArrivo = range
  }

  const gruppi = await prisma.gruppoPrenotazione.findMany({
    where,
    include: {
      _count: { select: { prenotazioni: true } },
    },
    orderBy: { dataArrivo: 'desc' },
    take: 100,
  })

  return NextResponse.json({ gruppi })
}

// POST /api/host/gruppi
export async function POST(req: Request) {
  const auth = await requireHostOrAdmin()
  if (isUnauthorized(auth)) return auth

  const raw = await req.json()
  const parsed = createSchema.safeParse(raw)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Dati non validi', details: parsed.error.flatten() }, { status: 422 })
  }
  const d = parsed.data

  const gruppo = await prisma.$transaction(async (tx) => {
    const g = await tx.gruppoPrenotazione.create({
      data: {
        hostId: auth.user.hostId,
        nome: d.nome,
        referenteNome: d.referenteNome,
        referenteCognome: d.referenteCognome,
        referenteEmail: d.referenteEmail,
        referenteTelefono: d.referenteTelefono ?? null,
        dataArrivo: new Date(d.dataArrivo),
        dataPartenza: d.dataPartenza ? new Date(d.dataPartenza) : null,
        numOspitiTotali: d.numOspitiTotali,
        prezzoTotale: d.prezzoTotale ?? null,
        scontoPercent: d.scontoPercent ?? null,
        note: d.note ?? null,
        eventoEsterno: d.eventoEsterno ?? null,
      },
    })

    // Collega prenotazioni se specificate
    if (d.prenotazioneIds && d.prenotazioneIds.length > 0) {
      await tx.prenotazione.updateMany({
        where: {
          id: { in: d.prenotazioneIds },
          hostId: auth.user.hostId,
        },
        data: { gruppoPrenotazioneId: g.id },
      })
    }

    return g
  })

  await auditFromAuth(auth, {
    azione: 'gruppo.creato',
    entita: 'gruppoPrenotazione',
    entitaId: gruppo.id,
    dettagli: `Gruppo "${d.nome}" creato con ${d.prenotazioneIds?.length ?? 0} prenotazioni collegate`,
  })

  return NextResponse.json(gruppo, { status: 201 })
}
