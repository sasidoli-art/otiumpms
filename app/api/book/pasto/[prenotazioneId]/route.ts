import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { parseBody } from '@/lib/validations'
import { rateLimit, getClientIp } from '@/lib/rate-limit'
import { sendEmailConfermaPasti } from '@/lib/email'

// ─── Zod Schema ──────────────────────────────────────────────────────────────

const sceltaPastoSchema = z.object({
  scelte: z.array(z.object({
    data: z.string().min(1),       // "2026-04-01"
    tipoPasto: z.enum(['COLAZIONE', 'PRANZO', 'CENA']),
    piattoId: z.string().min(1),
    guestNome: z.string().min(1).max(100).trim(),
    quantita: z.number().int().min(1).max(20).optional().default(1),
    note: z.string().max(500).trim().optional().nullable(),
  })).min(1, 'Almeno una scelta richiesta'),
})

type RouteContext = { params: Promise<{ prenotazioneId: string }> }

/** Piani pasto -> quali pasti sono inclusi */
const PIANI_PASTI: Record<string, string[]> = {
  SOLO_PERNOTTAMENTO: [],
  PERNOTTAMENTO_COLAZIONE: ['COLAZIONE'],
  MEZZA_PENSIONE: ['COLAZIONE', 'CENA'],
  PENSIONE_COMPLETA: ['COLAZIONE', 'PRANZO', 'CENA'],
  ALL_INCLUSIVE: ['COLAZIONE', 'PRANZO', 'CENA'],
}

// ─── GET /api/book/pasto/[prenotazioneId] ────────────────────────────────────

export async function GET(_req: NextRequest, ctx: RouteContext) {
  const { prenotazioneId } = await ctx.params

  const prenotazione = await prisma.prenotazione.findUnique({
    where: { id: prenotazioneId },
    select: {
      id: true,
      strutturaId: true,
      dataArrivo: true,
      dataPartenza: true,
      numOspiti: true,
      guestNome: true,
      guestCognome: true,
      pianoPasto: {
        select: { piano: true, pastiExtra: true, pastiEsclusi: true },
      },
      struttura: { select: { id: true, nome: true } },
    },
  })

  if (!prenotazione || !prenotazione.strutturaId) {
    return NextResponse.json({ error: 'Prenotazione non trovata' }, { status: 404 })
  }

  // Calculate which meals are included
  const piano = prenotazione.pianoPasto?.piano || 'PERNOTTAMENTO_COLAZIONE'
  const pastiInclusi = new Set(PIANI_PASTI[piano] || ['COLAZIONE'])
  if (prenotazione.pianoPasto?.pastiExtra) {
    for (const e of prenotazione.pianoPasto.pastiExtra) pastiInclusi.add(e)
  }
  if (prenotazione.pianoPasto?.pastiEsclusi) {
    for (const e of prenotazione.pianoPasto.pastiEsclusi) pastiInclusi.delete(e)
  }

  // Build date range for the stay
  const arrivo = new Date(prenotazione.dataArrivo)
  const partenza = prenotazione.dataPartenza
    ? new Date(prenotazione.dataPartenza)
    : new Date(arrivo.getTime() + 86400000) // default 1 night

  const giorni: string[] = []
  const current = new Date(arrivo)
  while (current < partenza) {
    giorni.push(current.toISOString().slice(0, 10))
    current.setDate(current.getDate() + 1)
  }

  // Fetch all menus for this structure in the date range
  const menus = await prisma.menuGiornaliero.findMany({
    where: {
      strutturaId: prenotazione.strutturaId,
      attivo: true,
      OR: [
        // Specific date menus
        {
          isTemplate: false,
          data: {
            gte: new Date(giorni[0] + 'T00:00:00Z'),
            lte: new Date(giorni[giorni.length - 1] + 'T23:59:59.999Z'),
          },
        },
        // Template menus (recurring)
        { isTemplate: true },
      ],
    },
    include: {
      piatti: {
        where: { disponibile: true },
        orderBy: { ordine: 'asc' },
      },
    },
  })

  // Organize menus by day
  const menuPerGiorno = giorni.map((giorno) => {
    const giornoDate = new Date(giorno + 'T12:00:00Z')
    const dayOfWeek = (giornoDate.getUTCDay() + 6) % 7 // 0=lun..6=dom

    const menuGiorno: Record<string, typeof menus[number] | null> = {
      COLAZIONE: null,
      PRANZO: null,
      CENA: null,
    }

    for (const m of menus) {
      // Specific date menu takes precedence
      if (!m.isTemplate) {
        const menuData = m.data.toISOString().slice(0, 10)
        if (menuData === giorno) {
          menuGiorno[m.tipoPasto] = m
        }
      }
    }

    // Fill gaps with templates
    for (const m of menus) {
      if (m.isTemplate && m.giornoSettimana === dayOfWeek) {
        if (!menuGiorno[m.tipoPasto]) {
          menuGiorno[m.tipoPasto] = m
        }
      }
    }

    return {
      data: giorno,
      giornoSettimana: dayOfWeek,
      pasti: Object.entries(menuGiorno)
        .filter(([tipo]) => pastiInclusi.has(tipo))
        .map(([tipo, menu]) => ({
          tipoPasto: tipo,
          incluso: true,
          menu: menu
            ? {
                id: menu.id,
                nome: menu.nome,
                note: menu.note,
                piatti: menu.piatti.map((p) => ({
                  id: p.id,
                  categoria: p.categoria,
                  nome: p.nome,
                  descrizione: p.descrizione,
                  allergeni: p.allergeni,
                  prezzo: p.prezzo,
                })),
              }
            : null,
        })),
    }
  })

  // Fetch existing choices for this booking
  const scelteEsistenti = await prisma.sceltaPastoOspite.findMany({
    where: { prenotazioneId },
    select: {
      id: true,
      data: true,
      tipoPasto: true,
      piattoId: true,
      guestNome: true,
      quantita: true,
      note: true,
    },
  })

  return NextResponse.json({
    prenotazione: {
      id: prenotazione.id,
      guestNome: `${prenotazione.guestNome} ${prenotazione.guestCognome}`,
      numOspiti: prenotazione.numOspiti,
      strutturaNome: prenotazione.struttura?.nome,
      piano,
      pastiInclusi: [...pastiInclusi],
    },
    giorni: menuPerGiorno,
    scelteEsistenti,
  })
}

