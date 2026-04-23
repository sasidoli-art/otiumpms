/**
 * Generatore feed iCal PER UNITÀ PRENOTABILE.
 *
 * Gli OTA (Booking, Airbnb, VRBO) importano questo feed per sapere quando
 * la camera è occupata. Include sia le prenotazioni dirette sia le
 * prenotazioni già importate da altri canali — ma MAI dal canale che sta
 * leggendo il feed (per evitare loop di sync).
 *
 * Sicurezza: token HMAC verificato (`verifyIcalToken`) — niente token, niente feed.
 * Privacy: `SUMMARY: "Occupato"` — nessun nome ospite viene esposto.
 */

import { prisma } from '@/lib/db'
import { buildCalendar, prenotazioniToEvents, type IcalEvent } from '@/lib/ical'

export type FeedIcalResult =
  | { ok: true; ics: string; unitaNome: string; strutturaNome: string }
  | { ok: false; error: 'UNITA_NON_TROVATA' | 'TOKEN_NON_VALIDO' }

export async function generaFeedICal(
  unitaId: string,
  escludiCanaleId?: string,
): Promise<FeedIcalResult> {
  const unita = await prisma.unitaPrenotabile.findUnique({
    where: { id: unitaId },
    select: {
      id: true,
      nome: true,
      struttura: { select: { nome: true } },
    },
  })
  if (!unita) return { ok: false, error: 'UNITA_NON_TROVATA' }

  // ─── 1. Prenotazioni dirette (CONFERMATA / RICHIESTA / COMPLETATA) ─────
  // Anche RICHIESTA e` inclusa: blocca temporaneamente il giorno in attesa
  // di conferma, riducendo il rischio di overbooking.
  const prenotazioniDirette = await prisma.prenotazione.findMany({
    where: {
      unitaId,
      deletedAt: null,
      stato: { in: ['CONFERMATA', 'RICHIESTA', 'COMPLETATA'] },
    },
    select: {
      id: true,
      dataArrivo: true,
      dataPartenza: true,
      stato: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: { dataArrivo: 'asc' },
  })

  const eventiDiretti: IcalEvent[] = prenotazioniToEvents(prenotazioniDirette)

  // ─── 2. Blocchi da altri canali (NO loop) ──────────────────────────────
  //   CanaleEsterno è collegato a Struttura (+ opzionalmente Unità).
  //   Filtra:
  //     - canali della stessa struttura dell'unità
  //     - canali con unitaId = unitaId  OR  unitaId = null (struttura-wide)
  //     - esclude il canale corrente (evita loop Booking→Otium→Booking)
  const canaliAltro = await prisma.canaleEsterno.findMany({
    where: {
      struttura: { unita: { some: { id: unitaId } } },
      attivo: true,
      ...(escludiCanaleId ? { NOT: { id: escludiCanaleId } } : {}),
      OR: [{ unitaId }, { unitaId: null }],
    },
    select: { id: true },
  })
  const canaleIds = canaliAltro.map((c) => c.id)

  const bloccatiAltriCanali = canaleIds.length > 0
    ? await prisma.prenotazioneCanale.findMany({
        where: { canaleId: { in: canaleIds } },
        select: {
          id: true, uidEvento: true, canaleId: true,
          dataInizio: true, dataFine: true,
          createdAt: true, updatedAt: true,
        },
      })
    : []

  const eventiAltriCanali: IcalEvent[] = bloccatiAltriCanali.map((b) => ({
    // UID namespaced per distinguere dai diretti e mantenere stabilità tra run
    uid: `ota-${b.canaleId}-${b.id}`,
    summary: 'Occupato',
    dtstart: new Date(b.dataInizio),
    // iCal DTEND è esclusivo: `dataFine` è già la data di checkout dall'OTA
    // quindi mantieni così com'è (no +1)
    dtend: new Date(b.dataFine),
    createdAt: b.createdAt,
    updatedAt: b.updatedAt,
  }))

  const ics = buildCalendar({
    calName: `${unita.struttura.nome} — ${unita.nome}`,
    calDescription: 'Feed disponibilità Otium — sola lettura',
    events: [...eventiDiretti, ...eventiAltriCanali],
  })

  return {
    ok: true,
    ics,
    unitaNome: unita.nome,
    strutturaNome: unita.struttura.nome,
  }
}
