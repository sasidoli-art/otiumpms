import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireHost, isUnauthorized } from '@/lib/auth-middleware'

/**
 * GET /api/host/gdpr/accessi-stats
 * Statistiche accessi ai dati personali ultimi 30 giorni per widget GDPR.
 */
export async function GET() {
  const auth = await requireHost()
  if (isUnauthorized(auth)) return auth
  const hostId = auth.user.hostId

  const trentaGiorniFa = new Date()
  trentaGiorniFa.setDate(trentaGiorniFa.getDate() - 30)

  const logs = await prisma.auditLog.findMany({
    where: {
      hostId,
      azione: { startsWith: 'dati_personali.' },
      createdAt: { gte: trentaGiorniFa },
    },
    select: { userId: true, userEmail: true, createdAt: true },
  })

  // Aggregate per operatore
  const byUser = new Map<string, { email: string; count: number }>()
  for (const l of logs) {
    if (!l.userId || !l.userEmail) continue
    const curr = byUser.get(l.userId) ?? { email: l.userEmail, count: 0 }
    curr.count++
    byUser.set(l.userId, curr)
  }
  const topOperatori = [...byUser.entries()]
    .map(([userId, v]) => ({ userId, email: v.email, count: v.count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 3)

  // Anomalie: operatori con > 100 accessi in un giorno
  const perDayPerUser = new Map<string, number>()
  for (const l of logs) {
    if (!l.userId) continue
    const giorno = l.createdAt.toISOString().slice(0, 10)
    const k = `${l.userId}|${giorno}`
    perDayPerUser.set(k, (perDayPerUser.get(k) ?? 0) + 1)
  }
  const anomalie = [...perDayPerUser.entries()]
    .filter(([, c]) => c > 100)
    .map(([k, c]) => {
      const [userId, giorno] = k.split('|')
      const email = byUser.get(userId)?.email ?? ''
      return { userId, email, giorno, count: c }
    })

  return NextResponse.json({
    totaleAccessi: logs.length,
    totaleOperatori: byUser.size,
    topOperatori,
    anomalie,
    periodoGiorni: 30,
  })
}
