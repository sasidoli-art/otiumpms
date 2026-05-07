import { NextRequest, NextResponse } from 'next/server'
import { requireHostOrAdmin, isUnauthorized } from '@/lib/auth-middleware'
import { prisma } from '@/lib/db'

/**
 * GET /api/host/audit?limit=50&offset=0&entita=prenotazione&azione=confermata
 *  &soloAccessi=true (filtro GDPR Art. 32)
 *  &export=csv (download)
 *
 * Consulta il registro attività (audit log).
 */
export async function GET(req: NextRequest) {
  const auth = await requireHostOrAdmin()
  if (isUnauthorized(auth)) return auth

  const sp = req.nextUrl.searchParams
  const limit = Math.min(parseInt(sp.get('limit') ?? '50'), 500)
  const offset = parseInt(sp.get('offset') ?? '0')
  const entita = sp.get('entita')
  const azioneParam = sp.get('azione')
  const soloAccessi = sp.get('soloAccessi') === 'true'
  const da = sp.get('da')
  const a = sp.get('a')
  const isCsv = sp.get('export') === 'csv'

  // Se soloAccessi=true forza il filtro sulle azioni dati_personali.*
  const azioneFilter = soloAccessi ? 'dati_personali.' : azioneParam

  const where = {
    hostId: auth.user.hostId,
    ...(entita ? { entita: { contains: entita, mode: 'insensitive' as const } } : {}),
    ...(azioneFilter
      ? { azione: { contains: azioneFilter, mode: 'insensitive' as const } }
      : {}),
    ...(da || a ? {
      createdAt: {
        ...(da ? { gte: new Date(da) } : {}),
        ...(a ? { lte: new Date(a) } : {}),
      },
    } : {}),
  }

  if (isCsv) {
    const all = await prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 10_000, // safety cap per export
    })
    const rows: string[][] = [[
      'data_ora', 'operatore_email', 'azione', 'entita', 'entita_id', 'ip', 'dettagli',
    ]]
    for (const l of all) {
      rows.push([
        l.createdAt.toISOString(),
        l.userEmail ?? '',
        l.azione,
        l.entita,
        l.entitaId ?? '',
        l.ip ?? '',
        (l.dettagli ?? '').replace(/\n/g, ' '),
      ])
    }
    const csv = rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(',')).join('\n')
    const prefix = soloAccessi ? 'audit-accessi-dati-personali' : 'audit-log'
    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${prefix}-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    })
  }

  const [logs, totale] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    }),
    prisma.auditLog.count({ where }),
  ])

  return NextResponse.json({ logs, totale, limit, offset })
}
