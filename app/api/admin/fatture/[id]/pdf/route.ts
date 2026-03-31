import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { generaPdfFattura } from '@/lib/pdf'
import { requireAdmin, isUnauthorized } from '@/lib/auth-middleware'
import { logger } from '@/lib/logger'

/** Rimuove tutti i caratteri non sicuri per un filename HTTP. */
function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9\-_]/g, '-').replace(/-{2,}/g, '-')
}

// GET /api/admin/fatture/[id]/pdf
export async function GET(
  _: NextRequest,
  { params: paramsPromise }: { params: Promise<{ id: string }> },
) {
  const params = await paramsPromise
  const auth = await requireAdmin()
  if (isUnauthorized(auth)) return auth

  const fattura = await prisma.fattura.findUnique({
    where: { id: params.id },
    include: { host: { select: { nomeAzienda: true } } },
  })

  if (!fattura) return NextResponse.json({ error: 'Non trovato' }, { status: 404 })

  try {
    const pdfBytes = await generaPdfFattura(fattura)
    const safeFilename = sanitizeFilename(`fattura-${fattura.numero}`)

    return new NextResponse(Buffer.from(pdfBytes), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${safeFilename}.pdf"`,
        'Content-Length': String(pdfBytes.byteLength),
      },
    })
  } catch (err) {
    logger.error('Generazione PDF fattura fallita', 'admin/fatture/pdf', {
      fatturaId: params.id,
      error: err instanceof Error ? err.message : String(err),
    })
    return NextResponse.json({ error: 'Errore durante la generazione del PDF' }, { status: 500 })
  }
}
