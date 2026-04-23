/**
 * Parser e sincronizzazione iCal per canali esterni (Booking.com, Airbnb, VRBO, Google Calendar).
 *
 * - `fetchAndParseIcal` / `parseIcalText` — parsing RFC 5545
 * - `importaFeedICal(canaleId)` — sync completo di un singolo canale (upsert + delete orfani)
 * - `importaTuttiCanali(hostId)` — sync di tutti i canali attivi di un host (concorrenza limitata)
 */

import { prisma } from '@/lib/db'
import { logger } from '@/lib/logger'

export interface IcalImportEvent {
  uid: string
  summary: string
  dtstart: Date
  dtend: Date
  description?: string
}

/**
 * Fetch e parse di un feed iCal da URL esterno.
 * Restituisce gli eventi (prenotazioni/blocchi) trovati.
 */
export async function fetchAndParseIcal(url: string): Promise<IcalImportEvent[]> {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'OtiumWeek-ChannelManager/1.0' },
    signal: AbortSignal.timeout(15000),
  })

  if (!res.ok) {
    throw new Error(`Errore fetch iCal: ${res.status} ${res.statusText}`)
  }

  const text = await res.text()
  return parseIcalText(text)
}

/**
 * Parsa testo iCal (RFC 5545) ed estrae gli eventi.
 */
