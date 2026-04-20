import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { sendEmailNuovaPrenotazione } from '@/lib/email'
import { requireHostOrAdmin, isUnauthorized } from '@/lib/auth-middleware'
import { auditFromAuth } from '@/lib/audit'
import { parseBody, prenotazioneHostSchema, isStatoPrenotazione } from '@/lib/validations'
import { logger } from '@/lib/logger'
import { calcolaTassaSuggerita } from '@/lib/comuni-tassa-soggiorno'

// GET /api/host/prenotazioni
export async function GET(req: NextRequest) {
  const auth = await requireHostOrAdmin()
  if (isUnauthorized(auth)) return auth

  const { searchParams } = new URL(req.url)
  const stato = searchParams.get('stato')
  const q = searchParams.get('q')

  const prenotazioni = await prisma.prenotazione.findMany({
    where: {
      hostId: auth.user.hostId,
      deletedAt: null,
      ...(stato && isStatoPrenotazione(stato) ? { stato } : {}),
      ...(q
        ? {
            OR: [
              { guestNome: { contains: q, mode: 'insensitive' } },
              { guestCognome: { contains: q, mode: 'insensitive' } },
              { guestEmail: { contains: q, mode: 'insensitive' } },
            ],
          }
        : {}),
    },
    include: {
      struttura: { select: { id: true, nome: true } },
      unita: { select: { id: true, nome: true } },
      chat: { select: { id: true, _count: { select: { messaggi: true } } } },
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(prenotazioni)
}

// POST /api/host/prenotazioni  — crea manualmente
export async function POST(req: NextRequest) {
  const auth = await requireHostOrAdmin()
  if (isUnauthorized(auth)) return auth

  let raw: unknown
  try {
    raw = await req.json()
  } catch {
    return NextResponse.json({ error: 'Corpo della richiesta malformato' }, { status: 400 })
  }

  const parsed = parseBody(prenotazioneHostSchema, raw)
  if (parsed.error) return parsed.error
  const {
    strutturaId, unitaId, guestNome, guestCognome, guestEmail, guestTelefono,
    guestNote, guestLingua, dataArrivo, dataPartenza, numOspiti, fonte, prezzoTotale, noteInterne,
  } = parsed.data

  // Calcolo automatico tassa di soggiorno (basata sul comune della struttura)
  let tassaSoggiornoCalcolata: number | null = null
  const arrivoDate = new Date(dataArrivo)
  const partenzaDate = dataPartenza ? new Date(dataPartenza) : null
  if (strutturaId && partenzaDate) {
    const strutturaInfo = await prisma.struttura.findUnique({
      where: { id: strutturaId },
      select: { citta: true },
    })
    if (strutturaInfo?.citta) {
      const tassaPerNotte = calcolaTassaSuggerita(strutturaInfo.citta, arrivoDate, partenzaDate)
      if (tassaPerNotte !== null) {
        tassaSoggiornoCalcolata = Math.round(tassaPerNotte * 100) / 100
      }
    }
  }

  const prenotazione = await prisma.prenotazione.create({
    data: {
      hostId: auth.user.hostId,
      strutturaId: strutturaId ?? null,
      unitaId: unitaId ?? null,
      guestNome,
      guestCognome,
      guestEmail,
      guestTelefono: guestTelefono ?? null,
      guestNote: guestNote ?? null,
      guestLingua: guestLingua ?? 'it',
      dataArrivo: arrivoDate,
      dataPartenza: partenzaDate,
      numOspiti,
      fonte: fonte ?? 'Diretto',
      prezzoTotale: prezzoTotale ?? null,
      noteInterne: noteInterne ?? null,
      tassaSoggiorno: tassaSoggiornoCalcolata,
    },
  })

  // ── Auto-genera PIN ospite ──────────────────────────────────────────────────
  try {
    const { ensurePin } = await import('@/lib/guest-pin')
    await ensurePin(prenotazione.id, auth.user.hostId)
  } catch { /* best effort */ }

  // ── Email notifica + notifica in-app (non bloccante) ────────────────────────
  const struttura = strutturaId
    ? await prisma.struttura.findUnique({ where: { id: strutturaId }, select: { nome: true } })
    : null
  const strutturaNome = struttura?.nome ?? 'N/D'
  try {
    const host = await prisma.host.findUnique({
      where: { id: auth.user.hostId },
      include: { user: { select: { email: true, nome: true } } },
    })
    if (host) {
      await sendEmailNuovaPrenotazione({
        hostEmail: host.user.email,
        hostNome: host.nomeAzienda,
        prenotazioneId: prenotazione.id,
        guestNome,
        guestCognome,
        guestEmail,
        guestTelefono: guestTelefono ?? null,
        strutturaNome,
        dataArrivo: prenotazione.dataArrivo,
        dataPartenza: prenotazione.dataPartenza,
        numOspiti: prenotazione.numOspiti,
        guestNote: guestNote ?? null,
      })
    }
  } catch (err) {
    logger.error('Invio email nuova prenotazione (host) fallito', 'host/prenotazioni', {
      prenotazioneId: prenotazione.id,
      error: err instanceof Error ? err.message : String(err),
    })
  }

  await prisma.notifica.create({
    data: {
      hostId: auth.user.hostId,
      tipo: 'prenotazione',
      titolo: 'Nuova prenotazione',
      messaggio: `${guestNome} ${guestCognome} ha prenotato ${strutturaNome}`,
      linkUrl: `/host/prenotazioni/${prenotazione.id}`,
    },
  })

  logger.info('Prenotazione manuale creata', 'host/prenotazioni', {
    prenotazioneId: prenotazione.id,
    hostId: auth.user.hostId,
  })

  return NextResponse.json(prenotazione, { status: 201 })
}
