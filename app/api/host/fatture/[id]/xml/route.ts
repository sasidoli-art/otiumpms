import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { generaFatturaPA } from '@/lib/fattura-elettronica'
import { requireHostOrAdmin, isUnauthorized } from '@/lib/auth-middleware'
import { auditFromAuth } from '@/lib/audit'
import { getBillingInfo } from '@/lib/host-config'
import { logger } from '@/lib/logger'

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9_.-]/g, '-').replace(/-{2,}/g, '-')
}

// GET /api/host/fatture/[id]/xml
// Genera il XML FatturaPA conforme SDI. Per il caso "manuale" l'host scarica
// il file e lo carica sul portale SDI (Agenzia delle Entrate / Aruba PA).
export async function GET(
  _req: NextRequest,
  { params: paramsPromise }: { params: Promise<{ id: string }> },
) {
  const auth = await requireHostOrAdmin()
  if (isUnauthorized(auth)) return auth
  const { id } = await paramsPromise

  const fattura = await prisma.fattura.findFirst({
    where: { id, hostId: auth.user.hostId, deletedAt: null },
    select: {
      id: true, numero: true,
      host: { select: { partitaIva: true } },
    },
  })
  if (!fattura) return NextResponse.json({ error: 'Non trovata' }, { status: 404 })

  try {
    const xml = await generaFatturaPA(id)
    const billing = await getBillingInfo(auth.user.hostId)
    const piva = (billing?.fattPartitaIva || fattura.host.partitaIva || '00000000000').replace(/^IT/i, '')
    const progressivo = fattura.numero.replace(/[^a-zA-Z0-9]/g, '').slice(0, 10)
    const filename = sanitizeFilename(`IT${piva}_${progressivo}.xml`)

    await auditFromAuth(auth, {
      azione: 'fattura.xml.scaricato',
      entita: 'fattura',
      entitaId: id,
      dettagli: `XML FatturaPA scaricato: ${filename}`,
    })

    return new NextResponse(xml, {
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (err) {
    logger.error('Generazione XML FatturaPA fallita', 'host/fatture/xml', {
      fatturaId: id,
      error: err instanceof Error ? err.message : String(err),
    })
    const msg = err instanceof Error ? err.message : 'Errore generazione XML'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
