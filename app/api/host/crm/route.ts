import { z } from 'zod'
import { requireHostOrAdmin, isUnauthorized } from '@/lib/auth-middleware'
import { auditFromAuth } from '@/lib/audit'
import { prisma } from '@/lib/db'
import { NextResponse } from 'next/server'
import { notDeleted } from '@/lib/prisma-helpers'

const createOspiteSchema = z.object({
  nome: z.string().min(1),
  cognome: z.string().min(1),
  email: z.string().email(),
  telefono: z.string().optional().nullable(),
  nazionalita: z.string().optional().nullable(),
  lingua: z.string().optional().nullable(),
  note: z.string().optional().nullable(),
  preferenze: z.string().optional().nullable(),
  vip: z.boolean().optional(),
  tags: z.array(z.string()).optional(),
})

// GET /api/host/crm?q=&vip=&blacklist=&ricorrenti=&ultimoSoggiorno=30|90|365&tag=&nazionalita=&page=&sort=&dir=&perPage=
export async function GET(req: Request) {
  const auth = await requireHostOrAdmin()
  if (isUnauthorized(auth)) return auth

  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q') ?? ''
  const vip = searchParams.get('vip')
  const blacklist = searchParams.get('blacklist')
  const ricorrenti = searchParams.get('ricorrenti')
  const ultimoSoggiorno = searchParams.get('ultimoSoggiorno') // '30' | '90' | '365'
  const tag = searchParams.get('tag')
  const tags = searchParams.getAll('tags') // multi
  const nazionalita = searchParams.get('nazionalita')
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1'))
  const perPage = Math.min(100, Math.max(10, parseInt(searchParams.get('perPage') ?? '20')))

  // Sorting
  const sortField = searchParams.get('sort') ?? 'cognome'
  const sortDir = searchParams.get('dir') === 'desc' ? 'desc' : 'asc'
  const allowedSorts = ['cognome', 'nome', 'email', 'numSoggiorni', 'totaleSpeso', 'dataUltimoSoggiorno', 'createdAt']
  const orderBy = allowedSorts.includes(sortField)
    ? [{ [sortField]: sortDir }]
    : [{ vip: 'desc' as const }, { cognome: 'asc' as const }]

  // Filtro data ultimo soggiorno
  let dataSoglia: Date | null = null
  if (ultimoSoggiorno) {
    const giorni = parseInt(ultimoSoggiorno)
    if (!isNaN(giorni) && giorni > 0) {
      dataSoglia = new Date()
      dataSoglia.setDate(dataSoglia.getDate() - giorni)
    }
  }

  // Tags: supporta ?tag=X (legacy, single) e ?tags=A&tags=B (multi, hasEvery)
  const tagsFilter: Record<string, unknown> = {}
  if (tag) tagsFilter.tags = { has: tag }
  if (tags.length > 0) tagsFilter.tags = { hasEvery: tags }

  const where: Record<string, unknown> = {
    hostId: auth.user.hostId,
    ...notDeleted,
    ...(vip === 'true' ? { vip: true } : {}),
    ...(blacklist === 'true' ? { blacklist: true } : {}),
    ...(ricorrenti === 'true' ? { numSoggiorni: { gte: 2 } } : {}),
    ...(dataSoglia ? { dataUltimoSoggiorno: { gte: dataSoglia } } : {}),
    ...tagsFilter,
    ...(nazionalita ? { nazionalita: { contains: nazionalita, mode: 'insensitive' } } : {}),
    ...(q
      ? {
          OR: [
            { nome: { contains: q, mode: 'insensitive' } },
            { cognome: { contains: q, mode: 'insensitive' } },
            { email: { contains: q, mode: 'insensitive' } },
            { telefono: { contains: q } },
          ],
        }
      : {}),
  }

  const [ospiti, totale, allTags, allNazionalita] = await Promise.all([
    prisma.ospiteCRM.findMany({
      where,
      orderBy,
      skip: (page - 1) * perPage,
      take: perPage,
    }),
    prisma.ospiteCRM.count({ where }),
    // Distinct tags for filter dropdown (all host guests, not filtered)
    prisma.$queryRaw<{ tag: string }[]>`
      SELECT DISTINCT unnest(tags) as tag
      FROM "OspiteCRM"
      WHERE "hostId" = ${auth.user.hostId} AND "deletedAt" IS NULL
      ORDER BY tag
    `,
    // Distinct nationalities
    prisma.ospiteCRM.findMany({
      where: { hostId: auth.user.hostId, ...notDeleted, nazionalita: { not: null } },
      select: { nazionalita: true },
      distinct: ['nazionalita'],
      orderBy: { nazionalita: 'asc' },
    }),
  ])

  return NextResponse.json({
    ospiti,
    totale,
    pagine: Math.ceil(totale / perPage),
    tags: allTags.map((t: { tag: string }) => t.tag),
    nazionalita: allNazionalita.map((n: { nazionalita: string | null }) => n.nazionalita).filter(Boolean),
  })
}

// POST /api/host/crm  — crea nuovo ospite o aggiorna se email esiste
export async function POST(req: Request) {
  const auth = await requireHostOrAdmin()
  if (isUnauthorized(auth)) return auth
  const session = auth

  const raw = await req.json()
  const parsed = createOspiteSchema.safeParse(raw)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Dati non validi', details: parsed.error.flatten() }, { status: 422 })
  }
  const { nome, cognome, email, telefono, nazionalita, lingua, note, preferenze, vip, tags } = parsed.data

  const ospite = await prisma.ospiteCRM.upsert({
    where: { hostId_email: { hostId: auth.user.hostId, email } },
    update: { nome, cognome, telefono, nazionalita, lingua, note, preferenze, vip: vip ?? false, tags: tags ?? [] },
    create: {
      hostId: auth.user.hostId,
      nome, cognome, email,
      telefono: telefono ?? null,
      nazionalita: nazionalita ?? null,
      lingua: lingua ?? 'it',
      note: note ?? null,
      preferenze: preferenze ?? null,
      vip: vip ?? false,
      tags: tags ?? [],
    },
  })

  // GDPR Art. 30 — traccia creazione/aggiornamento scheda CRM
  await auditFromAuth(auth, {
    azione: 'ospite_crm.upsert',
    entita: 'ospiteCRM',
    entitaId: ospite.id,
    dettagli: `Scheda CRM upsert ${cognome} ${nome} <${email}>`,
  })

  return NextResponse.json(ospite, { status: 201 })
}
