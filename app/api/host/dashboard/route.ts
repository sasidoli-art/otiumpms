import { NextRequest, NextResponse } from 'next/server'
import { requireHost, isUnauthorized } from '@/lib/auth-middleware'
import { prisma } from '@/lib/db'
import { parseModuli } from '@/lib/moduli'
import { format, addDays } from 'date-fns'
import { it as itLocale } from 'date-fns/locale'
import { notDeleted } from '@/lib/prisma-helpers'

/**
 * GET /api/host/dashboard?strutturaId=xxx
 *
 * Returns all data for the host dashboard in a single call.
 * If strutturaId is omitted, aggregates across all host structures.
 * Cached for 15 seconds.
 */
export async function GET(req: NextRequest) {
  const auth = await requireHost()
  if (isUnauthorized(auth)) return auth

  const hostId = auth.user.hostId
  const strutturaId = req.nextUrl.searchParams.get('strutturaId') || null

  // Scope filter: hostId always, strutturaId if provided
  const scope = strutturaId ? { hostId, strutturaId } : { hostId }

  // Host data for module checks
  const host = await prisma.host.findUnique({
    where: { id: hostId },
    select: { moduliAttivi: true },
  })
  const moduli = parseModuli(host?.moduliAttivi)

  // ── Today boundaries in Europe/Rome ───────────────────────────────────
  const now = new Date()
  const romeDate = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Rome',
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(now)
  const inizioGiornata = new Date(`${romeDate}T00:00:00+02:00`)
  const fineGiornata = new Date(`${romeDate}T23:59:59.999+02:00`)

  const dayName = format(inizioGiornata, 'EEEE', { locale: itLocale })
  const dayNameCap = dayName.charAt(0).toUpperCase() + dayName.slice(1)

  // ── KPI window: mese corrente (1° → oggi) vs mese scorso (1° → giorno equiv) ──
  const oggi = new Date(inizioGiornata)
  const inizioMeseCorrente = new Date(Date.UTC(oggi.getUTCFullYear(), oggi.getUTCMonth(), 1))
  const inizioMeseScorso = new Date(Date.UTC(oggi.getUTCFullYear(), oggi.getUTCMonth() - 1, 1))
  // Stesso giorno-of-month del mese scorso (per confronto fair se siamo a metà mese)
  const oggiMeseScorso = new Date(Date.UTC(
    oggi.getUTCFullYear(), oggi.getUTCMonth() - 1, oggi.getUTCDate(),
    23, 59, 59, 999,
  ))

  // ── All queries in parallel ───────────────────────────────────────────

  const [
    // Arrivi oggi
    arriviLista,
    // Partenze oggi
    partenzeLista,
    // In-house
    inHouse,
    // Azioni
    prenotazioniDaConfermare,
    taskHKAperti,
    manutenzioneUrgente,
    messaggiNonLetti,
    traceScadutiOggi,
    checkinDaVerificare,
    fattureDaEmettere,
    // Occupazione
    unitaTotali,
    prenotazioniRange,
    // SPA oggi
    spaAppOggi,
    spaCompletatiOggi,
    spaProssimo,
    // Attività recente
    auditRecente,
    // KPI mensili
    kpiMeseCorrente,
    kpiMeseScorso,
  ] = await Promise.all([

    // ── ARRIVI ──
    prisma.prenotazione.findMany({
      where: {
        ...scope,
        ...notDeleted,
        dataArrivo: { gte: inizioGiornata, lte: fineGiornata },
        stato: { in: ['CONFERMATA', 'COMPLETATA'] },
      },
      select: {
        id: true,
        guestNome: true,
        guestCognome: true,
        numOspiti: true,
        statoCheckIn: true,
        pin: true,
        unita: { select: { nome: true } },
      },
      orderBy: { guestCognome: 'asc' },
      take: 20,
    }),

    // ── PARTENZE ──
    prisma.prenotazione.findMany({
      where: {
        ...scope,
        ...notDeleted,
        dataPartenza: { gte: inizioGiornata, lte: fineGiornata },
        stato: { in: ['CONFERMATA', 'COMPLETATA'] },
      },
      select: {
        id: true,
        guestNome: true,
        guestCognome: true,
        regCardFirmata: true,
        unita: { select: { nome: true } },
      },
      orderBy: { guestCognome: 'asc' },
      take: 20,
    }),

    // ── IN-HOUSE ──
    prisma.prenotazione.count({
      where: {
        ...scope,
        ...notDeleted,
        stato: 'CONFERMATA',
        dataArrivo: { lte: fineGiornata },
        OR: [
          { dataPartenza: { gt: inizioGiornata } },
          { dataPartenza: null },
        ],
      },
    }),

    // ── AZIONI: prenotazioni da confermare ──
    prisma.prenotazione.count({
      where: { ...scope, ...notDeleted, stato: 'RICHIESTA' },
    }),

    // ── AZIONI: task HK aperti oggi ──
    moduli.housekeeping
      ? prisma.taskHK.count({
          where: { hostId, completato: false, dataScadenza: { lte: fineGiornata } },
        })
      : Promise.resolve(0),

    // ── AZIONI: manutenzione urgente ──
    moduli.manutenzione
      ? prisma.segnalazioneManutenzione.count({
          where: { hostId, priorita: 'URGENTE', stato: { in: ['APERTA', 'IN_LAVORAZIONE'] } },
        })
      : Promise.resolve(0),

    // ── AZIONI: messaggi non letti ──
    prisma.messaggio.count({
      where: { chat: { hostId }, mittente: 'GUEST', letto: false },
    }),

    // ── AZIONI: trace scaduti oggi ──
    prisma.trace.count({
      where: {
        hostId,
        dataScadenza: { lte: fineGiornata },
        stato: { notIn: ['COMPLETATO', 'ANNULLATO'] },
      },
    }),

    // ── AZIONI: checkin da verificare ──
    prisma.prenotazione.count({
      where: { ...scope, statoCheckIn: 'ONLINE_COMPLETATO' },
    }),

    // ── AZIONI: fatture da emettere ──
    moduli.fatturazione
      ? prisma.prenotazione.count({
          where: { ...scope, ...notDeleted, stato: 'COMPLETATA', fatturaId: null },
        })
      : Promise.resolve(0),

    // ── OCCUPAZIONE: unità totali ──
    prisma.unitaPrenotabile.count({
      where: {
        attiva: true,
        struttura: {
          hostId,
          attiva: true,
          ...(strutturaId && { id: strutturaId }),
        },
      },
    }),

    // ── OCCUPAZIONE: prenotazioni nei prossimi 7 giorni ──
    prisma.prenotazione.findMany({
      where: {
        ...scope,
        ...notDeleted,
        stato: { in: ['CONFERMATA', 'COMPLETATA'] },
        dataArrivo: { lte: addDays(fineGiornata, 7) },
        OR: [
          { dataPartenza: { gte: inizioGiornata } },
          { dataPartenza: null },
        ],
      },
      select: { dataArrivo: true, dataPartenza: true },
    }),

    // ── SPA: appuntamenti oggi ──
    moduli.spa
      ? prisma.appuntamentoSpa.count({
          where: {
            hostId,
            ...notDeleted,
            dataOra: { gte: inizioGiornata, lte: fineGiornata },
            stato: { in: ['PRENOTATO', 'CONFERMATO', 'IN_CORSO'] },
          },
        })
      : Promise.resolve(0),

    // ── SPA: completati oggi ──
    moduli.spa
      ? prisma.appuntamentoSpa.count({
          where: {
            hostId,
            ...notDeleted,
            dataOra: { gte: inizioGiornata, lte: fineGiornata },
            stato: 'COMPLETATO',
          },
        })
      : Promise.resolve(0),

    // ── SPA: prossimo appuntamento ──
    moduli.spa
      ? prisma.appuntamentoSpa.findFirst({
          where: {
            hostId,
            ...notDeleted,
            dataOra: { gte: now },
            stato: { in: ['PRENOTATO', 'CONFERMATO'] },
          },
          select: {
            dataOra: true,
            guestNome: true,
            guestCognome: true,
            trattamento: { select: { nome: true } },
            terapista: { select: { nome: true, cognome: true } },
          },
          orderBy: { dataOra: 'asc' },
        })
      : Promise.resolve(null),

    // ── ATTIVITÀ RECENTE ──
    prisma.auditLog.findMany({
      where: { hostId },
      select: {
        azione: true,
        entita: true,
        dettagli: true,
        createdAt: true,
        entitaId: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    }),

    // ── KPI MENSILI: ricavi + count, mese corrente vs scorso ──────────────
    prisma.prenotazione.aggregate({
      where: {
        ...scope,
        ...notDeleted,
        stato: { in: ['CONFERMATA', 'COMPLETATA'] },
        dataArrivo: { gte: inizioMeseCorrente, lte: fineGiornata },
      },
      _sum: { prezzoTotale: true },
      _count: { _all: true },
    }),
    prisma.prenotazione.aggregate({
      where: {
        ...scope,
        ...notDeleted,
        stato: { in: ['CONFERMATA', 'COMPLETATA'] },
        dataArrivo: { gte: inizioMeseScorso, lte: oggiMeseScorso },
      },
      _sum: { prezzoTotale: true },
      _count: { _all: true },
    }),
  ])

  // ── Post-processing ───────────────────────────────────────────────────

  // Type shims for stale Prisma client
  type ArrivoRow = { id: string; guestNome: string; guestCognome: string; numOspiti: number; statoCheckIn: string; pin: string | null; unita: { nome: string } | null }
  type PartenzaRow = { id: string; guestNome: string; guestCognome: string; regCardFirmata: boolean; unita: { nome: string } | null }
  type OccRow = { dataArrivo: Date; dataPartenza: Date | null }
  type AuditRow = { azione: string; entita: string; dettagli: string | null; createdAt: Date; entitaId: string | null }

  const arrivi = arriviLista as ArrivoRow[]
  const partenze = partenzeLista as PartenzaRow[]
  const occRange = prenotazioniRange as OccRow[]
  const auditRows = auditRecente as AuditRow[]

  // Arrivi breakdown
  const arriviTotale = arrivi.length
  const checkinCompletati = arrivi.filter(p => p.statoCheckIn === 'VERIFICATO').length
  const checkinOnline = arrivi.filter(p => p.statoCheckIn === 'ONLINE_COMPLETATO').length
  const checkinMancanti = arrivi.filter(p => p.statoCheckIn === 'NON_INIZIATO').length

  // Occupazione settimana
  const settimana = Array.from({ length: 7 }, (_, i) => {
    const day = addDays(inizioGiornata, i)
    const occupate = occRange.filter(p => {
      const a = new Date(p.dataArrivo)
      a.setHours(0, 0, 0, 0)
      const z = p.dataPartenza ? new Date(p.dataPartenza) : addDays(a, 1)
      z.setHours(0, 0, 0, 0)
      return day >= a && day < z
    }).length

    return {
      data: format(day, 'yyyy-MM-dd'),
      giorno: format(day, 'EEE', { locale: itLocale }),
      occupate: Math.min(occupate, unitaTotali),
      totali: unitaTotali,
    }
  })

  const unitaOccupate = settimana[0]?.occupate ?? 0

  // SPA oggi
  type SpaRow = { dataOra: Date; guestNome: string | null; guestCognome: string | null; trattamento: { nome: string } | null; terapista: { nome: string; cognome: string } | null } | null
  const spaNext = spaProssimo as SpaRow

  const spaOggi = moduli.spa
    ? {
        appuntamenti: spaAppOggi,
        completati: spaCompletatiOggi,
        prossimo: spaNext
          ? {
              guestNome: `${spaNext.guestNome ?? ''} ${spaNext.guestCognome ?? ''}`.trim(),
              trattamentoNome: spaNext.trattamento?.nome ?? 'Trattamento',
              oraInizio: format(new Date(spaNext.dataOra), 'HH:mm'),
              terapistaNome: spaNext.terapista
                ? `${spaNext.terapista.nome} ${spaNext.terapista.cognome}`
                : null,
            }
          : null,
      }
    : null

  // Attività recente
  const attivitaRecente = auditRows.map(log => ({
    tipo: mapAuditTipo(log.entita),
    testo: log.dettagli || `${log.azione} ${log.entita}`,
    tempo: log.createdAt.toISOString(),
    linkUrl: buildAuditLink(log.entita, log.entitaId),
  }))

  // ── Response ──────────────────────────────────────────────────────────

  const body = {
    oggi: {
      data: romeDate,
      giorno: dayNameCap,
      arrivi: {
        totale: arriviTotale,
        checkinCompletati,
        checkinOnline,
        checkinMancanti,
        lista: arrivi.map(p => ({
          id: p.id,
          guestNome: p.guestNome,
          guestCognome: p.guestCognome,
          unitaNome: p.unita?.nome ?? null,
          numOspiti: p.numOspiti,
          oraArrivo: null as string | null,
          statoCheckIn: p.statoCheckIn,
          pin: p.pin,
        })),
      },
      partenze: {
        totale: partenze.length,
        lista: partenze.map(p => ({
          id: p.id,
          guestNome: p.guestNome,
          guestCognome: p.guestCognome,
          unitaNome: p.unita?.nome ?? null,
          regCardFirmata: p.regCardFirmata,
        })),
      },
      inHouse,
    },
    azioni: {
      prenotazioniDaConfermare,
      taskHKAperti,
      manutenzioneUrgente,
      messaggiNonLetti,
      traceScadutiOggi,
      checkinDaVerificare,
      fattureDaEmettere,
    },
    occupazione: {
      unitaTotali,
      unitaOccupate,
      unitaLibere: unitaTotali - unitaOccupate,
      percentuale: unitaTotali > 0 ? Math.round((unitaOccupate / unitaTotali) * 100) : 0,
      settimana,
    },
    spaOggi,
    attivitaRecente,
    kpi: buildKpi(kpiMeseCorrente, kpiMeseScorso),
  }

  return NextResponse.json(body, {
    headers: { 'Cache-Control': 'private, max-age=15' },
  })
}

// ─── KPI helper ─────────────────────────────────────────────────────────────

type AggResult = { _sum: { prezzoTotale: number | null }; _count: { _all: number } }

/**
 * Calcola i 4 KPI mensili con delta % vs mese scorso (stessa finestra temporale).
 * Soglie semantiche: positivo se ↑, negativo se ↓, neutro se 0% o se mese scorso=0.
 */
function buildKpi(corrente: AggResult, scorso: AggResult) {
  const ricaviCorrente   = corrente._sum.prezzoTotale ?? 0
  const ricaviScorso     = scorso._sum.prezzoTotale ?? 0
  const prenotCorrente   = corrente._count._all
  const prenotScorso     = scorso._count._all

  const adrCorrente = prenotCorrente > 0 ? ricaviCorrente / prenotCorrente : 0
  const adrScorso   = prenotScorso > 0 ? ricaviScorso / prenotScorso : 0

  return {
    ricaviMese: ricaviCorrente,
    ricaviMeseScorso: ricaviScorso,
    deltaRicaviPercent: deltaPercent(ricaviCorrente, ricaviScorso),

    prenotazioniMese: prenotCorrente,
    prenotazioniMeseScorso: prenotScorso,
    deltaPrenotazioniPercent: deltaPercent(prenotCorrente, prenotScorso),

    adrMese: adrCorrente,
    adrMeseScorso: adrScorso,
    deltaAdrPercent: deltaPercent(adrCorrente, adrScorso),
  }
}

function deltaPercent(corrente: number, scorso: number): number | null {
  if (scorso === 0) return null  // delta non calcolabile se baseline zero
  return Math.round(((corrente - scorso) / scorso) * 100)
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function mapAuditTipo(entita: string): string {
  const map: Record<string, string> = {
    prenotazione: 'prenotazione',
    checkin: 'checkin',
    messaggio: 'messaggio',
    segnalazioneManutenzione: 'manutenzione',
    manutenzione: 'manutenzione',
    appuntamentoSpa: 'spa',
    spa: 'spa',
    pagamento: 'pagamento',
    fattura: 'pagamento',
  }
  return map[entita] || 'prenotazione'
}

function buildAuditLink(entita: string, entitaId: string | null): string | null {
  if (!entitaId) return null
  const routes: Record<string, string> = {
    prenotazione: '/host/prenotazioni/',
    checkin: '/host/prenotazioni/',
    messaggio: '/host/concierge/',
    segnalazioneManutenzione: '/host/manutenzione/',
    manutenzione: '/host/manutenzione/',
    appuntamentoSpa: '/host/spa/appuntamenti/',
    spa: '/host/spa/appuntamenti/',
    fattura: '/host/fatture/',
    pagamento: '/host/cassa/',
  }
  const base = routes[entita]
  return base ? `${base}${entitaId}` : null
}
