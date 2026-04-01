import { NextRequest, NextResponse } from 'next/server'
import { requireHost, isUnauthorized } from '@/lib/auth-middleware'
import { prisma } from '@/lib/db'
import { z } from 'zod'
import { parseBody } from '@/lib/validations'

// TODO: i18n

// ─── Schemas ─────────────────────────────────────────────────────────────────

const programmaSchema = z.object({
  nome: z.string().min(1, 'Nome obbligatorio').max(255).trim(),
  puntiPerEuro: z.coerce.number().min(0).max(1000).default(1),
  puntiPerVisita: z.coerce.number().int().min(0).max(10000).default(10),
  attivo: z.boolean().optional().default(true),
  descrizione: z.string().max(2000).trim().optional().nullable(),
})

const livelloSchema = z.object({
  nome: z.string().min(1).max(100).trim(),
  puntiMinimi: z.coerce.number().int().min(0),
  scontoPercentuale: z.coerce.number().min(0).max(100).default(0),
  colore: z.string().max(20).default('#6b7280'),
  ordine: z.coerce.number().int().min(0).default(0),
  benefici: z.string().max(500).trim().optional().nullable(),
})

const livelliUpdateSchema = z.object({
  programmaId: z.string().min(1),
  livelli: z.array(livelloSchema).min(1, 'Almeno un livello obbligatorio'),
})

// ─── GET: programma corrente con livelli e conteggio membri ──────────────────

export async function GET() {
  const auth = await requireHost()
  if (isUnauthorized(auth)) return auth

  const programma = await prisma.programmaFedelta.findFirst({
    where: { hostId: auth.user.hostId },
    include: {
      livelli: { orderBy: { ordine: 'asc' } },
      _count: { select: { membri: true } },
    },
  })

  if (!programma) {
    return NextResponse.json({ programma: null })
  }

  // Calcoli aggregati
  const [totMembers, puntiStats] = await Promise.all([
    prisma.membroFedelta.count({ where: { programmaId: programma.id } }),
    prisma.movimentoPunti.aggregate({
      where: { membro: { programmaId: programma.id } },
      _sum: { punti: true },
    }),
  ])

  // Punti emessi vs utilizzati
  const [puntiEmessi, puntiUtilizzati] = await Promise.all([
    prisma.movimentoPunti.aggregate({
      where: {
        membro: { programmaId: programma.id },
        punti: { gt: 0 },
      },
      _sum: { punti: true },
    }),
    prisma.movimentoPunti.aggregate({
      where: {
        membro: { programmaId: programma.id },
        punti: { lt: 0 },
      },
      _sum: { punti: true },
    }),
  ])

  return NextResponse.json({
    programma: {
      ...programma,
      stats: {
        totaleMembri: totMembers,
        puntiEmessi: puntiEmessi._sum.punti ?? 0,
        puntiUtilizzati: Math.abs(puntiUtilizzati._sum.punti ?? 0),
      },
    },
  })
}

// ─── POST: crea o aggiorna programma ─────────────────────────────────────────

export async function POST(req: NextRequest) {
  const auth = await requireHost()
  if (isUnauthorized(auth)) return auth

  const parsed = parseBody(programmaSchema, await req.json())
  if (parsed.error) return parsed.error

  const existing = await prisma.programmaFedelta.findFirst({
    where: { hostId: auth.user.hostId },
  })

  if (existing) {
    const updated = await prisma.programmaFedelta.update({
      where: { id: existing.id },
      data: parsed.data,
      include: { livelli: { orderBy: { ordine: 'asc' } } },
    })
    return NextResponse.json(updated)
  }

  const created = await prisma.programmaFedelta.create({
    data: {
      hostId: auth.user.hostId,
      ...parsed.data,
    },
    include: { livelli: { orderBy: { ordine: 'asc' } } },
  })
  return NextResponse.json(created, { status: 201 })
}

// ─── PUT: aggiorna livelli (replace all) ─────────────────────────────────────

export async function PUT(req: NextRequest) {
  const auth = await requireHost()
  if (isUnauthorized(auth)) return auth

  const parsed = parseBody(livelliUpdateSchema, await req.json())
  if (parsed.error) return parsed.error

  const { programmaId, livelli } = parsed.data

  // Verifica ownership
  const programma = await prisma.programmaFedelta.findFirst({
    where: { id: programmaId, hostId: auth.user.hostId },
  })
  if (!programma) {
    return NextResponse.json({ error: 'Programma non trovato' }, { status: 404 })
  }

  // Transazione: elimina vecchi livelli e crea nuovi
  await prisma.$transaction([
    prisma.livelloFedelta.deleteMany({ where: { programmaId } }),
    ...livelli.map((l, i) =>
      prisma.livelloFedelta.create({
        data: {
          programmaId,
          nome: l.nome,
          puntiMinimi: l.puntiMinimi,
          scontoPercentuale: l.scontoPercentuale,
          colore: l.colore,
          ordine: i,
          benefici: l.benefici ? [l.benefici] : [],
        },
      })
    ),
  ])

  const updated = await prisma.programmaFedelta.findUnique({
    where: { id: programmaId },
    include: { livelli: { orderBy: { ordine: 'asc' } } },
  })

  return NextResponse.json(updated)
}
