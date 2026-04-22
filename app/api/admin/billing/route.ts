import { NextResponse } from 'next/server'
import { requireAdmin, isUnauthorized } from '@/lib/auth-middleware'
import { prisma } from '@/lib/db'
import { PLAN_DEFINITIONS } from '@/lib/billing'
import { CATALOGO_MODULI, PREZZI_ADDON, parseModuli } from '@/lib/moduli'
import type { PianoTipo } from '@prisma/client'

/**
 * GET /api/admin/billing
 *
 * Dashboard billing platform: KPI MRR/ARR/ARPU, distribuzione host per piano,
 * lista abbonamenti attivi, revenue per modulo add-on.
 */
export async function GET() {
  const auth = await requireAdmin()
  if (isUnauthorized(auth)) return auth

  const [hosts, abbonamentiRecenti] = await Promise.all([
    prisma.host.findMany({
      select: {
        id: true,
        nomeAzienda: true,
        piano: true,
        statoAbbonamento: true,
        dataInizioAbb: true,
        dataFineAbb: true,
        moduliAttivi: true,
        user: { select: { email: true } },
      },
    }),
    prisma.abbonamento.findMany({
      orderBy: { dataInizio: 'desc' },
      take: 100,
      select: {
        id: true, hostId: true, piano: true, stato: true,
        dataInizio: true, dataFine: true, prezzoMensile: true, note: true,
        host: { select: { nomeAzienda: true, user: { select: { email: true } } } },
      },
    }),
  ])

  // ─── MRR / ARR / ARPU ─────────────────────────────────────────────────────
  const hostAttivi = hosts.filter((h) => h.statoAbbonamento === 'ATTIVO')
  const mrr = hostAttivi.reduce((acc, h) => {
    const plan = PLAN_DEFINITIONS[h.piano as PianoTipo]
    if (!plan || h.piano === 'EVENTO_SINGOLO') return acc
    return acc + (plan.prezzoMensile ?? 0)
  }, 0)
  const arr = mrr * 12
  const arpu = hostAttivi.length > 0 ? mrr / hostAttivi.length : 0

  // ─── Distribuzione per piano ──────────────────────────────────────────────
  const distribuzionePiano: Record<string, { count: number; mrr: number }> = {}
  for (const h of hosts) {
    if (!distribuzionePiano[h.piano]) {
      distribuzionePiano[h.piano] = { count: 0, mrr: 0 }
    }
    distribuzionePiano[h.piano].count++
    if (h.statoAbbonamento === 'ATTIVO') {
      const plan = PLAN_DEFINITIONS[h.piano as PianoTipo]
      if (plan && h.piano !== 'EVENTO_SINGOLO') {
        distribuzionePiano[h.piano].mrr += plan.prezzoMensile ?? 0
      }
    }
  }

  const perPiano = Object.entries(distribuzionePiano).map(([piano, v]) => {
    const plan = PLAN_DEFINITIONS[piano as PianoTipo]
    return {
      piano,
      nome: plan?.label ?? piano,
      count: v.count,
      mrr: Math.round(v.mrr * 100) / 100,
      prezzoMensile: plan?.prezzoMensile ?? 0,
    }
  }).sort((a, b) => (PLAN_DEFINITIONS[a.piano as PianoTipo]?.prezzoMensile ?? 0) - (PLAN_DEFINITIONS[b.piano as PianoTipo]?.prezzoMensile ?? 0))

  // ─── Revenue per modulo add-on ───────────────────────────────────────────
  // Conta host che hanno un modulo attivo E quel modulo NON e` incluso nel loro piano
  const revenueAddon: Record<string, { hostCount: number; prezzo: number; revenue: number }> = {}
  for (const m of CATALOGO_MODULI) {
    revenueAddon[m.id] = {
      hostCount: 0,
      prezzo: PREZZI_ADDON[m.id] ?? 0,
      revenue: 0,
    }
  }
  for (const h of hostAttivi) {
    const moduli = parseModuli(h.moduliAttivi)
    const planDef = PLAN_DEFINITIONS[h.piano as PianoTipo]
    const moduliInclusi = new Set(planDef?.moduliInclusi ?? [])
    for (const [moduloId, attivo] of Object.entries(moduli)) {
      if (attivo && !moduliInclusi.has(moduloId) && revenueAddon[moduloId]) {
        revenueAddon[moduloId].hostCount++
        revenueAddon[moduloId].revenue += revenueAddon[moduloId].prezzo
      }
    }
  }

  const addonRows = Object.entries(revenueAddon)
    .map(([moduloId, v]) => {
      const m = CATALOGO_MODULI.find((x) => x.id === moduloId)
      return {
        moduloId,
        nome: m?.nome ?? moduloId,
        hostCount: v.hostCount,
        prezzo: v.prezzo,
        revenue: Math.round(v.revenue * 100) / 100,
      }
    })
    .filter((r) => r.prezzo > 0) // solo moduli con prezzo add-on definito
    .sort((a, b) => b.revenue - a.revenue)

  const addonRevenueTotale = addonRows.reduce((s, r) => s + r.revenue, 0)

  // ─── Tabella abbonamenti (ultimi 100) ────────────────────────────────────
  const abbonamenti = abbonamentiRecenti.map((a) => ({
    id: a.id,
    hostId: a.hostId,
    hostNome: a.host.nomeAzienda,
    hostEmail: a.host.user.email,
    piano: a.piano,
    stato: a.stato,
    dataInizio: a.dataInizio.toISOString(),
    dataFine: a.dataFine?.toISOString() ?? null,
    prezzoMensile: a.prezzoMensile,
    note: a.note,
  }))

  return NextResponse.json({
    kpi: {
      mrr: Math.round(mrr * 100) / 100,
      arr: Math.round(arr * 100) / 100,
      arpu: Math.round(arpu * 100) / 100,
      hostTotali: hosts.length,
      hostAttivi: hostAttivi.length,
      addonRevenueMensile: Math.round(addonRevenueTotale * 100) / 100,
    },
    perPiano,
    addonRows,
    abbonamenti,
  })
}
