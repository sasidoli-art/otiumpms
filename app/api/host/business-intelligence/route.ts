import { NextRequest, NextResponse } from 'next/server'
import { requireHost, isUnauthorized } from '@/lib/auth-middleware'
import { auditFromAuth } from '@/lib/audit'
import { prisma } from '@/lib/db'

// ─── GET /api/host/business-intelligence ─────────────────────────────────────

export async function GET(req: NextRequest) {
  const auth = await requireHost()
  if (isUnauthorized(auth)) return auth

  const hostId = auth.user.hostId
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  // Date ranges
  const d30 = new Date(today); d30.setDate(d30.getDate() + 30)
  const d60 = new Date(today); d60.setDate(d60.getDate() + 60)
  const d90 = new Date(today); d90.setDate(d90.getDate() + 90)

  // Year-over-year: same period last year
  const yearAgoStart = new Date(today)
  yearAgoStart.setFullYear(yearAgoStart.getFullYear() - 1)
  yearAgoStart.setMonth(0, 1)
  const yearAgoEnd = new Date(today)
  yearAgoEnd.setFullYear(yearAgoEnd.getFullYear() - 1)
  yearAgoEnd.setMonth(11, 31)

  const thisYearStart = new Date(today.getFullYear(), 0, 1)

  // Fetch all confirmed/completed bookings for this host
  const [bookings, bookingsLastYear, strutture] = await Promise.all([
    prisma.prenotazione.findMany({
      where: {
        hostId,
        stato: { in: ['CONFERMATA', 'COMPLETATA'] },
      },
      select: {
        id: true,
        dataArrivo: true,
        dataPartenza: true,
        prezzoTotale: true,
        numOspiti: true,
        stato: true,
        fonte: true,
        unitaId: true,
        unita: { select: { nome: true } },
        createdAt: true,
      },
    }),
    prisma.prenotazione.findMany({
      where: {
        hostId,
        stato: { in: ['CONFERMATA', 'COMPLETATA'] },
        dataArrivo: { gte: yearAgoStart, lte: yearAgoEnd },
      },
      select: {
        dataArrivo: true,
        dataPartenza: true,
        prezzoTotale: true,
      },
    }),
    prisma.struttura.findMany({
      where: { hostId, attiva: true },
      select: {
        id: true,
        nome: true,
        capacitaTotale: true,
        unita: { select: { id: true, nome: true }, where: { attiva: true } },
      },
    }),
  ])

  // Also fetch cancellations for cancellation rate
  const cancellations = await prisma.prenotazione.findMany({
    where: {
      hostId,
      stato: 'ANNULLATA',
      createdAt: { gte: new Date(today.getFullYear(), today.getMonth() - 11, 1) },
    },
    select: { createdAt: true },
  })

  const allBookingsForRate = await prisma.prenotazione.count({
    where: {
      hostId,
      createdAt: { gte: new Date(today.getFullYear(), today.getMonth() - 11, 1) },
    },
  })

  const totalUnits = strutture.reduce((s, st) => s + st.unita.length, 0) || 1

  // ─── Revenue Forecast (next 30/60/90 days) ────────────────────────────────

  function forecastRevenue(endDate: Date) {
    return bookings
      .filter(b => b.dataArrivo >= today && b.dataArrivo <= endDate)
      .reduce((s, b) => s + (b.prezzoTotale ?? 0), 0)
  }

  const forecast30 = forecastRevenue(d30)
  const forecast60 = forecastRevenue(d60)
  const forecast90 = forecastRevenue(d90)

  // ─── Occupancy Forecast (next 30 days, day by day) ─────────────────────────

  const occupancyForecast: { data: string; occupancy: number }[] = []
  for (let i = 0; i < 30; i++) {
    const day = new Date(today)
    day.setDate(day.getDate() + i)
    const dayEnd = new Date(day)
    dayEnd.setDate(dayEnd.getDate() + 1)

    const occupied = bookings.filter(b => {
      const arrivo = new Date(b.dataArrivo)
      const partenza = b.dataPartenza ? new Date(b.dataPartenza) : new Date(arrivo.getTime() + 86400000)
      return arrivo < dayEnd && partenza > day
    }).length

    occupancyForecast.push({
      data: day.toISOString().split('T')[0],
      occupancy: Math.round((occupied / totalUnits) * 100),
    })
  }

  // ─── RevPAR & ADR Trend (last 12 months) ──────────────────────────────────

  const revparTrend: { mese: string; revpar: number; adr: number }[] = []
  for (let m = 11; m >= 0; m--) {
    const monthStart = new Date(today.getFullYear(), today.getMonth() - m, 1)
    const monthEnd = new Date(today.getFullYear(), today.getMonth() - m + 1, 0)
    const daysInMonth = monthEnd.getDate()

    const monthBookings = bookings.filter(b => {
      const arr = new Date(b.dataArrivo)
      return arr >= monthStart && arr <= monthEnd
    })

    const revenue = monthBookings.reduce((s, b) => s + (b.prezzoTotale ?? 0), 0)
    const roomNights = monthBookings.length || 1

    revparTrend.push({
      mese: monthStart.toLocaleDateString('it-IT', { month: 'short', year: '2-digit' }),
      revpar: Math.round((revenue / (totalUnits * daysInMonth)) * 100) / 100,
      adr: Math.round((revenue / roomNights) * 100) / 100,
    })
  }

  // ─── Cancellation Rate Trend (last 12 months) ─────────────────────────────

  const cancellationRate = allBookingsForRate > 0
    ? Math.round((cancellations.length / allBookingsForRate) * 10000) / 100
    : 0

  // ─── Revenue by Source ─────────────────────────────────────────────────────

  const sourceMap: Record<string, number> = {}
  bookings
    .filter(b => b.dataArrivo >= thisYearStart)
    .forEach(b => {
      const src = b.fonte || 'Diretto'
      sourceMap[src] = (sourceMap[src] ?? 0) + (b.prezzoTotale ?? 0)
    })

  const revenueBySource = Object.entries(sourceMap).map(([fonte, revenue]) => ({
    fonte,
    revenue: Math.round(revenue * 100) / 100,
  }))

  // ─── Best Performing Room Type ─────────────────────────────────────────────

  const roomTypeMap: Record<string, { nome: string; revenue: number; bookings: number }> = {}
  bookings.forEach(b => {
    const key = b.unita?.nome || 'N/A'
    if (!roomTypeMap[key]) roomTypeMap[key] = { nome: key, revenue: 0, bookings: 0 }
    roomTypeMap[key].revenue += b.prezzoTotale ?? 0
    roomTypeMap[key].bookings += 1
  })

  const topRoomTypes = Object.values(roomTypeMap)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5)
    .map(r => ({ ...r, revenue: Math.round(r.revenue * 100) / 100 }))

  // ─── Average Length of Stay ────────────────────────────────────────────────

  const stays = bookings
    .filter(b => b.dataPartenza)
    .map(b => {
      const arr = new Date(b.dataArrivo).getTime()
      const dep = new Date(b.dataPartenza!).getTime()
      return Math.max(1, Math.round((dep - arr) / 86400000))
    })

  const avgLOS = stays.length > 0
    ? Math.round((stays.reduce((s, v) => s + v, 0) / stays.length) * 10) / 10
    : 0

  // ─── Year-over-Year Comparison (monthly) ───────────────────────────────────

  const yoyComparison: { mese: string; annoCorrente: number; annoPrecedente: number }[] = []
  for (let m = 0; m < 12; m++) {
    const mStart = new Date(today.getFullYear(), m, 1)
    const mEnd = new Date(today.getFullYear(), m + 1, 0)

    const currentRev = bookings
      .filter(b => {
        const arr = new Date(b.dataArrivo)
        return arr >= mStart && arr <= mEnd
      })
      .reduce((s, b) => s + (b.prezzoTotale ?? 0), 0)

    const prevMStart = new Date(today.getFullYear() - 1, m, 1)
    const prevMEnd = new Date(today.getFullYear() - 1, m + 1, 0)

    const prevRev = bookingsLastYear
      .filter(b => {
        const arr = new Date(b.dataArrivo)
        return arr >= prevMStart && arr <= prevMEnd
      })
      .reduce((s, b) => s + (b.prezzoTotale ?? 0), 0)

    yoyComparison.push({
      mese: mStart.toLocaleDateString('it-IT', { month: 'short' }),
      annoCorrente: Math.round(currentRev * 100) / 100,
      annoPrecedente: Math.round(prevRev * 100) / 100,
    })
  }

  // ─── Current month RevPAR ──────────────────────────────────────────────────

  const currentMonthStart = new Date(today.getFullYear(), today.getMonth(), 1)
  const currentMonthDays = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate()
  const currentMonthRev = bookings
    .filter(b => new Date(b.dataArrivo) >= currentMonthStart && new Date(b.dataArrivo) <= today)
    .reduce((s, b) => s + (b.prezzoTotale ?? 0), 0)

  const currentRevPAR = Math.round((currentMonthRev / (totalUnits * currentMonthDays)) * 100) / 100

  return NextResponse.json({
    forecast: { forecast30, forecast60, forecast90 },
    occupancyForecast,
    revparTrend,
    currentRevPAR,
    cancellationRate,
    revenueBySource,
    topRoomTypes,
    avgLOS,
    yoyComparison,
  })
}
