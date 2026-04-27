/**
 * lib/ical-generate.ts — generazione file .ics client-side per "Aggiungi al calendario".
 *
 * Implementa RFC 5545 minimal (VCALENDAR + VEVENT), abbastanza per Apple
 * Calendar / Google Calendar / Outlook. Niente recurrence, nessun timezone
 * VTIMEZONE — usiamo UTC con suffisso Z (interpretato correttamente da tutti
 * i calendar consumer mainstream).
 */

export interface IcsEvent {
  uid?: string                  // se omesso: random
  titolo: string                // SUMMARY
  inizio: Date
  fine?: Date                   // se omesso: stesso istante (event point-in-time)
  luogo?: string                // LOCATION
  descrizione?: string          // DESCRIPTION
  organizerEmail?: string       // ORGANIZER
  organizerNome?: string
  url?: string                  // URL clickable nel calendar
}

/**
 * Genera il contenuto di un file .ics. Stringa pronta per essere salvata.
 */
export function buildIcs(event: IcsEvent): string {
  const uid = event.uid ?? `${Date.now()}-${Math.random().toString(36).slice(2)}@otium`
  const now = new Date()
  const fine = event.fine ?? event.inizio

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Otium//Booking Engine//IT',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${formatUtc(now)}`,
    `DTSTART:${formatUtc(event.inizio)}`,
    `DTEND:${formatUtc(fine)}`,
    `SUMMARY:${escape(event.titolo)}`,
    event.luogo ? `LOCATION:${escape(event.luogo)}` : null,
    event.descrizione ? `DESCRIPTION:${escape(event.descrizione)}` : null,
    event.url ? `URL:${event.url}` : null,
    event.organizerEmail
      ? `ORGANIZER;CN=${escape(event.organizerNome ?? event.organizerEmail)}:mailto:${event.organizerEmail}`
      : null,
    'END:VEVENT',
    'END:VCALENDAR',
  ].filter(Boolean) as string[]

  // RFC 5545: linee terminate con CRLF
  return lines.join('\r\n')
}

/**
 * Triggera download del .ics nel browser. Gestisce il blob + click su <a>.
 * Solo client-side (usa document/window).
 */
export function downloadIcs(event: IcsEvent, filename = 'evento.ics'): void {
  if (typeof window === 'undefined') {
    throw new Error('downloadIcs e` solo client-side')
  }
  const ics = buildIcs(event)
  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename.endsWith('.ics') ? filename : `${filename}.ics`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  // Revoke dopo 2s (alcuni browser hanno bisogno di tenerlo attivo brevemente)
  setTimeout(() => URL.revokeObjectURL(url), 2000)
}

// ───────────────────────────────────────────────────────────────────────────
// Helpers
// ───────────────────────────────────────────────────────────────────────────

/** Formato UTC ICS: YYYYMMDDTHHMMSSZ */
function formatUtc(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return [
    d.getUTCFullYear(),
    pad(d.getUTCMonth() + 1),
    pad(d.getUTCDate()),
    'T',
    pad(d.getUTCHours()),
    pad(d.getUTCMinutes()),
    pad(d.getUTCSeconds()),
    'Z',
  ].join('')
}

/** Escape di caratteri speciali ICS: backslash, comma, semicolon, newline. */
function escape(s: string): string {
  return s
    .replace(/\\/g, '\\\\')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;')
    .replace(/\r?\n/g, '\\n')
}
