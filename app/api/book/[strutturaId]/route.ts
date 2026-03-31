import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { sendEmailNuovaPrenotazione } from '@/lib/email'
import { parseBody, prenotazionePublicSchema } from '@/lib/validations'
import { rateLimit, getClientIp } from '@/lib/rate-limit'
import { logger } from '@/lib/logger'
import { calcolaPrezzo } from '@/lib/pricing'
import { calcolaTassaSuggerita } from '@/lib/comuni-tassa-soggiorno'

// GET  /api/book/[strutturaId]  — dati pubblici struttura per form di prenotazione
export async function GET(
  _: NextRequest,
  { params: paramsPromise }: { params: Promise<{ strutturaId: string }> },
) {
  const params = await paramsPromise
  const struttura = await prisma.struttura.findFirst({
    where: { id: params.strutturaId, attiva: true },
    include: {
      unita: {
        where: { attiva: true },
        select: { id: true, nome: true, descrizione: true, capacita: true, prezzoBase: true },
      },
      host: { select: { nomeAzienda: true, sitoWeb: true } },
    },
  })

  if (!struttura) return NextResponse.json({ error: 'Non trovato' }, { status: 404 })
  return NextResponse.json(struttura)
}

// POST /api/book/[strutturaId]  — richiesta di prenotazione da ospite
export async function POST(
  req: NextRequest,
  { params: paramsPromise }: { params: Promise<{ strutturaId: string }> },
) {
  // ── Rate limiting: max 10 prenotazioni per IP ogni 10 minuti ────────────────
  const ip = getClientIp(req)
  const rl = rateLimit(`book:${ip}`, { windowMs: 10 * 60 * 1000, max: 10 })
  if (!rl.allowed) {
    logger.warn('Rate limit raggiunto per booking', 'book/route', { ip })
    return NextResponse.json(
      { error: 'Troppe richieste. Riprova tra poco.' },
      {
        status: 429,
        headers: { 'Retry-After': String(rl.retryAfter) },
      },
    )
  }

  const params = await paramsPromise

  const struttura = await prisma.struttura.findFirst({
    where: { id: params.strutturaId, attiva: true },
    include: { host: { include: { user: { select: { email: true, nome: true } } } } },
  })
  if (!struttura) return NextResponse.json({ error: 'Non trovato' }, { status: 404 })

  // ── Parsing & validazione con Zod ──────────────────────────────────────────
  let raw: unknown
  try {
    raw = await req.json()
  } catch {
    return NextResponse.json({ error: 'Corpo della richiesta malformato' }, { status: 400 })
  }

  const parsed = parseBody(prenotazionePublicSchema, raw)
  if (parsed.error) return parsed.error
  const {
    guestNome, guestCognome, guestEmail, guestTelefono,
    guestNote, dataArrivo, dataPartenza, numOspiti, unitaId,
  } = parsed.data

  // ── Validazione date ───────────────────────────────────────────────────────
  const arrivo = new Date(dataArrivo)
  if (isNaN(arrivo.getTime())) {
    return NextResponse.json({ error: 'Data arrivo non valida' }, { status: 400 })
  }
  const partenza = dataPartenza ? new Date(dataPartenza) : null
  if (partenza && partenza <= arrivo) {
    return NextResponse.json({ error: 'La data di partenza deve essere successiva all\'arrivo' }, { status: 400 })
  }

  // ── Crea prenotazione + chat + messaggio benvenuto ─────────────────────────

  // Calcola prezzoTotale applicando TariffePeriodo + RegoleTariffa
  let prezzoTotaleCalcolato: number | null = null
  if (unitaId && partenza) {
    const [unita, regole] = await Promise.all([
      prisma.unitaPrenotabile.findFirst({
        where: { id: unitaId, strutturaId: struttura.id, attiva: true },
        select: {
          prezzoBase: true,
          tariffe: {
            where: { dataInizio: { lte: partenza }, dataFine: { gte: arrivo } },
            select: { nome: true, colore: true, prezzo: true, dataInizio: true, dataFine: true },
          },
        },
      }),
      prisma.regolaTariffa.findMany({
        where: { strutturaId: struttura.id, attiva: true },
      }),
    ])

    if (unita) {
      const calc = calcolaPrezzo({
        arrivo,
        partenza,
        prezzoBase: unita.prezzoBase,
        unitaId,
        tariffePeriodo: unita.tariffe,
        regole: regole.map(r => ({
          id: r.id,
          nome: r.nome,
          tipo: r.tipo as 'WEEKEND' | 'STAGIONE' | 'FESTIVO',
          attiva: r.attiva,
          priorita: r.priorita,
          modificatore: r.modificatore as 'PERCENTUALE' | 'FISSO',
          valore: r.valore,
          unitaId: r.unitaId,
          meseInizio: r.meseInizio,
          giornoInizio: r.giornoInizio,
          meseFine: r.meseFine,
          giornoFine: r.giornoFine,
          giorniSettimana: r.giorniSettimana,
        })),
      })
      prezzoTotaleCalcolato = calc.prezzoTotale > 0 ? calc.prezzoTotale : null
    }
  }

  // Calcolo automatico tassa di soggiorno (basata sul comune della struttura)
  let tassaSoggiornoCalcolata: number | null = null
  if (struttura.citta && partenza) {
    const tassaPerNotte = calcolaTassaSuggerita(struttura.citta, arrivo, partenza)
    if (tassaPerNotte !== null) {
      tassaSoggiornoCalcolata = Math.round(tassaPerNotte * 100) / 100
    }
  }

  const prenotazione = await prisma.prenotazione.create({
    data: {
      hostId: struttura.hostId,
      strutturaId: struttura.id,
      unitaId: unitaId ?? null,
      guestNome,
      guestCognome,
      guestEmail,
      guestTelefono: guestTelefono ?? null,
      guestNote: guestNote ?? null,
      dataArrivo: arrivo,
      dataPartenza: partenza,
      numOspiti,
      fonte: 'Web',
      prezzoTotale: prezzoTotaleCalcolato,
      tassaSoggiorno: tassaSoggiornoCalcolata,
    },
  })

  const chat = await prisma.chat.create({
    data: {
      prenotazioneId: prenotazione.id,
      hostId: struttura.hostId,
    },
  })

  await prisma.messaggio.create({
    data: {
      chatId: chat.id,
      mittente: 'HOST',
      testo: `Ciao ${prenotazione.guestNome}, grazie per la tua richiesta! Ti risponderemo al più presto.`,
    },
  })

  // ── Email notifica host (non bloccante) ────────────────────────────────────
  try {
    await sendEmailNuovaPrenotazione({
      hostEmail: struttura.host.user.email,
      hostNome: struttura.host.nomeAzienda,
      prenotazioneId: prenotazione.id,
      guestNome: prenotazione.guestNome,
      guestCognome: prenotazione.guestCognome,
      guestEmail: prenotazione.guestEmail,
      guestTelefono: prenotazione.guestTelefono,
      strutturaNome: struttura.nome,
      dataArrivo: prenotazione.dataArrivo,
      dataPartenza: prenotazione.dataPartenza,
      numOspiti: prenotazione.numOspiti,
      guestNote: prenotazione.guestNote,
    })
    await prisma.prenotazione.update({
      where: { id: prenotazione.id },
      data: { emailInviata: true },
    })
  } catch (err) {
    logger.error('Invio email nuova prenotazione fallito', 'book/route', {
      prenotazioneId: prenotazione.id,
      error: err instanceof Error ? err.message : String(err),
    })
  }

  logger.info('Nuova prenotazione creata', 'book/route', {
    prenotazioneId: prenotazione.id,
    strutturaId: struttura.id,
  })

  return NextResponse.json({ prenotazioneId: prenotazione.id, chatId: chat.id }, { status: 201 })
}
