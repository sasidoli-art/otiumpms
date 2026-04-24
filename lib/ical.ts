/**
 * Generatore iCal (RFC 5545) per l'export dei calendari di disponibilità.
 * Compatibile con Booking.com, Airbnb, VRBO, Google Calendar e qualsiasi
 * client iCal standard.
 *
 * Token di sicurezza: HMAC-SHA256 sull'ID risorsa — nessuna modifica al DB.
 */

import { createHmac, timingSafeEqual } from 'crypto'

// ─── Token sicuro per URL pubbliche ──────────────────────────────────────────

/**
 * Genera un token HMAC stabile per una risorsa (struttura o unità).
 * Il token è deterministico: stesso ID → stesso token, nessuna persistenza.
 */
export function generateIcalToken(resourceId: string): string {
  const secret = process.env.NEXTAUTH_SECRET
  if (!secret) throw new Error('NEXTAUTH_SECRET is required for iCal token generation')
  const hmac = createHmac('sha256', secret).update(`ical:${resourceId}`).digest('hex').slice(0, 32)
  const id64 = Buffer.from(resourceId).toString('base64url')
  return `${id64}.${hmac}`
}

/**
 * Verifica che il token corrisponda all'ID risorsa.
 */
export function verifyIcalToken(token: string, resourceId: string): boolean {
  try {
    const expected = generateIcalToken(resourceId)
    if (token.length !== expected.length) return false
    return timingSafeEqual(Buffer.from(token), Buffer.from(expected))
  } catch {
    return false
  }
}

// ─── Formattazione date iCal ──────────────────────────────────────────────────

/** Formatta una data come YYYYMMDD (evento tutto il giorno, RFC 5545). */
function icalDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}${m}${day}`
}

/** Formatta una data come YYYYMMDDTHHMMSSZ (UTC, RFC 5545). */
function icalDateTime(d: Date): string {
  return d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
}

/** Escapa caratteri speciali nei valori iCal (RFC 5545 §3.3.11). */
function icalEscape(s: string): string {
  return s
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n')
}

// ─── Blocchi VEVENT ───────────────────────────────────────────────────────────

export interface IcalEvent {
  uid: string
  summary: string
  description?: string
  dtstart: Date
  dtend: Date         // per eventi tutto-giorno = giorno dopo la partenza (RFC 5545)
  createdAt: Date
  updatedAt: Date
}

/**
 * Dominio per UID iCal — ricavato da `NEXT_PUBLIC_APP_URL` (es. otium-pms.vercel.app)
 * con fallback hard-coded. UID è opaque per le OTA, serve solo per dedup interno.
 */
function getIcalDomain(): string {
  const url = process.env.NEXT_PUBLIC_APP_URL || 'https://otium-pms.vercel.app'
  try { return new URL(url).hostname } catch { return 'otium-pms.vercel.app' }
}

function buildVEvent(e: IcalEvent): string {
  const lines = [
    'BEGIN:VEVENT',
    `UID:${e.uid}@${getIcalDomain()}`,
    `DTSTAMP:${icalDateTime(new Date())}`,
    `CREATED:${icalDateTime(e.createdAt)}`,
    `LAST-MODIFIED:${icalDateTime(e.updatedAt)}`,
    `DTSTART;VALUE=DATE:${icalDate(e.dtstart)}`,
    `DTEND;VALUE=DATE:${icalDate(e.dtend)}`,
    `SUMMARY:${icalEscape(e.summary)}`,
    ...(e.description ? [`DESCRIPTION:${icalEscape(e.description)}`] : []),
    'STATUS:CONFIRMED',
    'TRANSP:OPAQUE',
    'END:VEVENT',
  ]
  // iCal richiede righe ≤75 caratteri con fold (75 char + CRLF + spazio)
  return lines.map(foldLine).join('\r\n')
}

/** Fold delle righe lunghe: RFC 5545 §3.1. */
function foldLine(line: string): string {
  if (line.length <= 75) return line
  const chunks: string[] = []
  chunks.push(line.slice(0, 75))
  let i = 75
  while (i < line.length) {
    chunks.push(' ' + line.slice(i, i + 74))
    i += 74
  }
  return chunks.join('\r\n')
}

// ─── Builder calendario ───────────────────────────────────────────────────────

export interface IcalCalendarOptions {
  prodId?: string
  calName: string
  calDescription?: string
  events: IcalEvent[]
}

/**
 * Genera una stringa iCal completa (VCALENDAR) pronta per essere servita
 * con Content-Type: text/calendar.
 */
export function buildCalendar(opts: IcalCalendarOptions): string {
  const prodId = opts.prodId ?? '-//Otium PMS//Gestionale v1.0//IT'
  const now = icalDateTime(new Date())

  const header = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    `PRODID:${prodId}`,
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${icalEscape(opts.calName)}`,
    ...(opts.calDescription ? [`X-WR-CALDESC:${icalEscape(opts.calDescription)}`] : []),
    'X-WR-TIMEZONE:Europe/Rome',
    `REFRESH-INTERVAL;VALUE=DURATION:PT4H`,
    `X-PUBLISHED-TTL:PT4H`,
  ].join('\r\n')

  const events = opts.events.map(buildVEvent).join('\r\n')

  const footer = 'END:VCALENDAR'

  return [header, events, footer].filter(Boolean).join('\r\n') + '\r\n'
}

// ─── Helper per prenotazioni Prisma → IcalEvent ───────────────────────────────

interface PrenotazioneLike {
  id: string
  dataArrivo: Date
  dataPartenza: Date | null
  stato: string
  createdAt: Date
  updatedAt: Date
}

/**
 * Converte una lista di prenotazioni in eventi iCal.
 * Non include dati personali dell'ospite per privacy.
 * Usa DTEND = dataPartenza + 1 giorno (convenzione iCal todo-giorno).
 */
export function prenotazioniToEvents(prenotazioni: PrenotazioneLike[]): IcalEvent[] {
  return prenotazioni
    .filter((p) => p.stato !== 'ANNULLATA' && p.stato !== 'NO_SHOW')
    .map((p) => {
      const arrivo = new Date(p.dataArrivo)
      // Se manca dataPartenza, blocchiamo solo il giorno di arrivo
      const partenzaBase = p.dataPartenza ? new Date(p.dataPartenza) : new Date(p.dataArrivo)
      // iCal DTEND per tutto-il-giorno è esclusivo: giorno dopo la partenza
      const dtend = new Date(partenzaBase)
      dtend.setDate(dtend.getDate() + 1)

      return {
        uid: `prenot-${p.id}`,
        summary: 'Occupato',
        dtstart: arrivo,
        dtend,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
      }
    })
}
