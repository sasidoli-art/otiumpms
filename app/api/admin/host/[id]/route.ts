import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdmin, isUnauthorized } from '@/lib/auth-middleware'
import { prisma } from '@/lib/db'
import { auditFromAuth } from '@/lib/audit'
import { parseModuli } from '@/lib/moduli'
import { PLAN_DEFINITIONS } from '@/lib/billing'

type RouteParams = { params: Promise<{ id: string }> }

// GET /api/admin/host/[id]
export async function GET(_: NextRequest, { params }: RouteParams) {
  const auth = await requireAdmin()
  if (isUnauthorized(auth)) return auth
  const { id } = await params

  const host = await prisma.host.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, email: true, nome: true, cognome: true, twoFactorEnabled: true } },
      strutture: {
        select: {
          id: true, nome: true, citta: true, attiva: true,
          _count: { select: { unita: true, prenotazioni: true } },
        },
        orderBy: { nome: 'asc' },
      },
      abbonamenti: {
        orderBy: { dataInizio: 'desc' },
        take: 10,
      },
      dpaAccettazioni: {
        orderBy: { accettatoAt: 'desc' },
        take: 1,
      },
      richiesteCancellazione: {
        where: { stato: { in: ['IN_ATTESA', 'IN_ESAME'] } },
      },
      _count: {
        select: {
          prenotazioni: true,
          strutture: true,
          fatture: true,
          tickets: true,
        },
      },
    },
  })
  if (!host) return NextResponse.json({ error: 'Non trovato' }, { status: 404 })

  // Revenue aggregato dalle fatture pagate
  const revenue = await prisma.fattura.aggregate({
    where: { hostId: id, stato: 'PAGATA' },
    _sum: { totale: true },
  })

  // Activity recente
  const audit = await prisma.auditLog.findMany({
    where: { hostId: id },
    orderBy: { createdAt: 'desc' },
    take: 20,
    select: {
      id: true, azione: true, entita: true, entitaId: true,
      userEmail: true, dettagli: true, createdAt: true,
    },
  })

  const moduli = parseModuli(host.moduliAttivi)
  const plan = PLAN_DEFINITIONS[host.piano]
  const mrr = plan && host.piano !== 'EVENTO_SINGOLO' && host.statoAbbonamento === 'ATTIVO'
    ? (plan.prezzoMensile ?? 0)
    : 0

  return NextResponse.json({
    host: {
      ...host,
      moduliAttivi: moduli,
      mrr,
      revenueTotale: revenue._sum.totale ?? 0,
    },
    audit,
  })
}

// PATCH /api/admin/host/[id] — aggiorna dati base host
const updateSchema = z.object({
  nomeAzienda: z.string().optional(),
  partitaIva: z.string().nullable().optional(),
  codiceFiscale: z.string().nullable().optional(),
  telefono: z.string().nullable().optional(),
  sitoWeb: z.string().nullable().optional(),
  indirizzo: z.string().nullable().optional(),
  citta: z.string().nullable().optional(),
  provincia: z.string().nullable().optional(),
  cap: z.string().nullable().optional(),
  regione: z.string().nullable().optional(),
  note: z.string().nullable().optional(),
  piano: z.enum(['LIGHT', 'EVENTO_SINGOLO', 'VISIBILITA_MENSILE', 'PARTNER_PREMIUM']).optional(),
  statoAbbonamento: z.enum(['ATTIVO', 'SOSPESO', 'SCADUTO', 'IN_PROVA']).optional(),
  dataFineAbb: z.string().nullable().optional(),
})

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const auth = await requireAdmin()
  if (isUnauthorized(auth)) return auth
  const { id } = await params

  const raw = await req.json().catch(() => ({}))
  const parsed = updateSchema.safeParse(raw)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Dati non validi', details: parsed.error.flatten() }, { status: 422 })
  }
  const d = parsed.data

  const existing = await prisma.host.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: 'Non trovato' }, { status: 404 })

  const updated = await prisma.host.update({
    where: { id },
    data: {
      ...(d.nomeAzienda !== undefined && { nomeAzienda: d.nomeAzienda }),
      ...(d.partitaIva !== undefined && { partitaIva: d.partitaIva }),
      ...(d.codiceFiscale !== undefined && { codiceFiscale: d.codiceFiscale }),
      ...(d.telefono !== undefined && { telefono: d.telefono }),
      ...(d.sitoWeb !== undefined && { sitoWeb: d.sitoWeb }),
      ...(d.indirizzo !== undefined && { indirizzo: d.indirizzo }),
      ...(d.citta !== undefined && { citta: d.citta }),
      ...(d.provincia !== undefined && { provincia: d.provincia }),
      ...(d.cap !== undefined && { cap: d.cap }),
      ...(d.regione !== undefined && { regione: d.regione }),
      ...(d.note !== undefined && { note: d.note }),
      ...(d.piano !== undefined && { piano: d.piano }),
      ...(d.statoAbbonamento !== undefined && { statoAbbonamento: d.statoAbbonamento }),
      ...(d.dataFineAbb !== undefined && {
        dataFineAbb: d.dataFineAbb ? new Date(d.dataFineAbb) : null,
      }),
    },
  })

  const changed = Object.keys(d).filter((k) => d[k as keyof typeof d] !== undefined)
  await auditFromAuth(auth, {
    azione: 'host.aggiornato',
    entita: 'host',
    entitaId: id,
    dettagli: `Host ${existing.nomeAzienda} aggiornato: ${changed.join(', ')}${d.piano && d.piano !== existing.piano ? ` · piano ${existing.piano}→${d.piano}` : ''}`,
  })

  return NextResponse.json(updated)
}

// DELETE /api/admin/host/[id] — soft delete + GDPR pipeline (eliminazione differita)
export async function DELETE(_: NextRequest, { params }: RouteParams) {
  const auth = await requireAdmin()
  if (isUnauthorized(auth)) return auth
  const { id } = await params

  const host = await prisma.host.findUnique({ where: { id } })
  if (!host) return NextResponse.json({ error: 'Non trovato' }, { status: 404 })

  // Soft delete: marca come ELIMINATO + disattiva account User
  await prisma.$transaction([
    prisma.host.update({
      where: { id },
      data: {
        statoAbbonamento: 'SCADUTO',
        deletedAt: new Date(),
      },
    }),
    prisma.user.update({
      where: { id: host.userId },
      data: { attivo: false },
    }),
  ])

  await auditFromAuth(auth, {
    azione: 'host.eliminato',
    entita: 'host',
    entitaId: id,
    dettagli: `Host ${host.nomeAzienda} eliminato (soft delete). Dati ospiti seguiranno policy retention GDPR.`,
  })

  return NextResponse.json({ ok: true })
}
