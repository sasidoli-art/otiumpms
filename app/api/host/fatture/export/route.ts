import { NextRequest, NextResponse } from 'next/server'
import { requireHostOrAdmin, isUnauthorized } from '@/lib/auth-middleware'
import { auditFromAuth } from '@/lib/audit'
import { prisma } from '@/lib/db'

// GET /api/host/fatture/export?anno=&stato=
// CSV delle fatture dell'host con BOM UTF-8 + ; delimiter (Excel IT).
export async function GET(req: NextRequest) {
  const auth = await requireHostOrAdmin()
  if (isUnauthorized(auth)) return auth

  const { searchParams } = new URL(req.url)
  const anno = searchParams.get('anno') ? parseInt(searchParams.get('anno')!) : undefined
  const stato = searchParams.get('stato') || undefined

  const where: Record<string, unknown> = { hostId: auth.user.hostId, deletedAt: null }
  if (anno) where.anno = anno
  if (stato) where.stato = stato

  const fatture = await prisma.fattura.findMany({
    where,
    orderBy: { dataEmissione: 'desc' },
  })

  const headers = [
    'Numero', 'Data', 'Scadenza', 'Tipo', 'Cliente', 'P.IVA', 'CF',
    'Imponibile', 'IVA', 'Totale', 'Stato', 'SDI stato', 'SDI provider', 'Note',
  ]

  const escape = (v: unknown) => {
    if (v === null || v === undefined) return ''
    const s = String(v).replace(/"/g, '""')
    return /[",\n;]/.test(s) ? `"${s}"` : s
  }

  const rows = fatture.map((f) => [
    f.numero,
    f.dataEmissione.toISOString().slice(0, 10),
    f.dataScadenza ? f.dataScadenza.toISOString().slice(0, 10) : '',
    f.tipoDocumento ?? 'TD01',
    f.clienteNome,
    f.clientePIva ?? '',
    f.clienteCF ?? '',
    f.imponibile.toFixed(2),
    f.iva.toFixed(2),
    f.totale.toFixed(2),
    f.stato,
    f.sdiStato ?? '',
    f.sdiProvider ?? '',
    f.note ?? '',
  ].map(escape).join(';'))

  const csv = '\uFEFF' + headers.join(';') + '\n' + rows.join('\n')

  await auditFromAuth(auth, {
    azione: 'fatture.esportate',
    entita: 'fattura',
    entitaId: null,
    dettagli: `Export CSV di ${fatture.length} fatture${anno ? ` (${anno})` : ''}${stato ? ` stato=${stato}` : ''}`,
  })

  const filename = `fatture-${anno ?? new Date().getFullYear()}.csv`
  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  })
}