export function parseIcalText(text: string): IcalImportEvent[] {
  const events: IcalImportEvent[] = []

  // Unfold linee (RFC 5545 §3.1: righe continuate con spazio/tab)
  const unfolded = text.replace(/\r\n[ \t]/g, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  const lines = unfolded.split('\n')

  let inEvent = false
  let uid = ''
  let summary = ''
  let dtstart = ''
  let dtend = ''
  let description = ''

  for (const line of lines) {
    const trimmed = line.trim()

    if (trimmed === 'BEGIN:VEVENT') {
      inEvent = true
      uid = ''; summary = ''; dtstart = ''; dtend = ''; description = ''
      continue
    }

    if (trimmed === 'END:VEVENT') {
      inEvent = false
      if (dtstart) {
        const start = parseIcalDate(dtstart)
        const end = dtend ? parseIcalDate(dtend) : new Date(start.getTime() + 86400000)

        if (start && !isNaN(start.getTime())) {
          events.push({
            uid: uid || `import-${start.toISOString()}-${Math.random().toString(36).slice(2, 8)}`,
            summary: unescapeIcal(summary || 'Occupato'),
            dtstart: start,
            dtend: end,
            description: description ? unescapeIcal(description) : undefined,
          })
        }
      }
      continue
    }

    if (!inEvent) continue

    if (trimmed.startsWith('UID:')) uid = trimmed.slice(4)
    else if (trimmed.startsWith('SUMMARY:')) summary = trimmed.slice(8)
    else if (trimmed.startsWith('DESCRIPTION:')) description = trimmed.slice(12)
    else if (trimmed.startsWith('DTSTART')) dtstart = extractDateValue(trimmed)
    else if (trimmed.startsWith('DTEND')) dtend = extractDateValue(trimmed)
  }

  return events
}

/**
 * Estrae il valore data da una riga DTSTART/DTEND che può avere parametri.
 * Es: "DTSTART;VALUE=DATE:20260315" → "20260315"
 *     "DTSTART:20260315T100000Z" → "20260315T100000Z"
 */
function extractDateValue(line: string): string {
  const colonIdx = line.indexOf(':')
  if (colonIdx === -1) return ''
  return line.slice(colonIdx + 1).trim()
}

/**
 * Parsa una data iCal in formato YYYYMMDD o YYYYMMDDTHHmmssZ.
 */
function parseIcalDate(s: string): Date {
  // Solo data: YYYYMMDD
  if (s.length === 8 && /^\d{8}$/.test(s)) {
    return new Date(
      parseInt(s.slice(0, 4)),
      parseInt(s.slice(4, 6)) - 1,
      parseInt(s.slice(6, 8)),
    )
  }

  // Data+ora: YYYYMMDDTHHmmss o YYYYMMDDTHHmmssZ
  if (s.length >= 15 && s[8] === 'T') {
    const y = parseInt(s.slice(0, 4))
    const m = parseInt(s.slice(4, 6)) - 1
    const d = parseInt(s.slice(6, 8))
    const h = parseInt(s.slice(9, 11))
    const min = parseInt(s.slice(11, 13))
    const sec = parseInt(s.slice(13, 15))

    if (s.endsWith('Z')) {
      return new Date(Date.UTC(y, m, d, h, min, sec))
    }
    return new Date(y, m, d, h, min, sec)
  }

  // Fallback: prova il parser nativo
  return new Date(s)
}

/**
 * Unescape valori iCal (RFC 5545 §3.3.11).
 */
function unescapeIcal(s: string): string {
  return s
    .replace(/\\n/g, '\n')
    .replace(/\\,/g, ',')
    .replace(/\\;/g, ';')
    .replace(/\\\\/g, '\\')
}

// ────────────────────────────────────────────────────────────────────────────
// Sincronizzazione canali (import completo + upsert + delete orfani)
// ────────────────────────────────────────────────────────────────────────────

export type ImportResult = {
  canaleId: string
  canaleNome: string
  unitaNome: string | null
  nuove: number
  aggiornate: number
  cancellate: number
  invariate: number
  totaleEventi: number
  errore?: string
  durataMs: number
}

/**
 * Sync di un singolo canale.
 *
 * Strategia:
 * 1. Fetch feed iCal
 * 2. Carica PrenotazioneCanale esistenti (uid → row)
 * 3. Per ogni VEVENT: confronta dtstart/dtend con la riga esistente → classifica come invariata/aggiornata/nuova
 * 4. Delete delle righe il cui uid non è più presente (OTA cancellation)
 *
 * Note:
 * - In caso di fetch fallito: aggiorna `CanaleEsterno.ultimoSyncOk=false` con errore
 *   e ritorna `ImportResult` con `errore` valorizzato (no throw).
 * - Disponibilità: non aggiornata qui. La disponibilità pubblica va calcolata
 *   al query-time unendo `Prenotazione` + `PrenotazioneCanale` (single source of truth).
 */
export async function importaFeedICal(canaleId: string): Promise<ImportResult> {
  const t0 = Date.now()

  const canale = await prisma.canaleEsterno.findUnique({
    where: { id: canaleId },
    include: { unita: { select: { nome: true } } },
  })

  if (!canale) {
    return {
      canaleId,
      canaleNome: '(inesistente)',
      unitaNome: null,
      nuove: 0, aggiornate: 0, cancellate: 0, invariate: 0, totaleEventi: 0,
      errore: 'Canale non trovato',
      durataMs: Date.now() - t0,
    }
  }

  const base: ImportResult = {
    canaleId,
    canaleNome: canale.nome,
    unitaNome: canale.unita?.nome ?? null,
    nuove: 0, aggiornate: 0, cancellate: 0, invariate: 0, totaleEventi: 0,
    durataMs: 0,
  }

  let eventi: IcalImportEvent[]
  try {
    eventi = await fetchAndParseIcal(canale.urlIcal)
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err)
    logger.error(`ical-import fetch fallita ${canaleId}`, { error: errMsg })

    await prisma.canaleEsterno.update({
      where: { id: canaleId },
      data: { ultimoSync: new Date(), ultimoSyncOk: false, ultimoSyncError: errMsg.slice(0, 500) },
    })
    return { ...base, errore: errMsg, durataMs: Date.now() - t0 }
  }

  // Pre-load righe esistenti (evita N+1)
  const esistenti = await prisma.prenotazioneCanale.findMany({
    where: { canaleId },
    select: { id: true, uidEvento: true, dataInizio: true, dataFine: true, sommario: true },
  })
  const perUid = new Map(esistenti.map((r) => [r.uidEvento, r]))

  const uidDalFeed = new Set<string>()
  let nuove = 0
  let aggiornate = 0
  let invariate = 0

  for (const ev of eventi) {
    uidDalFeed.add(ev.uid)
    const cur = perUid.get(ev.uid)

    if (!cur) {
      await prisma.prenotazioneCanale.create({
        data: {
          canaleId,
          uidEvento: ev.uid,
          sommario: ev.summary,
          dataInizio: ev.dtstart,
          dataFine: ev.dtend,
          descrizione: ev.description || null,
        },
      })
      nuove += 1
      continue
    }

    const sameStart = cur.dataInizio.getTime() === ev.dtstart.getTime()
    const sameEnd = cur.dataFine.getTime() === ev.dtend.getTime()
    const sameSummary = cur.sommario === ev.summary
    if (sameStart && sameEnd && sameSummary) {
      invariate += 1
      continue
    }

    await prisma.prenotazioneCanale.update({
      where: { id: cur.id },
      data: {
        sommario: ev.summary,
        dataInizio: ev.dtstart,
        dataFine: ev.dtend,
        descrizione: ev.description || null,
      },
    })
    aggiornate += 1
  }

  // Delete orfani — prenotazioni OTA cancellate lato canale
  const orfani = esistenti.filter((r) => !uidDalFeed.has(r.uidEvento))
  let cancellate = 0
  if (orfani.length > 0) {
    const res = await prisma.prenotazioneCanale.deleteMany({
      where: { id: { in: orfani.map((o) => o.id) } },
    })
    cancellate = res.count

    // Notifica l'host delle cancellazioni — una notifica sintetica per canale
    if (cancellate > 0) {
      try {
        const struttura = await prisma.struttura.findUnique({
          where: { id: canale.strutturaId },
          select: { hostId: true },
        })
        if (struttura) {
          await prisma.notifica.create({
            data: {
              hostId: struttura.hostId,
              tipo: 'sistema',
              titolo: `${cancellate} prenotazione${cancellate === 1 ? '' : 'i'} cancellata${cancellate === 1 ? '' : 'e'} su ${canale.nome}`,
              messaggio: `Il feed iCal di ${canale.nome} non contiene più ${cancellate} evento${cancellate === 1 ? '' : 'i'} precedentemente importato${cancellate === 1 ? '' : 'i'}.`,
              linkUrl: '/host/canali',
            },
          })
        }
      } catch (err) {
        logger.warn('Notifica cancellazione canale fallita', { error: String(err) })
      }
    }
  }

  // Stato sync OK
  await prisma.canaleEsterno.update({
    where: { id: canaleId },
    data: {
      ultimoSync: new Date(),
      ultimoSyncOk: true,
      ultimoSyncError: null,
      eventiImportati: eventi.length,
    },
  })

  return {
    ...base,
    nuove, aggiornate, cancellate, invariate,
    totaleEventi: eventi.length,
    durataMs: Date.now() - t0,
  }
}

