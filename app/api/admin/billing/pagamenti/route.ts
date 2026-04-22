import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdmin, isUnauthorized } from '@/lib/auth-middleware'
import { prisma } from '@/lib/db'
import { auditFromAuth } from '@/lib/audit'

// GET /api/admin/billing/pagamenti?mese=YYYY-MM&stato=&hostId=
export async function GET(req: NextRequest) {
  const auth = await requireAdmin()
  if (isUnauthorized(auth)) return auth

  const { searchParams } = new URL(req.url)
  const mese = searchParams.get('mese') // YYYY-MM
  const stato = searchParams.get('stato')
  const hostId = searchParams.get('hostId')

  const where: Record<string, unknown> = {}
  if (stato) where.stato = stato
  if (hostId) where.hostId = hostId
  if (mese) {
    const [y, m] = mese.split('-').map((s) => parseInt(s))
    if (!isNaN(y) && !isNaN(m)) {
      const inizio = new Date(y, m - 1, 1)
      const fine = new Date(y, m, 1)
      where.createdAt = { gte: inizio, lt: fine }
    }
  }

  const [pagamenti, aggregate] = await Promise.all([
    prisma.pagamentoPiattaforma.findMany({
      where,
      include: {
        host: {
          select: {
            id: true, nomeAzienda: true, piano: true,
            user: { select: { email: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    }),
    prisma.pagamentoPiattaforma.aggregate({
      where: { ...where, stato: 'PAGATO' },
      _sum: { importo: true },
      _count: true,
    }),
  ])

  return NextResponse.json({
    pagamenti: pagamenti.map((p) => ({
      id: p.id,
      hostId: p.hostId,
      hostNome: p.host.nomeAzienda,
      hostEmail: p.host.user.email,
      piano: p.host.piano,
      importo: p.importo,
      valuta: p.valuta,
      metodo: p.metodo,
      stato: p.stato,
      riferimento: p.riferimento,
      note: p.note,
      periodoInizio: p.periodoInizio.toISOString().slice(0, 10),
      periodoFine: p.periodoFine.toISOString().slice(0, 10),
      createdAt: p.createdAt.toISOString(),
    })),
    totale: {
      importoPagato: aggregate._sum.importo ?? 0,
      count: aggregate._count,
    },
  })
}

// POST /api/admin/billing/pagamenti — registra pagamento manuale
const createSchema = z.object({
  hostId: z.string().min(1),
  importo: z.number().positive(),
  valuta: z.string().default('EUR'),
  metodo: z.enum(['MANUALE', 'STRIPE', 'BONIFICO', 'CARTA']).default('MANUALE'),
  stato: z.enum(['PAGATO', 'PENDENTE', 'FALLITO', 'RIMBORSATO']).default('PAGATO'),
  riferimento: z.string().max(200).optional().nullable(),
  note: z.string().max(1000).optional().nullable(),
  periodoInizio: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  periodoFine: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
})

export async function POST(req: NextRequest) {
  const auth = await requireAdmin()
  if (isUnauthorized(auth)) return auth

  const raw = await req.json().catch(() => ({}))
  const parsed = createSchema.safeParse(raw)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Dati non validi', details: parsed.error.flatten() }, { status: 422 })
  }
  const d = parsed.data

  // Verifica host esistente
  const host = await prisma.host.findUnique({
    where: { id: d.hostId },
    select: { id: true, nomeAzienda: true },
  })
  if (!host) return NextResponse.json({ error: 'Host non trovato' }, { status: 404 })

  const pagamento = await prisma.pagamentoPiattaforma.create({
    data: {
      hostId: d.hostId,
      importo: d.importo,
      valuta: d.valuta,
      metodo: d.metodo,
      stato: d.stato,
      riferimento: d.riferimento ?? null,
      note: d.note ?? null,
      periodoInizio: new Date(d.periodoInizio),
      periodoFine: new Date(d.periodoFine),
      registratoDa: auth.user.id,
    },
    include: { host: { select: { nomeAzienda: true, user: { select: { email: true } } } } },
  })

  await auditFromAuth(auth, {
    azione: 'pagamento_piattaforma.registrato',
    entita: 'pagamentoPiattaforma',
    entitaId: pagamento.id,
    dettagli: `Pagamento €${d.importo} ${d.metodo} ${d.stato} per ${host.nomeAzienda} (periodo ${d.periodoInizio} → ${d.periodoFine})`,
  })

  return NextResponse.json(pagamento, { status: 201 })
}
