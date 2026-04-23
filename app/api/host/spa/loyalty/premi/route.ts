import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { Prisma } from '@prisma/client'
import { requireHost, isUnauthorized } from '@/lib/auth-middleware'
import { auditFromAuth } from '@/lib/audit'
import { prisma } from '@/lib/db'

const TIPI = [
  'SCONTO_PRENOTAZIONE', 'TRATTAMENTO_GRATIS', 'UPGRADE_CAMERA',
  'BONUS_PUNTI', 'ALTRO',
] as const

const createSchema = z.object({
  tipo: z.enum(TIPI),
  nome: z.string().min(1).max(200),
  descrizione: z.string().max(2000).nullable().optional(),
  immagine: z.string().url().nullable().optional(),
  costoInPunti: z.number().int().min(1),
  attivo: z.boolean().default(true),
  disponibilitaMax: z.number().int().min(1).nullable().optional(),
  disponibilitaMembro: z.number().int().min(1).nullable().optional(),
  trattamentoSpaId: z.string().nullable().optional(),
  datiApplicazione: z.record(z.unknown()).nullable().optional(),
})

/** GET lista premi del programma dell'host */
export async function GET() {
  const auth = await requireHost()
  if (isUnauthorized(auth)) return auth

  const programma = await prisma.programmaFedelta.findFirst({
    where: { hostId: auth.user.hostId },
    select: { id: true },
  })
  if (!programma) return NextResponse.json([])

  const premi = await prisma.premioFedelta.findMany({
    where: { programmaId: programma.id },
    orderBy: [{ attivo: 'desc' }, { costoInPunti: 'asc' }],
    include: { _count: { select: { movimenti: true } } },
  })
  return NextResponse.json(premi)
}

/** POST crea premio */
export async function POST(req: NextRequest) {
  const auth = await requireHost()
  if (isUnauthorized(auth)) return auth

  const parsed = createSchema.safeParse(await req.json().catch(() => ({})))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Dati non validi', details: parsed.error.flatten() }, { status: 422 })
  }

  const programma = await prisma.programmaFedelta.findFirst({
    where: { hostId: auth.user.hostId },
  })
  if (!programma) {
    return NextResponse.json({ error: 'Crea prima un programma fedeltà' }, { status: 400 })
  }

  const data = parsed.data
  const creato = await prisma.premioFedelta.create({
    data: {
      programmaId: programma.id,
      tipo: data.tipo,
      nome: data.nome,
      descrizione: data.descrizione ?? null,
      immagine: data.immagine ?? null,
      costoInPunti: data.costoInPunti,
      attivo: data.attivo,
      disponibilitaMax: data.disponibilitaMax ?? null,
      disponibilitaMembro: data.disponibilitaMembro ?? null,
      trattamentoSpaId: data.trattamentoSpaId ?? null,
      datiApplicazione: (data.datiApplicazione ?? {}) as Prisma.InputJsonValue,
    },
  })

  await auditFromAuth(auth, {
    azione: 'loyalty.premio_creato',
    entita: 'PremioFedelta',
    entitaId: creato.id,
    dettagli: `${data.tipo} · "${data.nome}" · ${data.costoInPunti} pt`,
  })

  return NextResponse.json(creato, { status: 201 })
}
