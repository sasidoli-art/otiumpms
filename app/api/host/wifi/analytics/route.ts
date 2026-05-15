import { NextRequest, NextResponse } from 'next/server'
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
 *     liveSessions, loginToday, loginRange, uniqueDevices30d,
 *     loginYesterday, deltaPct
 *   },
 *   loginsByDay: [{ date, count, codice, prenotazione, complimentary, ... }]
 *   authMix: [{ tipo, count }]
 *   topCodes: [{ codice, count, durataMinuti, usiMax, usiEffettuati }]
 *   recentSessions: [{ id, tipo, guest, mac, ip, startAt, expiresAt }]
 *   deviceStatus: { online, offline, pending }
 * }
 */
export async function GET(req: NextRequest) {
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

  // Range param: 7|30|90 giorni (default 30)
  const rangeParam = Number(req.nextUrl.searchParams.get('range') ?? 30)
  const range = [7, 30, 90].includes(rangeParam) ? rangeParam : 30

  const now = new Date()
  const today0 = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
  const yesterday0 = new Date(today0); yesterday0.setUTCDate(yesterday0.getUTCDate() - 1)
  const rangeStart = new Date(today0); rangeStart.setUTCDate(rangeStart.getUTCDate() - range)

  // ─── KPI in parallelo ─────────────────────────────────────────────────
  const [
    liveSessions,
    loginToday,
    loginYesterday,
    loginRange,
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
      where: { hostId, startAt: { gte: rangeStart } },
    }),

    // Unique macs in last 30 days
    prisma.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(DISTINCT "macClient") AS count
      FROM wifi_sessions
      WHERE "hostId" = ${hostId}
        AND "macClient" IS NOT NULL
        AND "startAt" >= ${rangeStart}
    `,

    // Per il line chart: tutti gli startAt + tipo + durata + userAgent del range
    prisma.wifiSession.findMany({
      where: { hostId, startAt: { gte: rangeStart } },
      select: { startAt: true, expiresAt: true, revokedAt: true, tipo: true, userAgent: true },
      take: 20000,
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

  const uniqueDevicesRange = Number(uniqueDevicesRows[0]?.count ?? 0)

  // ─── loginsByDay aggregation ──────────────────────────────────────────
  // Buckets per giorno: { date: 'YYYY-MM-DD', count, codice, prenotazione, ... }
  const dayBuckets = new Map<string, { codice: number; prenotazione: number; complimentary: number; userForm: number; emailOnly: number; total: number }>()

  // Init range days
  for (let i = 0; i <= range; i++) {
    const d = new Date(rangeStart); d.setUTCDate(d.getUTCDate() + i)
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

  // ─── Durata media sessione (in minuti) ────────────────────────────────
  // Considera solo sessioni terminate (revoked OR expired)
  let totalDurationMin = 0
  let sessionsWithDuration = 0
  for (const s of sessionsLast30d) {
    const endAt = s.revokedAt ?? s.expiresAt
    if (endAt && endAt < now) {
      const duration = (endAt.getTime() - s.startAt.getTime()) / 60_000
      if (duration > 0 && duration < 24 * 60 * 30) { // skip outliers >30 giorni
        totalDurationMin += duration
        sessionsWithDuration++
      }
    }
  }
  const durataMediaMin = sessionsWithDuration > 0
    ? Math.round(totalDurationMin / sessionsWithDuration)
    : 0

  // ─── Heatmap orari (giorno settimana × ora del giorno) ───────────────
  // Output: 7 × 24 = 168 buckets, ognuno con conteggio
  const heatmap: { dow: number; hour: number; count: number }[] = []
  const heatBuckets = new Map<string, number>()
  for (let dow = 0; dow < 7; dow++) {
    for (let h = 0; h < 24; h++) heatBuckets.set(`${dow}-${h}`, 0)
  }
  for (const s of sessionsLast30d) {
    const d = s.startAt
    const dow = d.getDay()  // 0=Sun, 1=Mon, ..., 6=Sat
    const hour = d.getHours()
    const key = `${dow}-${hour}`
    heatBuckets.set(key, (heatBuckets.get(key) ?? 0) + 1)
  }
  for (const [key, count] of heatBuckets) {
    const [dow, hour] = key.split('-').map(Number)
    heatmap.push({ dow, hour, count })
  }

  // ─── Top user-agents / OS rilevati ────────────────────────────────────
  const uaMap = new Map<string, number>()
  for (const s of sessionsLast30d) {
    if (!s.userAgent) continue
    const os = detectOS(s.userAgent)
    uaMap.set(os, (uaMap.get(os) ?? 0) + 1)
  }
  const topUserAgents = Array.from(uaMap.entries())
    .map(([os, count]) => ({ os, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8)

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
    range,
    kpi: {
      liveSessions,
      loginToday,
      loginYesterday,
      loginRange: loginRange,
      uniqueDevicesRange,
      durataMediaMin,
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
    heatmap,
    topUserAgents,
  })
}

/** Detect OS family da User-Agent (semplificato, no full UA parser) */
function detectOS(ua: string): string {
  const u = ua.toLowerCase()
  if (u.includes('iphone') || u.includes('ipad')) return 'iOS'
  if (u.includes('android')) return 'Android'
  if (u.includes('windows')) return 'Windows'
  if (u.includes('mac os') || u.includes('macintosh')) return 'macOS'
  if (u.includes('linux')) return 'Linux'
  if (u.includes('cros')) return 'ChromeOS'
  return 'Altro'
}
