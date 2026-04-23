import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireHostOrAdmin, isUnauthorized } from '@/lib/auth-middleware'

/**
 * GET /api/host/manutenzione/stats
 *
 * KPI manutenzione host:
 *   - aperte / inLavorazione / risolteUltimi30gg
 *   - aperteUrgenti
 *   - tempoMedioRisoluzioneHours (solo risolte, tutti periodi)
 *   - costoMedioReale (solo segnalazioni con costoReale valorizzato)
 *   - perPriorita { URGENTE, ALTA, NORMALE, BASSA }
 */
export async function GET() {
  const auth = await requireHostOrAdmin()
  if (isUnauthorized(auth)) return auth
  const hostId = auth.user.hostId

  const trentagg = new Date()
  trentagg.setDate(trentagg.getDate() - 30)

  const [aperte, inLavorazione, risolteUltimi30gg, aperteUrgenti, risolteTutte, costoAgg, perPrioritaAperte] = await Promise.all([
    prisma.segnalazioneManutenzione.count({
      where: { hostId, stato: 'APERTA' },
    }),
    prisma.segnalazioneManutenzione.count({
      where: { hostId, stato: 'IN_LAVORAZIONE' },
    }),
    prisma.segnalazioneManutenzione.count({
      where: { hostId, stato: 'RISOLTA', dataRisoluzione: { gte: trentagg } },
    }),
    prisma.segnalazioneManutenzione.count({
      where: { hostId, stato: { in: ['APERTA', 'IN_LAVORAZIONE'] }, priorita: 'URGENTE' },
    }),
    prisma.segnalazioneManutenzione.findMany({
      where: { hostId, stato: 'RISOLTA', dataRisoluzione: { not: null } },
      select: { createdAt: true, dataRisoluzione: true },
    }),
    prisma.segnalazioneManutenzione.aggregate({
      where: { hostId, costoReale: { not: null } },
      _avg: { costoReale: true },
      _sum: { costoReale: true },
      _count: { costoReale: true },
    }),
    prisma.segnalazioneManutenzione.groupBy({
      by: ['priorita'],
      where: { hostId, stato: { in: ['APERTA', 'IN_LAVORAZIONE'] } },
      _count: { _all: true },
    }),
  ])

  // Tempo medio risoluzione (ore)
  let tempoMedioH = 0
  if (risolteTutte.length > 0) {
    const totH = risolteTutte.reduce((s, r) => {
      if (!r.dataRisoluzione) return s
      return s + (r.dataRisoluzione.getTime() - r.createdAt.getTime()) / 3_600_000
    }, 0)
    tempoMedioH = totH / risolteTutte.length
  }

  const perPriorita = { URGENTE: 0, ALTA: 0, NORMALE: 0, BASSA: 0 } as Record<string, number>
  for (const g of perPrioritaAperte) perPriorita[g.priorita] = g._count._all

  return NextResponse.json({
    aperte,
    inLavorazione,
    risolteUltimi30gg,
    aperteUrgenti,
    tempoMedioRisoluzioneOre: Math.round(tempoMedioH * 10) / 10,
    costoMedioReale: Math.round((costoAgg._avg.costoReale ?? 0) * 100) / 100,
    costoTotale: Math.round((costoAgg._sum.costoReale ?? 0) * 100) / 100,
    costoRilevazioni: costoAgg._count.costoReale,
    perPriorita,
  })
}
