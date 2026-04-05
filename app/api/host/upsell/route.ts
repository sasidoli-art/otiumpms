import { NextRequest, NextResponse } from 'next/server'
import { requireHost, isUnauthorized } from '@/lib/auth-middleware'
import { auditFromAuth } from '@/lib/audit'
import { prisma } from '@/lib/db'
import { startOfMonth, endOfMonth } from 'date-fns'

/**
 * GET /api/host/upsell?anno=2026&mese=3
 * Report upsell: per operatore, accettazioni, revenue generato, incentivi.
 */
export async function GET(req: NextRequest) {
  const auth = await requireHost()
  if (isUnauthorized(auth)) return auth

  const sp = req.nextUrl.searchParams
  const anno = parseInt(sp.get('anno') ?? String(new Date().getFullYear()))
  const mese = parseInt(sp.get('mese') ?? String(new Date().getMonth() + 1))
  const inizio = startOfMonth(new Date(anno, mese - 1))
  const fine = endOfMonth(new Date(anno, mese - 1))

  const proposte = await prisma.propostaUpsell.findMany({
    where: {
      regola: { hostId: auth.user.hostId },
      createdAt: { gte: inizio, lte: fine },
    },
    include: {
      regola: { select: { nome: true } },
      prenotazione: { select: { guestNome: true, guestCognome: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  const totaleProposte = proposte.length
  const accettate = proposte.filter(p => p.stato === 'ACCETTATA')
  const rifiutate = proposte.filter(p => p.stato === 'RIFIUTATA')
  const conversionRate = totaleProposte > 0 ? Math.round((accettate.length / totaleProposte) * 1000) / 10 : 0
  const revenueGenerato = accettate.reduce((s, p) => s + p.supplementoTotale, 0)
  const incentiviTotali = accettate.reduce((s, p) => s + p.incentivoOperatore, 0)

  // Per operatore
  const perOperatore: Record<string, { proposte: number; accettate: number; revenue: number; incentivi: number }> = {}
  for (const p of proposte) {
    if (!perOperatore[p.propostaDa]) perOperatore[p.propostaDa] = { proposte: 0, accettate: 0, revenue: 0, incentivi: 0 }
    perOperatore[p.propostaDa].proposte++
    if (p.stato === 'ACCETTATA') {
      perOperatore[p.propostaDa].accettate++
      perOperatore[p.propostaDa].revenue += p.supplementoTotale
      perOperatore[p.propostaDa].incentivi += p.incentivoOperatore
    }
  }

  return NextResponse.json({
    anno, mese,
    riepilogo: {
      totaleProposte,
      accettate: accettate.length,
      rifiutate: rifiutate.length,
      conversionRate,
      revenueGenerato: Math.round(revenueGenerato * 100) / 100,
      incentiviTotali: Math.round(incentiviTotali * 100) / 100,
    },
    perOperatore: Object.entries(perOperatore)
      .map(([nome, dati]) => ({ operatore: nome, ...dati }))
      .sort((a, b) => b.revenue - a.revenue),
    proposte,
  })
}
