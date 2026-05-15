import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getHostId } from '@/lib/auth-middleware'
import { prisma } from '@/lib/db'
import { isModuloAttivo } from '@/lib/moduli'

export const dynamic = 'force-dynamic'

/**
 * GET /api/host/wifi/analytics
 *
 * Aggregazioni per dashboard analytics Wi-Fi.
 * Tutto cucinato server-side per minimizzare payload + carico client.
 *
 * Window: ultimi 30 giorni.
 *
 * Response:
 * {
 *   kpi: {
 *     liveSessions, loginToday, login30d, uniqueDevices30d,
 *     loginYesterday, deltaPct
 *   },
 *   loginsByDay: [{ date, count, codice, prenotazione, complimentary, ... }]
 *   authMix: [{ tipo, count }]
 *   topCodes: [{ codice, count, durataMinuti, usiMax, usiEffettuati }]
 *   recentSessions: [{ id, tipo, guest, mac, ip, startAt, expiresAt }]
 *   deviceStatus: { online, offline, pending }
 * }
 */
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const hostId = await getHostId()
  if (!hostId) return NextResponse.json({ error: 'no host' }, { status: 401 })

  const host = await prisma.host.findUnique({
    where: { id: hostId },
    select: { id: true, moduliAttivi: true },
  })
  if (!host) return NextResponse.json({ error: 'host not found' }, { status: 404 })
  if (!isModuloAttivo(host.moduliAttivi, 'wifi')) {
    return NextResponse.json({ error: 'modulo wifi disattivato' }, { status: 403 })
  }

  const now = new Date()
  const today0 = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
  const yesterday0 = new Date(today0); yesterday0.setUTCDate(yesterday0.getUTCDate() - 1)
  const thirtyDaysAgo = new Date(today0); thirtyDaysAgo.setUTCDate(thirtyDaysAgo.getUTCDate() - 30)

  // ─── KPI in parallelo ─────────────────────────────────────────────────
  const [
    liveSessions,
    loginToday,
    loginYesterday,
    login30d,
    uniqueDevicesRows,
    sessionsLast30d,
    topCodesRaw,
    recentSessions,
    devicesByStato,
  ] = await Promise.all([
    // Live: sessioni con expiresAt > now AND startAt < now AND revokedAt null
    prisma.wifiSession.count({
      where: { hostId, expiresAt: { gt: now }, startAt: { lte: now }, revokedAt: null },
    }),

    // Login today (startAt >= today00:00)
    prisma.wifiSession.count({
      where: { hostId, startAt: { gte: today0 } },
    }),

    // Login yesterday (>= yesterday00:00 AND < today00:00)
    prisma.wifiSession.count({
      where: { hostId, startAt: { gte: yesterday0, lt: today0 } },
    }),

    // Login last 30 days
    prisma.wifiSession.count({
      where: { hostId, startAt: { gte: thirtyDaysAgo } },
    }),

    // Unique macs in last 30 days
    prisma.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(DISTINCT "macClient") AS count
      FROM wifi_sessions
      WHERE "hostId" = ${hostId}
        AND "macClient" IS NOT NULL
        AND "startAt" >= ${thirtyDaysAgo}
    `,

    // Per il line chart: tutti gli startAt + tipo degli ultimi 30 giorni
    prisma.wifiSession.findMany({
      where: { hostId, startAt: { gte: thirtyDaysAgo } },
      select: { startAt: true, tipo: true },
      take: 10000,
    }),

    // Top 5 codici per uso
    prisma.wifiAccessCode.findMany({
      where: { hostId, revocatoAt: null },
      select: { codice: true, durataMinuti: true, usiMax: true, usiEffettuati: true, validoFino: true },
      orderBy: { usiEffettuati: 'desc' },
      take: 5,
    }),

    // Ultime 20 sessioni
    prisma.wifiSession.findMany({
      where: { hostId },
      select: {
        id: true, tipo: true, guestNome: true, guestCognome: true,
        macClient: true, ipClient: true, startAt: true, expiresAt: true, revokedAt: true,
      },
      orderBy: { startAt: 'desc' },
      take: 20,
    }),

    // Device per stato
    prisma.wifiDevice.groupBy({
      by: ['stato'],
      where: { hostId },
      _count: { _all: true },
    }),
  ])

  const uniqueDevices30d = Number(uniqueDevicesRows[0]?.count ?? 0)

  // ─── loginsByDay aggregation ──────────────────────────────────────────
  // Buckets per giorno: { date: 'YYYY-MM-DD', count, codice, prenotazione, ... }
  const dayBuckets = new Map<string, { codice: number; prenotazione: number; complimentary: number; userForm: number; emailOnly: number; total: number }>()

  // Init 30 days
  for (let i = 0; i <= 30; i++) {
    const d = new Date(thirtyDaysAgo); d.setUTCDate(d.getUTCDate() + i)
    const key = d.toISOString().slice(0, 10)
    dayBuckets.set(key, { codice: 0, prenotazione: 0, complimentary: 0, userForm: 0, emailOnly: 0, total: 0 })
  }

  for (const s of sessionsLast30d) {
    const key = s.startAt.toISOString().slice(0, 10)
    const bucket = dayBuckets.get(key)
    if (!bucket) continue
    bucket.total++
    switch (s.tipo) {
      case 'CODICE': bucket.codice++; break
      case 'PRENOTAZIONE': bucket.prenotazione++; break
      case 'COMPLIMENTARY': bucket.complimentary++; break
      case 'USER_FORM': bucket.userForm++; break
      case 'EMAIL_ONLY': bucket.emailOnly++; break
    }
  }

  const loginsByDay = Array.from(dayBuckets.entries())
    .map(([date, counts]) => ({ date, ...counts }))
    .sort((a, b) => a.date.localeCompare(b.date))

  // ─── Auth mix (donut) ─────────────────────────────────────────────────
  const authMixMap = new Map<string, number>()
  for (const s of sessionsLast30d) {
    authMixMap.set(s.tipo, (authMixMap.get(s.tipo) ?? 0) + 1)
  }
  const authMix = Array.from(authMixMap.entries())
    .map(([tipo, count]) => ({ tipo, count }))
    .sort((a, b) => b.count - a.count)

  // ─── Delta % giorno su giorno ─────────────────────────────────────────
  const deltaPct = loginYesterday > 0
    ? Math.round(((loginToday - loginYesterday) / loginYesterday) * 100)
    : (loginToday > 0 ? 100 : 0)

  // ─── Device status counters ───────────────────────────────────────────
  const deviceStatus = {
    online: devicesByStato.find(d => d.stato === 'ONLINE')?._count._all ?? 0,
    offline: devicesByStato.find(d => d.stato === 'OFFLINE')?._count._all ?? 0,
    pending: devicesByStato.find(d => d.stato === 'PENDING')?._count._all ?? 0,
    disabled: devicesByStato.find(d => d.stato === 'DISABLED')?._count._all ?? 0,
  }

  return NextResponse.json({
    generatedAt: now.toISOString(),
    kpi: {
      liveSessions,
      loginToday,
      loginYesterday,
      login30d,
      uniqueDevices30d,
      deltaPct,
    },
    loginsByDay,
    authMix,
    topCodes: topCodesRaw.map(c => ({
      codice: c.codice,
      durataMinuti: c.durataMinuti,
      usiMax: c.usiMax,
      usiEffettuati: c.usiEffettuati,
      validoFino: c.validoFino?.toISOString() ?? null,
    })),
    recentSessions: recentSessions.map(s => ({
      id: s.id,
      tipo: s.tipo,
      guest: [s.guestNome, s.guestCognome].filter(Boolean).join(' ') || 'Anonimo',
      mac: s.macClient,
      ip: s.ipClient,
      startAt: s.startAt.toISOString(),
      expiresAt: s.expiresAt.toISOString(),
      active: !s.revokedAt && s.expiresAt > now,
    })),
    deviceStatus,
  })
}
