/**
 * Upselling catalogo (multi-touchpoint, multi-tipo).
 *
 * Affianca `lib/upsell.ts` (che gestisce SOLO i camera-upgrade basati su
 * `RegolaUpsell`). Questo modulo gestisce un catalogo generico di offerte
 * attivabili in più punti del guest journey: post-prenotazione, email
 * pre-arrivo, check-in online, benvenuto WhatsApp, in-house.
 *
 * Flusso tipico:
 *   1. UI touchpoint → `generaSuggerimentiUpselling({ hostId, prenotazioneId, touchpoint })`
 *   2. UI ritorna `UpsellingOffer[]` da mostrare all'ospite (max 3, ordinate per priorità)
 *   3. Opzionale: `registraVisualizzazione()` per tracking impressions
 *   4. Ospite clicca "Aggiungi" → `registraConversione()` → applica side-effect + log
 */

import { prisma } from '@/lib/db'
import { Prisma } from '@prisma/client'
import type {
  UpsellingSuggerimento, UpsellingTipo, UpsellingTouchpoint,
  Prenotazione,
} from '@prisma/client'
import { logger } from '@/lib/logger'

// ────────────────────────────────────────────────────────────────────────────
// Types pubblici
// ────────────────────────────────────────────────────────────────────────────

export type { UpsellingTipo, UpsellingTouchpoint } from '@prisma/client'

export interface UpsellingOffer {
  id: string
  tipo: UpsellingTipo
  titolo: string
  descrizione: string | null
  immagine: string | null
  prezzo: number      // € calcolato (non nullable nella offer)
  priorita: number
}

export interface UpsellingCondizioni {
  minNotti?: number
  maxNotti?: number
  cameraTipo?: string[]         // match case-insensitive su `unita.nome`
  pianoPasto?: string[]         // "BB" | "HB" | "FB" su `pianoPasto.piano`
  giorniPrimaArrivo?: { min?: number; max?: number }
  ospiteRicorrente?: boolean
}

// Contesto prenotazione caricato una sola volta per riuso nei check
type PrenotazioneContext = Prenotazione & {
  unita: { id: string; nome: string; prezzoBase: number } | null
  pianoPasto: { piano: string } | null
}

// ────────────────────────────────────────────────────────────────────────────
// Generazione suggerimenti per un touchpoint
// ────────────────────────────────────────────────────────────────────────────

export async function generaSuggerimentiUpselling(params: {
  hostId: string
  prenotazioneId: string
  touchpoint: UpsellingTouchpoint
  max?: number
  registraViews?: boolean
}): Promise<UpsellingOffer[]> {
  const { hostId, prenotazioneId, touchpoint, max = 3, registraViews = false } = params

  const prenotazione = await prisma.prenotazione.findFirst({
    where: { id: prenotazioneId, hostId, deletedAt: null },
    include: {
      unita: { select: { id: true, nome: true, prezzoBase: true } },
      pianoPasto: { select: { piano: true } },
    },
  })
  if (!prenotazione) return []

  // Postgres: `has` su enum[] per filtrare i suggerimenti targettati a questo touchpoint
  const suggerimenti = await prisma.upsellingSuggerimento.findMany({
    where: {
      hostId,
      attivo: true,
      posizione: { has: touchpoint },
    },
    orderBy: { priorita: 'desc' },
  })

  // Numero soggiorni passati dell'ospite (per ospiteRicorrente)
  const soggiornoPrecedenti = await countSoggiornoPrecedenti(hostId, prenotazione.guestEmail)

  const offerte: UpsellingOffer[] = []

  for (const sug of suggerimenti) {
    if (!verificaCondizione(sug.condizioni, prenotazione, soggiornoPrecedenti)) continue

    const prezzo = calcolaPrezzoUpselling(sug, prenotazione)
    if (prezzo === null) continue // prezzo non determinabile → skip

    offerte.push({
      id: sug.id,
      tipo: sug.tipo,
      titolo: sug.titolo,
      descrizione: sug.descrizione,
      immagine: sug.immagine,
      prezzo,
      priorita: sug.priorita,
    })

    if (offerte.length >= max) break
  }

  // Tracking viste (best-effort, non bloccante)
  if (registraViews && offerte.length > 0) {
    for (const o of offerte) {
      prisma.upsellingConversione.create({
        data: {
          suggerimentoId: o.id,
          prenotazioneId,
          touchpoint,
          accettato: false,
        },
      }).catch(() => {})
    }
  }

  return offerte
}

// ────────────────────────────────────────────────────────────────────────────
// Verifica condizioni
// ────────────────────────────────────────────────────────────────────────────

