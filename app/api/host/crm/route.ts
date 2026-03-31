import { getServerSession } from 'next-auth'
import { requireHostOrAdmin, isUnauthorized } from '@/lib/auth-middleware'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { NextResponse } from 'next/server'

// GET /api/host/crm?q=&vip=&blacklist=&tag=&nazionalita=&page=&sort=&dir=&perPage=
export async function GET(req: Request) {
  const auth = await requireHostOrAdmin()
  if (isUnauthorized(auth)) return auth

  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q') ?? ''
  const vip = searchParams.get('vip')
  const blacklist = searchParams.get('blacklist')
  const tag = searchParams.get('tag')
  const nazionalita = searchParams.get('nazionalita')
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1'))
  const perPage = Math.min(50, Math.max(10, parseInt(searchParams.get('perPage') ?? '20')))

  // Sorting
  const sortField = searchParams.get('sort') ?? 'cognome'
  const sortDir = searchParams.get('dir') === 'desc' ? 'desc' : 'asc'
  const allowedSorts = ['cognome', 'nome', 'email', 'numSoggiorni', 'totaleSpeso', 'dataUltimoSoggiorno', 'createdAt']
  const orderBy = allowedSorts.includes(sortField)
    ? [{ [sortField]: sortDir }]
    : [{ vip: 'desc' as const }, { cognome: 'asc' as const }]

  const where: Record<string, unknown> = {
    hostId: auth.user.hostId,
    ...(vip === 'true' ? { vip: true } : {}),
    ...(blacklist === 'true' ? { blacklist: true } : {}),
    ...(tag ? { tags: { has: tag } } : {}),
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
      WHERE "hostId" = ${auth.user.hostId}
      ORDER BY tag
    `,
    // Distinct nationalities
    prisma.ospiteCRM.findMany({
      where: { hostId: auth.user.hostId, nazionalita: { not: null } },
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

  const body = await req.json()
  const { nome, cognome, email, telefono, nazionalita, lingua, note, preferenze, vip, tags } = body

  if (!nome || !cognome || !email) {
    return NextResponse.json({ error: 'nome, cognome ed email sono obbligatori' }, { status: 400 })
  }

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

  return NextResponse.json(ospite, { status: 201 })
}
