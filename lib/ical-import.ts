/**
 * Parser iCal per import da canali esterni (Booking.com, Airbnb, VRBO, Google Calendar).
 * Parsa feed iCal (RFC 5545), estrae VEVENT con date inizio/fine.
 */

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
