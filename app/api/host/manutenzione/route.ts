import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireHostOrAdmin, isUnauthorized } from '@/lib/auth-middleware'
import { auditFromAuth } from '@/lib/audit'
import {
  parseBody,
  manutenzioneCreateSchema,
  isStatoManutenzione,
  isPrioritaManutenzione,
} from '@/lib/validations'
import { logger } from '@/lib/logger'

// GET /api/host/manutenzione?stato=&priorita=&strutturaId=&q=
export async function GET(req: Request) {
  const auth = await requireHostOrAdmin()
  if (isUnauthorized(auth)) return auth

  const { searchParams } = new URL(req.url)
  const stato = searchParams.get('stato')
  const priorita = searchParams.get('priorita')
  const strutturaId = searchParams.get('strutturaId')
  const q = searchParams.get('q')

  const segnalazioni = await prisma.segnalazioneManutenzione.findMany({
    where: {
      hostId: auth.user.hostId,
      ...(stato && isStatoManutenzione(stato) ? { stato } : {}),
      ...(priorita && isPrioritaManutenzione(priorita) ? { priorita } : {}),
      ...(strutturaId ? { strutturaId } : {}),
      ...(q
        ? {
            OR: [
              { titolo: { contains: q, mode: 'insensitive' } },
              { descrizione: { contains: q, mode: 'insensitive' } },
              { assegnatoA: { contains: q, mode: 'insensitive' } },
            ],
          }
        : {}),
    },
    include: {
      struttura: { select: { id: true, nome: true } },
      unita: { select: { id: true, nome: true } },
    },
    orderBy: [{ priorita: 'desc' }, { createdAt: 'desc' }],
  })

  return NextResponse.json(segnalazioni)
}

// POST /api/host/manutenzione
export async function POST(req: Request) {
  const auth = await requireHostOrAdmin()
  if (isUnauthorized(auth)) return auth

  let raw: unknown
  try {
    raw = await (req as Request & { json: () => Promise<unknown> }).json()
  } catch {
    return NextResponse.json({ error: 'Corpo della richiesta malformato' }, { status: 400 })
  }

  const parsed = parseBody(manutenzioneCreateSchema, raw)
  if (parsed.error) return parsed.error
  const {
    titolo, descrizione, categoria, priorita,
    strutturaId, unitaId, assegnatoA, costoStimato, note, dataScadenza,
    immagini,
  } = parsed.data

  // Verifica ownership struttura/unità se forniti
  if (strutturaId) {
    const s = await prisma.struttura.findFirst({
      where: { id: strutturaId, hostId: auth.user.hostId },
    })
    if (!s) return NextResponse.json({ error: 'Struttura non trovata' }, { status: 404 })
  }
  if (unitaId) {
    const u = await prisma.unitaPrenotabile.findFirst({
      where: { id: unitaId, struttura: { hostId: auth.user.hostId } },
    })
    if (!u) return NextResponse.json({ error: 'Unità non trovata' }, { status: 404 })
  }

  const segnalazione = await prisma.segnalazioneManutenzione.create({
    data: {
      hostId: auth.user.hostId,
      titolo,
      descrizione: descrizione ?? null,
      categoria,
      priorita,
      strutturaId: strutturaId ?? null,
      unitaId: unitaId ?? null,
      assegnatoA: assegnatoA ?? null,
      costoStimato: costoStimato ?? null,
      note: note ?? null,
      dataScadenza: dataScadenza ? new Date(dataScadenza) : null,
      immagini: immagini ?? [],
      immagineUrl: immagini && immagini.length > 0 ? immagini[0] : null,
    },
    include: {
      struttura: { select: { id: true, nome: true } },
      unita: { select: { id: true, nome: true } },
    },
  })

  logger.info('Segnalazione manutenzione creata', 'host/manutenzione', {
    segnalazioneId: segnalazione.id,
    hostId: auth.user.hostId,
  })

  // URGENTE + camera occupata → notifica reception con suggerimento cambio camera
  if (priorita === 'URGENTE' && unitaId) {
    try {
      const oggi = new Date()
      oggi.setHours(0, 0, 0, 0)
      const domani = new Date(oggi)
      domani.setDate(domani.getDate() + 1)
      const prenAttiva = await prisma.prenotazione.findFirst({
        where: {
          hostId: auth.user.hostId,
          unitaId,
          stato: 'CONFERMATA',
          deletedAt: null,
          dataArrivo: { lte: domani },
          OR: [{ dataPartenza: null }, { dataPartenza: { gt: oggi } }],
        },
        select: {
          id: true, guestNome: true, guestCognome: true,
          unita: { select: { nome: true } },
        },
      })
      if (prenAttiva) {
        const ospite = `${prenAttiva.guestNome} ${prenAttiva.guestCognome}`.trim()
        await prisma.notifica.create({
          data: {
            hostId: auth.user.hostId,
            tipo: 'manutenzione_urgente_occupata',
            titolo: `Manutenzione URGENTE · camera occupata da ${ospite}`,
            messaggio: `"${titolo}" · ${prenAttiva.unita?.nome ?? 'camera'}. Valuta un cambio camera per l'ospite.`,
            linkUrl: `/host/prenotazioni/${prenAttiva.id}`,
          },
        })
      }
    } catch (err) {
      logger.warn('Notifica URGENTE occupata fallita', { error: String(err) })
    }
  }

  return NextResponse.json(segnalazione, { status: 201 })
}
