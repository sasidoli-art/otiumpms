import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireHost, isUnauthorized } from '@/lib/auth-middleware'
import { auditFromAuth } from '@/lib/audit'
import { prisma } from '@/lib/db'
import { parseBody } from '@/lib/validations'

// ─── Zod schema ──────────────────────────────────────────────────────────────

const METODI_PAGAMENTO = ['CONTANTI', 'CARTA', 'CAMERA_CREDIT', 'GIFT_CARD', 'BONIFICO', 'MISTO'] as const
const TIPI_CARTA = ['VISA', 'MASTERCARD', 'AMEX', 'BANCOMAT', 'MAESTRO', 'ALTRO'] as const
const ORIGINI_INCASSO = ['PRENOTAZIONE', 'POS', 'SPA', 'RISTORAZIONE', 'GIFT_CARD', 'ALTRO'] as const

const incassoSchema = z.object({
  importo: z.number().positive('Importo deve essere positivo'),
  metodo: z.enum(METODI_PAGAMENTO),
  tipoCarta: z.enum(TIPI_CARTA).optional().nullable(),
  ultime4Cifre: z.string().max(4).optional().nullable(),
  riferimento: z.string().max(200).optional().nullable(),
  origine: z.enum(ORIGINI_INCASSO),
  prenotazioneId: z.string().optional().nullable(),
  transazioneId: z.string().optional().nullable(),
  appuntamentoId: z.string().optional().nullable(),
  operatore: z.string().min(1, 'Operatore obbligatorio').max(200).trim(),
  descrizione: z.string().min(1, 'Descrizione obbligatoria').max(500).trim(),
  note: z.string().max(1000).optional().nullable(),
})

// ─── GET: List incassi con filtri ────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const auth = await requireHost()
  if (isUnauthorized(auth)) return auth

  const sp = req.nextUrl.searchParams
  const data = sp.get('data')           // YYYY-MM-DD singolo giorno
  const dataFrom = sp.get('dataFrom')   // range inizio
  const dataTo = sp.get('dataTo')       // range fine
  const metodo = sp.get('metodo')
  const origine = sp.get('origine')
  const riconciliato = sp.get('riconciliato')

  const where: Record<string, unknown> = { hostId: auth.user.hostId }

  // Filtro data singola o range
  if (data) {
    const giorno = new Date(data)
    const fine = new Date(data)
    fine.setDate(fine.getDate() + 1)
    where.data = { gte: giorno, lt: fine }
  } else if (dataFrom || dataTo) {
    const range: Record<string, Date> = {}
    if (dataFrom) range.gte = new Date(dataFrom)
    if (dataTo) {
      const fine = new Date(dataTo)
      fine.setDate(fine.getDate() + 1)
      range.lt = fine
    }
    where.data = range
  }

  if (metodo) where.metodo = metodo
  if (origine) where.origine = origine
  if (riconciliato !== null && riconciliato !== undefined) {
    where.riconciliato = riconciliato === 'true'
  }

  const incassi = await prisma.incasso.findMany({
    where,
    orderBy: { data: 'desc' },
  })

  // Calcola totali per metodo di pagamento
  const totaliPerMetodo: Record<string, number> = {}
  let totaleComplessivo = 0
  for (const inc of incassi) {
    totaliPerMetodo[inc.metodo] = (totaliPerMetodo[inc.metodo] || 0) + inc.importo
    totaleComplessivo += inc.importo
  }

  return NextResponse.json({
    incassi,
    totali: {
      perMetodo: totaliPerMetodo,
      complessivo: totaleComplessivo,
      count: incassi.length,
    },
  })
}

// ─── POST: Registra nuovo incasso manuale ────────────────────────────────────

export async function POST(req: NextRequest) {
  const auth = await requireHost()
  if (isUnauthorized(auth)) return auth

  const parsed = parseBody(incassoSchema, await req.json())
  if (parsed.error) return parsed.error
  const data = parsed.data

  const incasso = await prisma.incasso.create({
    data: {
      hostId: auth.user.hostId,
      importo: data.importo,
      metodo: data.metodo,
      tipoCarta: data.tipoCarta ?? null,
      ultime4Cifre: data.ultime4Cifre ?? null,
      riferimento: data.riferimento ?? null,
      origine: data.origine,
      prenotazioneId: data.prenotazioneId ?? null,
      transazioneId: data.transazioneId ?? null,
      appuntamentoId: data.appuntamentoId ?? null,
      operatore: data.operatore,
      descrizione: data.descrizione,
      note: data.note ?? null,
    },
  })

    await auditFromAuth(auth, { azione: 'incasso.registrato', entita: 'incasso', dettagli: `Incasso registrato` })

return NextResponse.json(incasso, { status: 201 })
}
