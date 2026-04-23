import { NextResponse } from 'next/server'
import { requireSuperAdmin, isUnauthorized } from '@/lib/auth-middleware'
import { prisma } from '@/lib/db'
import { subDays, subMinutes } from 'date-fns'

/**
 * GET /api/superadmin/metrics
 *
 * Metriche real-time piattaforma: host, prenotazioni, check-in, SPA, email.
 * Include errori recenti dal AuditLog arricchiti con nome host.
 */
export async function GET() {
  const auth = await requireSuperAdmin()
  if (isUnauthorized(auth)) return auth

  const oggi = new Date()
  oggi.setHours(0, 0, 0, 0)
  const domani = new Date(oggi)
  domani.setDate(domani.getDate() + 1)
  const ora60fa = subMinutes(new Date(), 60)
  const ieri = subDays(new Date(), 1)

  const [
    hostTotali, hostAttivi, hostInProva, hostScaduti,
    prenotazioniOggi, checkinOggi, appuntamentiSpaOggi,
    emailOkOggi, emailFalliteOggi,
    apiCalls60m,
    erroriRaw,
  ] = await Promise.all([
    prisma.host.count(),
    prisma.host.count({ where: { statoAbbonamento: 'ATTIVO' } }),
    prisma.host.count({ where: { statoAbbonamento: 'IN_PROVA' } }),
    prisma.host.count({ where: { statoAbbonamento: 'SCADUTO' } }),
    prisma.prenotazione.count({
      where: { createdAt: { gte: oggi, lt: domani } },
    }),
    prisma.prenotazione.count({
      where: {
        statoCheckIn: { in: ['ONLINE_COMPLETATO', 'VERIFICATO'] },
        updatedAt: { gte: oggi, lt: domani },
      },
    }),
    prisma.appuntamentoSpa.count({
      where: { dataOra: { gte: oggi, lt: domani } },
    }),
    prisma.auditLog.count({
      where: { azione: 'email.inviata', createdAt: { gte: oggi } },
    }),
    prisma.auditLog.count({
      where: { azione: 'email.fallita', createdAt: { gte: oggi } },
    }),
    prisma.auditLog.count({
      where: { createdAt: { gte: ora60fa } },
    }),
    prisma.auditLog.findMany({
      where: {
        azione: { contains: '.fallit' },
        createdAt: { gte: ieri },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: {
        id: true, azione: true, dettagli: true, hostId: true, createdAt: true,
      },
    }),
  ])

  // Arricchisci errori con hostNome
  const hostIds = Array.from(new Set(erroriRaw.map((e) => e.hostId).filter((id): id is string => !!id)))
  const hostMap = hostIds.length > 0
    ? await prisma.host.findMany({
        where: { id: { in: hostIds } },
        select: { id: true, nomeAzienda: true },
      }).then((rows) => new Map(rows.map((r) => [r.id, r.nomeAzienda])))
    : new Map<string, string>()

  // Conta errori per host (per flag problema ricorrente)
  const erroriPerHost: Record<string, number> = {}
  erroriRaw.forEach((e) => {
    if (e.hostId) erroriPerHost[e.hostId] = (erroriPerHost[e.hostId] ?? 0) + 1
  })

  const erroriRecenti = erroriRaw.map((e) => ({
    id: e.id,
    azione: e.azione,
    dettagli: e.dettagli,
    hostId: e.hostId,
    hostNome: e.hostId ? hostMap.get(e.hostId) ?? null : null,
    createdAt: e.createdAt.toISOString(),
  }))

  return NextResponse.json({
    hostTotali, hostAttivi, hostInProva, hostScaduti,
    prenotazioniOggi,
    checkinOggi,
    appuntamentiSpaOggi,
    emailOggi: { ok: emailOkOggi, fallite: emailFalliteOggi },
    apiCalls60m,
    erroriRecenti,
    erroriPerHost,
  })
}
