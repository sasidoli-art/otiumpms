import { describe, test, expect } from 'vitest'
import { buildIcs } from '@/lib/ical-generate'

describe('ical-generate — buildIcs', () => {
  test('struttura minima: VCALENDAR + VEVENT con SUMMARY/DTSTART/DTEND', () => {
    const ics = buildIcs({
      uid: 'fixed-uid@otium',
      titolo: 'Massaggio svedese',
      inizio: new Date(Date.UTC(2026, 4, 15, 10, 0, 0)),
      fine: new Date(Date.UTC(2026, 4, 15, 10, 50, 0)),
    })
    expect(ics).toContain('BEGIN:VCALENDAR')
    expect(ics).toContain('VERSION:2.0')
    expect(ics).toContain('BEGIN:VEVENT')
    expect(ics).toContain('UID:fixed-uid@otium')
    expect(ics).toContain('SUMMARY:Massaggio svedese')
    expect(ics).toContain('DTSTART:20260515T100000Z')
    expect(ics).toContain('DTEND:20260515T105000Z')
    expect(ics).toContain('END:VEVENT')
    expect(ics).toContain('END:VCALENDAR')
  })

  test('linee terminate con CRLF (RFC 5545)', () => {
    const ics = buildIcs({
      titolo: 'Test',
      inizio: new Date(Date.UTC(2026, 0, 1)),
    })
    expect(ics).toMatch(/\r\n/)
    // Almeno N righe
    expect(ics.split('\r\n').length).toBeGreaterThan(5)
  })

  test('campi opzionali presenti se forniti', () => {
    const ics = buildIcs({
      titolo: 'Cena',
      inizio: new Date(Date.UTC(2026, 5, 20, 19, 30)),
      fine: new Date(Date.UTC(2026, 5, 20, 22, 0)),
      luogo: 'Hotel Otium, Roma',
      descrizione: 'Tavolo per 2',
      url: 'https://otiumweek.com/book/abc',
      organizerEmail: 'info@otium.it',
      organizerNome: 'Hotel Otium',
    })
    expect(ics).toContain('LOCATION:Hotel Otium\\, Roma') // virgola escapata
    expect(ics).toContain('DESCRIPTION:Tavolo per 2')
    expect(ics).toContain('URL:https://otiumweek.com/book/abc')
    expect(ics).toContain('ORGANIZER;CN=Hotel Otium:mailto:info@otium.it')
  })

  test('campi opzionali assenti se non forniti', () => {
    const ics = buildIcs({
      titolo: 'X',
      inizio: new Date(Date.UTC(2026, 0, 1)),
    })
    expect(ics).not.toContain('LOCATION:')
    expect(ics).not.toContain('DESCRIPTION:')
    expect(ics).not.toContain('URL:')
    expect(ics).not.toContain('ORGANIZER')
  })

  test('escape di virgola, semicolon, backslash, newline', () => {
    const ics = buildIcs({
      titolo: 'Ev,ent;test\\path',
      inizio: new Date(Date.UTC(2026, 0, 1)),
      descrizione: 'Linea 1\nLinea 2',
    })
    expect(ics).toContain('SUMMARY:Ev\\,ent\\;test\\\\path')
    expect(ics).toContain('DESCRIPTION:Linea 1\\nLinea 2')
  })

  test('UID auto-generato se omesso (suffix @otium)', () => {
    const ics = buildIcs({
      titolo: 'X',
      inizio: new Date(Date.UTC(2026, 0, 1)),
    })
    const uidLine = ics.split('\r\n').find((l) => l.startsWith('UID:'))
    expect(uidLine).toBeDefined()
    expect(uidLine).toMatch(/^UID:.+@otium$/)
  })

  test('fine = inizio se omessa (point-in-time event)', () => {
    const ics = buildIcs({
      titolo: 'X',
      inizio: new Date(Date.UTC(2026, 5, 15, 14, 30)),
    })
    expect(ics).toContain('DTSTART:20260615T143000Z')
    expect(ics).toContain('DTEND:20260615T143000Z')
  })

  test('zero-pad mese, giorno, ora, min, sec', () => {
    const ics = buildIcs({
      titolo: 'X',
      inizio: new Date(Date.UTC(2026, 0, 5, 9, 5, 7)),
    })
    expect(ics).toContain('DTSTART:20260105T090507Z')
  })
})
