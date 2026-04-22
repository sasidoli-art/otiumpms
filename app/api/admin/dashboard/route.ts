import { NextResponse } from 'next/server'
import { requireAdmin, isUnauthorized } from '@/lib/auth-middleware'
import { prisma } from '@/lib/db'
import { PLAN_DEFINITIONS } from '@/lib/billing'
import type { PianoTipo } from '@prisma/client'

/**
 * GET /api/admin/dashboard
 *
 * Dashboard platform-level per ADMIN (operatore Otium che gestisce host clienti).
 *
 * Ritorna:
 *   - KPI bar (host totali / attivi / MRR / churn)
 *   - Serie temporale MRR + host attivi (12 mesi)
 *   - Ultimi 10 host registrati
 *   - Contatori azioni richieste (onboarding incompleti > 7gg, abbonamenti in scadenza, ticket aperti)
 *   - Feed attivita` recente (ultimi 20 eventi aggregati)
 *
 * Parallelizza tutte le query con Promise.all. Cache 60s.
 */
export async function GET() {
  const auth = await requireAdmin()
  if (isUnauthorized(auth)) return auth

  const now = new Date()
  const trentaGgFa = new Date(now.getTime() - 30 * 86400000)
  const setteGgFa = new Date(now.getTime() - 7 * 86400000)
  const setteGgAvanti = new Date(now.getTime() + 7 * 86400000)
  const inizioMese = new Date(now.getFullYear(), now.getMonth(), 1)

  // Per churn: host attivi all'inizio del mese scorso
  const inizioMeseScorso = new Date(now.getFullYear(), now.getMonth() - 1, 1)

  const [
    hostTotali,
    hostNuoviQuestoMese,
    hostAttiviRecent,
    hostAttiviInizioMeseScorso,
    hostCancellatiUltimi30gg,
    hostTutti,
    ultimiHost,
    onboardingIncompleti,
    abbonamentiInScadenza,
    ticketAperti,
    auditFeed,
  ] = await Promise.all([
    // 1. Host totali
    prisma.host.count(),

    // 2. Host nuovi questo mese
    prisma.host.count({ where: { createdAt: { gte: inizioMese } } }),

    // 3. Host attivi = con almeno 1 prenotazione negli ultimi 30gg
    prisma.host.count({
      where: {
        prenotazioni: { some: { createdAt: { gte: trentaGgFa } } },
      },
    }),

    // 4. Host attivi all'inizio del mese scorso (per churn denominatore)
    prisma.host.count({
      where: {
        statoAbbonamento: 'ATTIVO',
        createdAt: { lt: inizioMeseScorso },
      },
    }),

    // 5. Host "churned" = statoAbbonamento SCADUTO o SOSPESO aggiornati ultimi 30gg
    prisma.host.count({
      where: {
        statoAbbonamento: { in: ['SCADUTO', 'SOSPESO'] },
        updatedAt: { gte: trentaGgFa },
      },
    }),

    // 6. Tutti gli host con piano (per MRR) — solo ATTIVO e IN_PROVA contano? usiamo ATTIVO
    prisma.host.findMany({
      where: { statoAbbonamento: 'ATTIVO' },
      select: { piano: true, createdAt: true, dataInizioAbb: true, dataFineAbb: true },
    }),

    // 7. Ultimi 10 host registrati
    prisma.host.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, nomeAzienda: true, piano: true, statoAbbonamento: true,
        createdAt: true, onboardingCompletato: true, onboardingStep: true,
        user: { select: { email: true, nome: true, cognome: true } },
      },
    }),

    // 8. Onboarding incompleti da piu` di 7gg
    prisma.host.count({
      where: {
        onboardingCompletato: false,
        createdAt: { lt: setteGgFa },
      },
    }),

    // 9. Abbonamenti in scadenza nei prossimi 7gg
    prisma.host.count({
      where: {
        statoAbbonamento: 'ATTIVO',
        dataFineAbb: { gte: now, lte: setteGgAvanti },
      },
    }),

    // 10. Ticket supporto aperti
    prisma.ticket.count({
      where: { stato: { in: ['APERTO', 'IN_LAVORAZIONE', 'IN_ATTESA_RISPOSTA'] } },
    }),

    // 11. Feed attivita` recente — ultimi 20 eventi rilevanti dal AuditLog
    prisma.auditLog.findMany({
      where: {
        azione: {
          in: [
            'host.signup',
            'onboarding.completato',
            'abbonamento.attivato',
            'abbonamento.cancellato',
            'modulo.attivato',
            'modulo.disattivato',
            'ticket.creato',
            'pagamento.riuscito',
            'pagamento.online.riuscito',
          ],
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: {
        id: true, azione: true, entita: true, entitaId: true,
        hostId: true, userEmail: true, dettagli: true, createdAt: true,
      },
    }),
  ])

  // ─── MRR calcolato somma prezzoMensile dei piani ATTIVO ──────────────────
  const mrr = hostTutti.reduce((acc, h) => {
    const plan = PLAN_DEFINITIONS[h.piano as PianoTipo]
    // EVENTO_SINGOLO = una tantum, non lo contiamo nel MRR
    if (!plan || h.piano === 'EVENTO_SINGOLO') return acc
    return acc + (plan.prezzoMensile ?? 0)
  }, 0)

  // ─── Churn: cancellati/churned ultimi 30gg / host ATTIVI inizio mese scorso ──
  const churn = hostAttiviInizioMeseScorso > 0
    ? Math.round((hostCancellatiUltimi30gg / hostAttiviInizioMeseScorso) * 1000) / 10
    : 0

  // ─── Serie temporale MRR + host attivi (12 mesi) ────────────────────────────
  // Strategy: per ogni mese degli ultimi 12, conta host con abbonamento attivo
  // in quel mese (createdAt <= fine_mese AND (dataFineAbb == null OR dataFineAbb > inizio_mese))
  const mesi = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (11 - i), 1)
    return {
      inizio: new Date(d.getFullYear(), d.getMonth(), 1),
      fine: new Date(d.getFullYear(), d.getMonth() + 1, 1),
      label: d.toLocaleDateString('it-IT', { month: 'short', year: '2-digit' }),
    }
  })

  const serieMensile = await Promise.all(
    mesi.map(async (m) => {
      const hostAttiviMese = await prisma.host.findMany({
        where: {
          statoAbbonamento: 'ATTIVO',
          createdAt: { lte: m.fine },
          OR: [
            { dataFineAbb: null },
            { dataFineAbb: { gte: m.inizio } },
          ],
        },
        select: { piano: true },
      })
      const mrrMese = hostAttiviMese.reduce((acc, h) => {
        const plan = PLAN_DEFINITIONS[h.piano as PianoTipo]
        if (!plan || h.piano === 'EVENTO_SINGOLO') return acc
        return acc + (plan.prezzoMensile ?? 0)
      }, 0)
      return {
        mese: m.label,
        mrr: Math.round(mrrMese * 100) / 100,
        hostAttivi: hostAttiviMese.length,
      }
    }),
  )

  // ─── Feed attivita` arricchito con nome host ────────────────────────────────
  const hostIdsInFeed = Array.from(
    new Set(auditFeed.map((a) => a.hostId).filter((id): id is string => !!id)),
  )
  const hostMap = hostIdsInFeed.length > 0
    ? await prisma.host.findMany({
        where: { id: { in: hostIdsInFeed } },
        select: { id: true, nomeAzienda: true },
      }).then((rows) => new Map(rows.map((r) => [r.id, r.nomeAzienda])))
    : new Map<string, string>()

  const feed = auditFeed.map((a) => ({
    id: a.id,
    azione: a.azione,
    entita: a.entita,
    entitaId: a.entitaId,
    dettagli: a.dettagli,
    createdAt: a.createdAt.toISOString(),
    hostNome: a.hostId ? hostMap.get(a.hostId) ?? null : null,
    attore: a.userEmail,
  }))

  const payload = {
    kpi: {
      hostTotali,
      hostNuoviQuestoMese,
      hostAttivi: hostAttiviRecent,
      mrr: Math.round(mrr * 100) / 100,
      churn,
      mesePrecedenteAttivi: hostAttiviInizioMeseScorso,
      cancellatiUltimi30gg: hostCancellatiUltimi30gg,
    },
    serieMensile,
    ultimiHost: ultimiHost.map((h) => ({
      id: h.id,
      nomeAzienda: h.nomeAzienda,
      email: h.user.email,
      userNome: `${h.user.nome} ${h.user.cognome}`.trim(),
      piano: h.piano,
      statoAbbonamento: h.statoAbbonamento,
      createdAt: h.createdAt.toISOString(),
      onboardingCompletato: h.onboardingCompletato,
      onboardingStep: h.onboardingStep,
    })),
    azioniRichieste: {
      onboardingIncompleti,
      abbonamentiInScadenza,
      ticketAperti,
    },
    feed,
  }

  return NextResponse.json(payload, {
    headers: { 'Cache-Control': 'private, max-age=60' },
  })
}