export function verificaCondizione(
  condizioniRaw: unknown,
  prenotazione: PrenotazioneContext,
  soggiornoPrecedenti: number,
): boolean {
  if (!condizioniRaw || typeof condizioniRaw !== 'object') return true
  const cond = condizioniRaw as UpsellingCondizioni

  // Notti
  const notti = Math.max(1, prenotazione.dataPartenza
    ? Math.round((new Date(prenotazione.dataPartenza).getTime() - new Date(prenotazione.dataArrivo).getTime()) / 86400000)
    : 1)
  if (cond.minNotti != null && notti < cond.minNotti) return false
  if (cond.maxNotti != null && notti > cond.maxNotti) return false

  // Tipo camera (nome match case-insensitive)
  if (cond.cameraTipo && cond.cameraTipo.length > 0) {
    const nomeUnita = (prenotazione.unita?.nome ?? '').toLowerCase()
    const match = cond.cameraTipo.some((t) => nomeUnita.includes(t.toLowerCase()))
    if (!match) return false
  }

  // Piano pasto
  if (cond.pianoPasto && cond.pianoPasto.length > 0) {
    const piano = prenotazione.pianoPasto?.piano ?? null
    if (!piano || !cond.pianoPasto.includes(piano)) return false
  }

  // Giorni prima dell'arrivo
  if (cond.giorniPrimaArrivo) {
    const giorni = Math.floor((new Date(prenotazione.dataArrivo).getTime() - Date.now()) / 86400000)
    const { min, max } = cond.giorniPrimaArrivo
    if (min != null && giorni < min) return false
    if (max != null && giorni > max) return false
  }

  // Ospite ricorrente
  if (cond.ospiteRicorrente === true && soggiornoPrecedenti < 1) return false

  return true
}

// ────────────────────────────────────────────────────────────────────────────
// Calcolo prezzo
// ────────────────────────────────────────────────────────────────────────────

export function calcolaPrezzoUpselling(
  sug: UpsellingSuggerimento,
  prenotazione: PrenotazioneContext,
): number | null {
  if (sug.prezzo != null) return Math.round(sug.prezzo * 100) / 100
  if (sug.prezzoPercentuale != null && prenotazione.prezzoTotale) {
    return Math.round(prenotazione.prezzoTotale * sug.prezzoPercentuale) / 100
  }
  return null
}

// ────────────────────────────────────────────────────────────────────────────
// Conta soggiorni passati per l'ospite (by email)
// ────────────────────────────────────────────────────────────────────────────

async function countSoggiornoPrecedenti(
  hostId: string,
  guestEmail: string,
): Promise<number> {
  if (!guestEmail) return 0
  return prisma.prenotazione.count({
    where: {
      hostId,
      guestEmail,
      stato: 'COMPLETATA',
      deletedAt: null,
    },
  })
}

// ────────────────────────────────────────────────────────────────────────────
// Registra conversione (accettata) + applica side effect
// ────────────────────────────────────────────────────────────────────────────

/**
 * Registra una conversione e applica l'effetto lato dati:
 *   - UPGRADE_CAMERA → sostituisce `unitaId` su Prenotazione + crea addebito
 *   - SERVIZIO_EXTRA / PACCHETTO / LATE_CHECKOUT / EARLY_CHECKIN / PIANO_PASTO /
 *     RISTORANTE / ALTRO → crea `AddebitoPrenotazione`
 *   - TRATTAMENTO_SPA → NON crea AppuntamentoSpa (richiede data/ora/terapista),
 *     lascia lo slot da finalizzare: il chiamante espone un link di booking SPA.
 *     Il flag `conversione.datiApplicazione.richiedeSetupSpa = true` segnala il followup.
 *
 * Tutte le operazioni in transazione per coerenza.
 */
