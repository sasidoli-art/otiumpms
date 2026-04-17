import { NextResponse } from 'next/server'
import { requireHost, isUnauthorized } from '@/lib/auth-middleware'
import { prisma } from '@/lib/db'
import { parseModuli } from '@/lib/moduli'

/**
 * GET /api/host/sidebar-badges
 *
 * Returns badge counts for the host sidebar in a single response.
 * Each count maps to a specific badge in the sidebar config.
 * Modules that are not active return 0 without hitting the DB.
 *
 * Polled by the client every 60s; cached server-side for 30s.
 */
export async function GET() {
  const auth = await requireHost()
  if (isUnauthorized(auth)) return auth

  const hostId = auth.user.hostId

  // Fetch host moduliAttivi to conditionally skip queries
  const host = await prisma.host.findUnique({
    where: { id: hostId },
    select: { moduliAttivi: true },
  })
  const moduli = parseModuli(host?.moduliAttivi)

  // Today boundaries in Europe/Rome timezone
  const now = new Date()
  const rome = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Rome',
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(now) // "2026-04-17"
  const inizioGiornata = new Date(`${rome}T00:00:00+02:00`)
  const fineGiornata = new Date(`${rome}T23:59:59.999+02:00`)

  // ── Build parallel queries (skip inactive modules) ────────────────────

  const [
    prenotazioniNuove,
    arriviOggi,
    partenzeOggi,
    taskHKAperti,
    manutenzioneAperta,
    messaggiNonLetti,
    notificheNonLette,
    spaAppuntamentiOggi,
    ticketAperti,
  ] = await Promise.all([

    // 1. Prenotazioni in stato RICHIESTA (sempre attivo — modulo base)
    prisma.prenotazione.count({
      where: { hostId, stato: 'RICHIESTA' },
    }),

    // 2. Arrivi oggi — CONFERMATA con dataArrivo = oggi
    prisma.prenotazione.count({
      where: {
        hostId,
        stato: 'CONFERMATA',
        dataArrivo: { gte: inizioGiornata, lte: fineGiornata },
      },
    }),

    // 3. Partenze oggi — (CONFERMATA o CHECKIN) con dataPartenza = oggi
    prisma.prenotazione.count({
      where: {
        hostId,
        stato: { in: ['CONFERMATA', 'COMPLETATA'] },
        dataPartenza: { gte: inizioGiornata, lte: fineGiornata },
      },
    }),

    // 4. Task HK aperti (non completati, scadenza <= oggi)
    moduli.housekeeping
      ? prisma.taskHK.count({
          where: {
            hostId,
            completato: false,
            dataScadenza: { lte: fineGiornata },
          },
        })
      : Promise.resolve(0),

    // 5. Manutenzione aperta
    moduli.manutenzione
      ? prisma.segnalazioneManutenzione.count({
          where: {
            hostId,
            stato: { in: ['APERTA', 'IN_LAVORAZIONE'] },
          },
        })
      : Promise.resolve(0),

    // 6. Messaggi non letti (guest → host)
    prisma.messaggio.count({
      where: {
        chat: { hostId },
        mittente: 'GUEST',
        letto: false,
      },
    }),

    // 7. Notifiche non lette
    prisma.notifica.count({
      where: { hostId, letta: false },
    }),

    // 8. Appuntamenti SPA oggi
    moduli.spa
      ? prisma.appuntamentoSpa.count({
          where: {
            hostId,
            stato: { in: ['PRENOTATO', 'CONFERMATO'] },
            dataOra: { gte: inizioGiornata, lte: fineGiornata },
          },
        })
      : Promise.resolve(0),

    // 9. Ticket aperti
    prisma.ticket.count({
      where: {
        hostId,
        stato: { in: ['APERTO', 'IN_LAVORAZIONE'] },
      },
    }),
  ])

  const body = {
    prenotazioniNuove,
    arriviOggi,
    partenzeOggi,
    taskHKAperti,
    manutenzioneAperta,
    messaggiNonLetti,
    notificheNonLette,
    spaAppuntamentiOggi,
    ticketAperti,
  }

  return NextResponse.json(body, {
    headers: {
      'Cache-Control': 'private, max-age=30',
    },
  })
}