/**
 * Sync di tutti i canali attivi di un host, con concorrenza limitata.
 *
 * Concorrenza: max 5 fetch simultanei. Un canale lento non blocca gli altri.
 * Non lancia mai: ogni risultato è un `ImportResult` (con `errore` se fallito).
 */
export async function importaTuttiCanali(
  hostId: string,
  opts: { concurrency?: number } = {},
): Promise<ImportResult[]> {
  const concurrency = opts.concurrency ?? 5

  const canali = await prisma.canaleEsterno.findMany({
    where: { attivo: true, struttura: { hostId } },
    select: { id: true },
  })

  const results: ImportResult[] = []
  let idx = 0

  async function worker() {
    while (idx < canali.length) {
      const mine = idx++
      const c = canali[mine]
      try {
        results.push(await importaFeedICal(c.id))
      } catch (err) {
        // Salvaguardia: importaFeedICal non dovrebbe mai throw, ma per sicurezza
        results.push({
          canaleId: c.id,
          canaleNome: '(errore)',
          unitaNome: null,
          nuove: 0, aggiornate: 0, cancellate: 0, invariate: 0, totaleEventi: 0,
          errore: err instanceof Error ? err.message : String(err),
          durataMs: 0,
        })
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, canali.length) }, worker))
  return results
}
