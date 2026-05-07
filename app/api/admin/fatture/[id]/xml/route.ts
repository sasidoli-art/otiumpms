import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, isUnauthorized } from '@/lib/auth-middleware'
import { generaFatturaPA } from '@/lib/fattura-elettronica'

/**
 * GET /api/admin/fatture/[id]/xml
 * Genera il file XML FatturaPA conforme al tracciato SDI v1.2.2
 * per l'invio tramite Sistema di Interscambio.
 */
export async function GET(
  _: NextRequest,
  { params: paramsPromise }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin()
  if (isUnauthorized(auth)) return auth
  const { id } = await paramsPromise

  try {
    const xml = await generaFatturaPA(id)

    // Leggi la fattura per estrarre P.IVA e numero (per il filename)
    const { prisma } = await import('@/lib/db')
    const { getBillingInfo } = await import('@/lib/host-config')

    const fattura = await prisma.fattura.findUnique({
      where: { id },
      select: { numero: true, hostId: true, host: { select: { partitaIva: true } } },
    })

    if (!fattura) return new NextResponse(null, { status: 404 })

    const billing = await getBillingInfo(fattura.hostId)
    const piva = (billing?.fattPartitaIva || fattura.host.partitaIva || '00000000000').replace(/^IT/i, '')
    const progressivo = fattura.numero.replace(/[^a-zA-Z0-9]/g, '').slice(0, 10)
    const filename = `IT${piva}_${progressivo}.xml`

    return new NextResponse(xml, {
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (err) {
    const { logger } = await import('@/lib/logger')
    logger.error('Generazione XML FatturaPA fallita', 'admin/fatture/xml', {
      fatturaId: id,
      error: err instanceof Error ? err.message : String(err),
    })
    const msg = err instanceof Error ? err.message : 'Errore generazione XML'
    return new NextResponse(JSON.stringify({ error: msg }), { status: 500, headers: { 'Content-Type': 'application/json' } })
  }
}
