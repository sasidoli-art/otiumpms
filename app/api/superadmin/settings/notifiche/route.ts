import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireSuperAdmin, isUnauthorized } from '@/lib/auth-middleware'
import { prisma } from '@/lib/db'

// GET /api/superadmin/settings/notifiche
export async function GET() {
  const auth = await requireSuperAdmin()
  if (isUnauthorized(auth)) return auth

  const destinatari = await prisma.configNotificaDestinatario.findMany({
    include: { user: { select: { id: true, email: true, nome: true, cognome: true, role: true } } },
    orderBy: { createdAt: 'desc' },
  })

  // Se la tabella e` vuota: fallback a tutti i SUPERADMIN
  const fallbackCount = destinatari.length === 0
    ? await prisma.user.count({ where: { role: 'SUPERADMIN' } })
    : 0

  return NextResponse.json({
    destinatari,
    fallbackAttivo: destinatari.length === 0,
    fallbackCount,
  })
}

// POST /api/superadmin/settings/notifiche — aggiungi destinatario
const createSchema = z.object({
  userId: z.string().optional().nullable(),
  emailEsterna: z.string().email().optional().nullable(),
  nome: z.string().max(100).optional().nullable(),
  tipiEvento: z.array(z.string()).optional().default([]),
  prioritaMinima: z.enum(['BASSA', 'NORMALE', 'ALTA', 'URGENTE']).optional().default('BASSA'),
  canali: z.array(z.enum(['email', 'inapp', 'slack'])).optional().default(['email', 'inapp']),
  attivo: z.boolean().optional().default(true),
}).refine((d) => d.userId || d.emailEsterna, {
  message: 'Almeno uno tra userId ed emailEsterna deve essere valorizzato',
  path: ['userId'],
})

export async function POST(req: NextRequest) {
  const auth = await requireSuperAdmin()
  if (isUnauthorized(auth)) return auth

  const raw = await req.json().catch(() => ({}))
  const parsed = createSchema.safeParse(raw)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Dati non validi', details: parsed.error.flatten() }, { status: 422 })
  }
  const d = parsed.data

  if (d.userId) {
    const u = await prisma.user.findUnique({ where: { id: d.userId }, select: { id: true } })
    if (!u) return NextResponse.json({ error: 'Utente non trovato' }, { status: 404 })
  }

  const dest = await prisma.configNotificaDestinatario.create({
    data: {
      userId: d.userId ?? null,
      emailEsterna: d.emailEsterna ?? null,
      nome: d.nome ?? null,
      tipiEvento: d.tipiEvento,
      prioritaMinima: d.prioritaMinima,
      canali: d.canali,
      attivo: d.attivo,
    },
    include: { user: { select: { id: true, email: true, nome: true, cognome: true } } },
  })

  await prisma.auditLog.create({
    data: {
      userId: auth.user.id,
      userEmail: auth.user.email,
      azione: 'config_notifica.destinatario.aggiunto',
      entita: 'configNotificaDestinatario',
      entitaId: dest.id,
      dettagli: `Aggiunto: ${d.nome ?? d.emailEsterna ?? d.userId}`,
    },
  })

  return NextResponse.json(dest, { status: 201 })
}

// PATCH /api/superadmin/settings/notifiche — update singolo
const patchSchema = z.object({
  id: z.string(),
  attivo: z.boolean().optional(),
  tipiEvento: z.array(z.string()).optional(),
  prioritaMinima: z.enum(['BASSA', 'NORMALE', 'ALTA', 'URGENTE']).optional(),
  canali: z.array(z.enum(['email', 'inapp', 'slack'])).optional(),
  nome: z.string().max(100).nullable().optional(),
})

export async function PATCH(req: NextRequest) {
  const auth = await requireSuperAdmin()
  if (isUnauthorized(auth)) return auth

  const raw = await req.json().catch(() => ({}))
  const parsed = patchSchema.safeParse(raw)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Dati non validi' }, { status: 422 })
  }
  const { id, ...data } = parsed.data

  const updated = await prisma.configNotificaDestinatario.update({
    where: { id },
    data,
  })

  await prisma.auditLog.create({
    data: {
      userId: auth.user.id,
      userEmail: auth.user.email,
      azione: 'config_notifica.destinatario.aggiornato',
      entita: 'configNotificaDestinatario',
      entitaId: id,
      dettagli: Object.keys(data).join(', '),
    },
  })

  return NextResponse.json(updated)
}

// DELETE /api/superadmin/settings/notifiche?id=xxx
export async function DELETE(req: NextRequest) {
  const auth = await requireSuperAdmin()
  if (isUnauthorized(auth)) return auth

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id richiesto' }, { status: 400 })

  await prisma.configNotificaDestinatario.delete({ where: { id } })

  await prisma.auditLog.create({
    data: {
      userId: auth.user.id,
      userEmail: auth.user.email,
      azione: 'config_notifica.destinatario.rimosso',
      entita: 'configNotificaDestinatario',
      entitaId: id,
    },
  })

  return NextResponse.json({ ok: true })
}
