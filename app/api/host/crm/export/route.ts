import { requireHostOrAdmin, isUnauthorized } from '@/lib/auth-middleware'
import { auditFromAuth } from '@/lib/audit'
import { prisma } from '@/lib/db'
import { NextResponse } from 'next/server'

// GET /api/host/crm/export?q=&vip=&blacklist=&ricorrenti=&ultimoSoggiorno=&tags=&nazionalita=
// Esporta in CSV i contatti CRM filtrati (stessi filtri di /api/host/crm)
export async function GET(req: Request) {
  const auth = await requireHostOrAdmin()
  if (isUnauthorized(auth)) return auth

  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q') ?? ''
  const vip = searchParams.get('vip')
  const blacklist = searchParams.get('blacklist')
  const ricorrenti = searchParams.get('ricorrenti')
  const ultimoSoggiorno = searchParams.get('ultimoSoggiorno')
  const tag = searchParams.get('tag')
  const tags = searchParams.getAll('tags')
  const nazionalita = searchParams.get('nazionalita')

  let dataSoglia: Date | null = null
  if (ultimoSoggiorno) {
    const giorni = parseInt(ultimoSoggiorno)
    if (!isNaN(giorni) && giorni > 0) {
      dataSoglia = new Date()
      dataSoglia.setDate(dataSoglia.getDate() - giorni)
    }
  }

  const tagsFilter: Record<string, unknown> = {}
  if (tag) tagsFilter.tags = { has: tag }
  if (tags.length > 0) tagsFilter.tags = { hasEvery: tags }

  const where: Record<string, unknown> = {
    hostId: auth.user.hostId,
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

  const ospiti = await prisma.ospiteCRM.findMany({
    where,
    orderBy: [{ cognome: 'asc' }, { nome: 'asc' }],
  })

  const headers = [
    'Nome', 'Cognome', 'Email', 'Telefono', 'Nazionalita', 'Lingua',
    'VIP', 'Blacklist', 'Tag', 'NumSoggiorni', 'TotaleSpeso', 'UltimoSoggiorno',
    'Note', 'Preferenze',
  ]

  const escape = (v: unknown) => {
    if (v === null || v === undefined) return ''
    const s = String(v).replace(/"/g, '""')
    return /[",\n;]/.test(s) ? `"${s}"` : s
  }

  const rows = ospiti.map((o) => [
    o.nome,
    o.cognome,
    o.email,
    o.telefono ?? '',
    o.nazionalita ?? '',
    o.lingua ?? '',
    o.vip ? 'SI' : 'NO',
    o.blacklist ? 'SI' : 'NO',
    (o.tags ?? []).join('|'),
    o.numSoggiorni,
    o.totaleSpeso,
    o.dataUltimoSoggiorno ? o.dataUltimoSoggiorno.toISOString().slice(0, 10) : '',
    o.note ?? '',
    o.preferenze ?? '',
  ].map(escape).join(';'))

  // BOM UTF-8 per compatibilita Excel + ; delimiter (IT default)
  const csv = '\uFEFF' + headers.join(';') + '\n' + rows.join('\n')

  await auditFromAuth(auth, {
    azione: 'ospite_crm.esportato',
    entita: 'ospiteCRM',
    entitaId: null,
    dettagli: `Export CSV di ${ospiti.length} contatti CRM`,
  })

  const filename = `crm-ospiti-${new Date().toISOString().slice(0, 10)}.csv`

  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  })
}
