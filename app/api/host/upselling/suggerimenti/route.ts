import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireHost, isUnauthorized } from '@/lib/auth-middleware'
import { auditFromAuth } from '@/lib/audit'
import { prisma } from '@/lib/db'

const UPSELLING_TIPO = [
  'UPGRADE_CAMERA', 'TRATTAMENTO_SPA', 'PIANO_PASTO', 'LATE_CHECKOUT',
  'EARLY_CHECKIN', 'SERVIZIO_EXTRA', 'PACCHETTO', 'RISTORANTE', 'ALTRO',
] as const
const UPSELLING_TOUCHPOINT = [
  'POST_PRENOTAZIONE', 'EMAIL_PRE_ARRIVO', 'CHECKIN_ONLINE',
  'BENVENUTO_WHATSAPP', 'IN_HOUSE',
] as const

const condizioniSchema = z.object({
  minNotti: z.number().int().min(1).optional(),
  maxNotti: z.number().int().min(1).optional(),
  cameraTipo: z.array(z.string()).optional(),
  pianoPasto: z.array(z.string()).optional(),
  giorniPrimaArrivo: z.object({
    min: z.number().int().min(0).optional(),
    max: z.number().int().min(0).optional(),
  }).optional(),
  ospiteRicorrente: z.boolean().optional(),
}).strict().optional()

const createSchema = z.object({
  tipo: z.enum(UPSELLING_TIPO),
  titolo: z.string().min(1).max(200),
  descrizione: z.string().max(2000).nullable().optional(),
  immagine: z.string().url().nullable().optional(),
  prezzo: z.number().nonnegative().nullable().optional(),
  prezzoPercentuale: z.number().min(0).max(100).nullable().optional(),
  trattamentoSpaId: z.string().nullable().optional(),
  servizioId: z.string().nullable().optional(),
  pacchettoId: z.string().nullable().optional(),
  unitaTargetId: z.string().nullable().optional(),
  posizione: z.array(z.enum(UPSELLING_TOUCHPOINT)).default([]),
  condizioni: condizioniSchema.nullable(),
  priorita: z.number().int().default(0),
  attivo: z.boolean().default(true),
})

/** GET /api/host/upselling/suggerimenti — lista con conteggio conversioni */
export async function GET() {
  const auth = await requireHost()
  if (isUnauthorized(auth)) return auth

  const list = await prisma.upsellingSuggerimento.findMany({
    where: { hostId: auth.user.hostId },
    orderBy: [{ attivo: 'desc' }, { priorita: 'desc' }, { createdAt: 'desc' }],
    include: {
      _count: { select: { conversioni: true } },
    },
  })
  return NextResponse.json(list)
}

/** POST /api/host/upselling/suggerimenti — crea nuovo suggerimento */
export async function POST(req: NextRequest) {
  const auth = await requireHost()
  if (isUnauthorized(auth)) return auth

  const parsed = createSchema.safeParse(await req.json().catch(() => ({})))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Dati non validi', details: parsed.error.flatten() }, { status: 422 })
  }
  const data = parsed.data

  // Almeno uno tra prezzo e prezzoPercentuale deve essere valorizzato
  if (data.prezzo == null && data.prezzoPercentuale == null) {
    return NextResponse.json({ error: 'Devi specificare `prezzo` oppure `prezzoPercentuale`' }, { status: 422 })
  }

  const creato = await prisma.upsellingSuggerimento.create({
    data: {
      hostId: auth.user.hostId,
      tipo: data.tipo,
      titolo: data.titolo,
      descrizione: data.descrizione ?? null,
      immagine: data.immagine ?? null,
      prezzo: data.prezzo ?? null,
      prezzoPercentuale: data.prezzoPercentuale ?? null,
      trattamentoSpaId: data.trattamentoSpaId ?? null,
      servizioId: data.servizioId ?? null,
      pacchettoId: data.pacchettoId ?? null,
      unitaTargetId: data.unitaTargetId ?? null,
      posizione: data.posizione,
      condizioni: data.condizioni ?? {},
      priorita: data.priorita,
      attivo: data.attivo,
    },
  })

  await auditFromAuth(auth, {
    azione: 'upselling.suggerimento_creato',
    entita: 'UpsellingSuggerimento',
    entitaId: creato.id,
    dettagli: `${data.tipo} · "${data.titolo}"`,
  })

  return NextResponse.json(creato, { status: 201 })
}
