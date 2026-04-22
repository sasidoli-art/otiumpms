import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, isUnauthorized } from '@/lib/auth-middleware'
import { prisma } from '@/lib/db'
import { PLAN_DEFINITIONS } from '@/lib/billing'
import type { PianoTipo, StatoAbbonamento } from '@prisma/client'
import { parseModuli } from '@/lib/moduli'

// GET /api/admin/host?q=&stato=&piano=&page=&limit=
export async function GET(req: NextRequest) {
  const auth = await requireAdmin()
  if (isUnauthorized(auth)) return auth

  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q')?.trim()
  const stato = searchParams.get('stato') as StatoAbbonamento | null
  const piano = searchParams.get('piano') as PianoTipo | null
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1'))
  const limit = Math.min(100, Math.max(10, parseInt(searchParams.get('limit') ?? '25')))

  const where: Record<string, unknown> = {}
  if (stato) where.statoAbbonamento = stato
  if (piano) where.piano = piano
  if (q) {
    where.OR = [
      { nomeAzienda: { contains: q, mode: 'insensitive' } },
      { partitaIva: { contains: q, mode: 'insensitive' } },
      { user: { email: { contains: q, mode: 'insensitive' } } },
    ]
  }

  const [hosts, total] = await Promise.all([
    prisma.host.findMany({
      where,
      include: {
        user: { select: { id: true, email: true, nome: true, cognome: true } },
        _count: { select: { strutture: true, prenotazioni: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.host.count({ where }),
  ])

  const rows = hosts.map((h) => {
    const moduli = parseModuli(h.moduliAttivi)
    const moduliAttiviNomi = Object.entries(moduli)
      .filter(([, v]) => v === true)
      .map(([k]) => k)
    const plan = PLAN_DEFINITIONS[h.piano]
    const mrr = plan && h.piano !== 'EVENTO_SINGOLO' && h.statoAbbonamento === 'ATTIVO'
      ? (plan.prezzoMensile ?? 0)
      : 0
    return {
      id: h.id,
      nomeAzienda: h.nomeAzienda,
      partitaIva: h.partitaIva,
      email: h.user.email,
      userNome: `${h.user.nome} ${h.user.cognome}`.trim(),
      piano: h.piano,
      statoAbbonamento: h.statoAbbonamento,
      dataInizioAbb: h.dataInizioAbb?.toISOString() ?? null,
      dataFineAbb: h.dataFineAbb?.toISOString() ?? null,
      strutturaCount: h._count.strutture,
      prenotazioniCount: h._count.prenotazioni,
      moduliAttiviCount: moduliAttiviNomi.length,
      moduliAttivi: moduliAttiviNomi,
      mrr,
      onboardingCompletato: h.onboardingCompletato,
      onboardingStep: h.onboardingStep,
      createdAt: h.createdAt.toISOString(),
      updatedAt: h.updatedAt.toISOString(),
    }
  })

  return NextResponse.json({
    hosts: rows,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  })
}
