import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, isUnauthorized } from '@/lib/auth-middleware'
import { prisma } from '@/lib/db'
import { auditFromAuth } from '@/lib/audit'

// GET /api/admin/billing/export?mese=YYYY-MM&stato=
// CSV movimenti pagamenti piattaforma (BOM UTF-8 + ; delimiter)
export async function GET(req: NextRequest) {
  const auth = await requireAdmin()
  if (isUnauthorized(auth)) return auth

  const { searchParams } = new URL(req.url)
  const mese = searchParams.get('mese')
  const stato = searchParams.get('stato')

  const where: Record<string, unknown> = {}
  if (stato) where.stato = stato
  if (mese) {
    const [y, m] = mese.split('-').map((s) => parseInt(s))
    if (!isNaN(y) && !isNaN(m)) {
      where.createdAt = {
        gte: new Date(y, m - 1, 1),
        lt: new Date(y, m, 1),
      }
    }
  }

  const pagamenti = await prisma.pagamentoPiattaforma.findMany({
    where,
    include: { host: { select: { nomeAzienda: true, piano: true, user: { select: { email: true } } } } },
    orderBy: { createdAt: 'desc' },
  })

  const headers = [
    'Data', 'Host', 'Email', 'Piano', 'Importo', 'Valuta', 'Metodo', 'Stato',
    'Periodo inizio', 'Periodo fine', 'Riferimento', 'Note',
  ]

  const escape = (v: unknown) => {
    if (v === null || v === undefined) return ''
    const s = String(v).replace(/"/g, '""')
    return /[";\n,]/.test(s) ? `"${s}"` : s
  }

  const rows = pagamenti.map((p) => [
    p.createdAt.toISOString().slice(0, 10),
    p.host.nomeAzienda,
    p.host.user.email,
    p.host.piano,
    p.importo.toFixed(2),
    p.valuta,
    p.metodo,
    p.stato,
    p.periodoInizio.toISOString().slice(0, 10),
    p.periodoFine.toISOString().slice(0, 10),
    p.riferimento ?? '',
    p.note ?? '',
  ].map(escape).join(';'))

  const csv = '\uFEFF' + headers.join(';') + '\n' + rows.join('\n')

  await auditFromAuth(auth, {
    azione: 'pagamenti_piattaforma.esportati',
    entita: 'pagamentoPiattaforma',
    entitaId: null,
    dettagli: `Export CSV di ${pagamenti.length} pagamenti${mese ? ` (${mese})` : ''}`,
  })

  const filename = `pagamenti-${mese ?? new Date().toISOString().slice(0, 7)}.csv`
  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  })
}
