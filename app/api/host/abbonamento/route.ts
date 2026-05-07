import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireHost, isUnauthorized } from '@/lib/auth-middleware'
import { getPlanDefinition, getAllPlans } from '@/lib/billing'

/**
 * GET /api/host/abbonamento
 *
 * Returns current subscription details, subscription history, and available plans.
 */
export async function GET() {
  const auth = await requireHost()
  if (isUnauthorized(auth)) return auth

  const host = await prisma.host.findUnique({
    where: { id: auth.user.hostId },
    select: {
      id: true,
      piano: true,
      statoAbbonamento: true,
      dataInizioAbb: true,
      dataFineAbb: true,
      nomeAzienda: true,
      abbonamenti: {
        orderBy: { createdAt: 'desc' },
        take: 20,
        include: {
          pagamenti: {
            orderBy: { createdAt: 'desc' },
            take: 5,
          },
        },
      },
      pagamenti: {
        orderBy: { createdAt: 'desc' },
        take: 20,
      },
    },
  })

  if (!host) {
    return NextResponse.json({ error: 'Host non trovato' }, { status: 404 })
  }

  const pianoCorrente = getPlanDefinition(host.piano)
  const pianiDisponibili = getAllPlans()

  return NextResponse.json({
    abbonamento: {
      piano: host.piano,
      stato: host.statoAbbonamento,
      dataInizio: host.dataInizioAbb,
      dataFine: host.dataFineAbb,
      prezzoMensile: pianoCorrente.prezzoMensile,
      label: pianoCorrente.label,
      maxStrutture: pianoCorrente.maxStrutture,
      maxUnita: pianoCorrente.maxUnita,
      maxEventi: pianoCorrente.maxEventi,
      moduliInclusi: pianoCorrente.moduliInclusi,
      tier: pianoCorrente.tier,
    },
    storico: host.abbonamenti,
    pagamenti: host.pagamenti,
    pianiDisponibili: pianiDisponibili.map(p => ({
      piano: p.piano,
      label: p.label,
      prezzoMensile: p.prezzoMensile,
      maxStrutture: p.maxStrutture,
      maxUnita: p.maxUnita,
      maxEventi: p.maxEventi,
      moduliInclusi: p.moduliInclusi,
      tier: p.tier,
    })),
  })
}