// ─── POST /api/book/pasto/[prenotazioneId] ───────────────────────────────────

export async function POST(req: NextRequest, ctx: RouteContext) {
  // Rate limit
  const ip = getClientIp(req)
  const rl = rateLimit(`book-pasto:${ip}`, { windowMs: 60_000, max: 15 })
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Troppe richieste, riprova tra qualche minuto' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } },
    )
  }

  const { prenotazioneId } = await ctx.params

  const parsed = parseBody(sceltaPastoSchema, await req.json())
  if (parsed.error) return parsed.error
  const { scelte } = parsed.data

  // Load booking with host info for email
  const prenotazione = await prisma.prenotazione.findUnique({
    where: { id: prenotazioneId },
    select: {
      id: true,
      strutturaId: true,
      guestNome: true,
      guestCognome: true,
      guestEmail: true,
      hostId: true,
      host: { select: { nomeAzienda: true } },
      struttura: { select: { id: true, nome: true } },
    },
  })

  if (!prenotazione || !prenotazione.strutturaId) {
    return NextResponse.json({ error: 'Prenotazione non trovata' }, { status: 404 })
  }

  // Validate all piattoIds exist and belong to correct menus for this struttura
  const piattoIds = [...new Set(scelte.map((s) => s.piattoId))]
  const piatti = await prisma.piattoMenu.findMany({
    where: {
      id: { in: piattoIds },
      disponibile: true,
      menu: { strutturaId: prenotazione.strutturaId, attivo: true },
    },
    select: {
      id: true,
      nome: true,
      menu: { select: { tipoPasto: true, data: true, isTemplate: true, giornoSettimana: true } },
    },
  })

  const piattiMap = new Map(piatti.map((p) => [p.id, p]))

  // Check all piatti are valid
  for (const s of scelte) {
    const piatto = piattiMap.get(s.piattoId)
    if (!piatto) {
      return NextResponse.json(
        { error: `Piatto non trovato o non disponibile: ${s.piattoId}` },
        { status: 422 },
      )
    }
    // Verify tipoPasto matches the menu's tipoPasto
    if (piatto.menu.tipoPasto !== s.tipoPasto) {
      return NextResponse.json(
        { error: `Il piatto "${piatto.nome}" non appartiene al pasto ${s.tipoPasto}` },
        { status: 422 },
      )
    }
  }

  // Create all choices in a transaction (delete old choices for same dates/meals first)
  const now = new Date()
  const created = await prisma.$transaction(async (tx) => {
    // Remove previous choices for the same date+tipoPasto combinations
    const uniqueDatePasti = [...new Set(scelte.map((s) => `${s.data}|${s.tipoPasto}`))]
    for (const key of uniqueDatePasti) {
      const [data, tipoPasto] = key.split('|')
      const giorno = new Date(data + 'T00:00:00Z')
      const giornoFine = new Date(data + 'T23:59:59.999Z')
      await tx.sceltaPastoOspite.deleteMany({
        where: {
          prenotazioneId,
          tipoPasto: tipoPasto as 'COLAZIONE' | 'PRANZO' | 'CENA',
          data: { gte: giorno, lte: giornoFine },
        },
      })
    }

    // Create new choices
    const records = await Promise.all(
      scelte.map((s) =>
        tx.sceltaPastoOspite.create({
          data: {
            prenotazioneId,
            data: new Date(s.data + 'T12:00:00Z'),
            tipoPasto: s.tipoPasto,
            piattoId: s.piattoId,
            guestNome: s.guestNome,
            quantita: s.quantita,
            note: s.note ?? null,
            confermatoAt: now,
          },
        }),
      ),
    )
    return records
  })

  // Build summary for email and send confirmation
  const TIPI_LABEL: Record<string, string> = {
    COLAZIONE: 'Colazione',
    PRANZO: 'Pranzo',
    CENA: 'Cena',
  }

  const scelteEmail = scelte.map((s) => ({
    data: s.data,
    tipoPasto: TIPI_LABEL[s.tipoPasto] || s.tipoPasto,
    piattoNome: piattiMap.get(s.piattoId)?.nome || '—',
  }))

  sendEmailConfermaPasti({
    guestEmail: prenotazione.guestEmail,
    guestNome: `${prenotazione.guestNome} ${prenotazione.guestCognome}`,
    hostNome: prenotazione.host?.nomeAzienda || 'Otium Week',
    strutturaNome: prenotazione.struttura?.nome || '',
    scelte: scelteEmail,
    hostId: prenotazione.hostId,
  })

  return NextResponse.json({ ok: true, count: created.length }, { status: 201 })
}