export async function registraConversione(params: {
  suggerimentoId: string
  prenotazioneId: string
  touchpoint: UpsellingTouchpoint
  importo: number
}): Promise<{ conversioneId: string; richiedeSetupSpa: boolean }> {
  const { suggerimentoId, prenotazioneId, touchpoint, importo } = params

  const sug = await prisma.upsellingSuggerimento.findUnique({
    where: { id: suggerimentoId },
    select: {
      id: true, hostId: true, tipo: true, titolo: true,
      unitaTargetId: true, trattamentoSpaId: true, servizioId: true, pacchettoId: true,
    },
  })
  if (!sug) throw new Error('Suggerimento non trovato')

  const pren = await prisma.prenotazione.findFirst({
    where: { id: prenotazioneId, hostId: sug.hostId, deletedAt: null },
    select: { id: true, unitaId: true, dataArrivo: true, dataPartenza: true, prezzoTotale: true },
  })
  if (!pren) throw new Error('Prenotazione non trovata')

  return prisma.$transaction(async (tx) => {
    const datiApplicazione: Record<string, unknown> = { tipo: sug.tipo }
    let richiedeSetupSpa = false

    switch (sug.tipo) {
      case 'UPGRADE_CAMERA': {
        if (sug.unitaTargetId) {
          await tx.prenotazione.update({
            where: { id: pren.id },
            data: {
              unitaId: sug.unitaTargetId,
              prezzoTotale: (pren.prezzoTotale ?? 0) + importo,
            },
          })
          datiApplicazione.unitaPrecedenteId = pren.unitaId
          datiApplicazione.unitaNuovaId = sug.unitaTargetId
        }
        // In ogni caso registra l'addebito per tracciabilità fattura
        const addebito = await tx.addebitoPrenotazione.create({
          data: {
            prenotazioneId: pren.id,
            descrizione: `Upgrade camera · ${sug.titolo}`,
            quantita: 1,
            prezzoUnitario: importo,
            totale: importo,
            addebitatoDa: 'Upselling',
          },
        })
        datiApplicazione.addebitoId = addebito.id
        break
      }

      case 'TRATTAMENTO_SPA': {
        // Non creiamo l'AppuntamentoSpa qui — serve data/ora/terapista dall'ospite.
        // Il chiamante dovrebbe redirigere l'ospite alla pagina SPA booking.
        richiedeSetupSpa = true
        datiApplicazione.richiedeSetupSpa = true
        datiApplicazione.trattamentoSpaId = sug.trattamentoSpaId ?? null
        // Prenota comunque l'addebito come "caparra servizio" (visibile al check-out)
        const addebito = await tx.addebitoPrenotazione.create({
          data: {
            prenotazioneId: pren.id,
            descrizione: `SPA · ${sug.titolo} (da programmare)`,
            quantita: 1,
            prezzoUnitario: importo,
            totale: importo,
            addebitatoDa: 'Upselling',
          },
        })
        datiApplicazione.addebitoId = addebito.id
        break
      }

      // Tutti gli altri tipi: addebito su prenotazione (visibile in checkout)
      case 'PIANO_PASTO':
      case 'LATE_CHECKOUT':
      case 'EARLY_CHECKIN':
      case 'SERVIZIO_EXTRA':
      case 'PACCHETTO':
      case 'RISTORANTE':
      case 'ALTRO': {
        const addebito = await tx.addebitoPrenotazione.create({
          data: {
            prenotazioneId: pren.id,
            descrizione: sug.titolo,
            quantita: 1,
            prezzoUnitario: importo,
            totale: importo,
            servizioId: sug.servizioId,
            pacchettoId: sug.pacchettoId,
            addebitatoDa: 'Upselling',
          },
        })
        datiApplicazione.addebitoId = addebito.id
        break
      }
    }

    const conversione = await tx.upsellingConversione.create({
      data: {
        suggerimentoId: sug.id,
        prenotazioneId: pren.id,
        touchpoint,
        accettato: true,
        importo,
        datiApplicazione: datiApplicazione as Prisma.InputJsonValue,
      },
    })

    logger.info('Upselling conversione registrata', {
      suggerimentoId, prenotazioneId, tipo: sug.tipo, importo,
    })

    return { conversioneId: conversione.id, richiedeSetupSpa }
  })
}

// ────────────────────────────────────────────────────────────────────────────
// Registra visualizzazione (per tracking tasso conversione)
// ────────────────────────────────────────────────────────────────────────────

export async function registraVisualizzazione(params: {
  suggerimentoId: string
  prenotazioneId: string
  touchpoint: UpsellingTouchpoint
}): Promise<void> {
  await prisma.upsellingConversione.create({
    data: {
      suggerimentoId: params.suggerimentoId,
      prenotazioneId: params.prenotazioneId,
      touchpoint: params.touchpoint,
      accettato: false,
    },
  })
}

// ────────────────────────────────────────────────────────────────────────────
// Report conversioni per host
// ────────────────────────────────────────────────────────────────────────────

export async function reportConversioni(
  hostId: string,
  opts: { da?: Date; a?: Date } = {},
): Promise<Array<{
  suggerimentoId: string
  titolo: string
  tipo: UpsellingTipo
  visualizzazioni: number
  conversioni: number
  tassoConversione: number
  revenue: number
}>> {
  const suggerimenti = await prisma.upsellingSuggerimento.findMany({
    where: { hostId },
    select: { id: true, titolo: true, tipo: true },
  })

  const range = opts.da || opts.a
    ? { createdAt: { ...(opts.da ? { gte: opts.da } : {}), ...(opts.a ? { lte: opts.a } : {}) } }
    : {}

  const conversioni = await prisma.upsellingConversione.groupBy({
    by: ['suggerimentoId', 'accettato'],
    where: {
      suggerimento: { hostId },
      ...range,
    },
    _count: { _all: true },
    _sum: { importo: true },
  })

  type Agg = { views: number; accept: number; revenue: number }
  const map = new Map<string, Agg>()
  for (const c of conversioni) {
    const cur = map.get(c.suggerimentoId) ?? { views: 0, accept: 0, revenue: 0 }
    if (c.accettato) {
      cur.accept += c._count._all
      cur.revenue += c._sum.importo ?? 0
    } else {
      cur.views += c._count._all
    }
    map.set(c.suggerimentoId, cur)
  }

  return suggerimenti.map((s) => {
    const agg = map.get(s.id) ?? { views: 0, accept: 0, revenue: 0 }
    const totale = agg.views + agg.accept
    return {
      suggerimentoId: s.id,
      titolo: s.titolo,
      tipo: s.tipo,
      visualizzazioni: totale,
      conversioni: agg.accept,
      tassoConversione: totale > 0 ? Math.round((agg.accept / totale) * 1000) / 10 : 0,
      revenue: Math.round(agg.revenue * 100) / 100,
    }
  })
}

