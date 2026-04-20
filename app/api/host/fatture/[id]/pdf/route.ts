import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { generaPdfFattura } from '@/lib/pdf'
import { requireHostOrAdmin, isUnauthorized } from '@/lib/auth-middleware'
import { logAccessoAsync } from '@/lib/audit'
import { getClientIp } from '@/lib/rate-limit'
import { logger } from '@/lib/logger'

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9\-_]/g, '-').replace(/-{2,}/g, '-')
}

// GET /api/host/fatture/[id]/pdf
export async function GET(
  req: NextRequest,
  { params: paramsPromise }: { params: Promise<{ id: string }> },
) {
  const auth = await requireHostOrAdmin()
  if (isUnauthorized(auth)) return auth
  const { id } = await paramsPromise

  const fattura = await prisma.fattura.findFirst({
    where: { id, hostId: auth.user.hostId, deletedAt: null },
    select: { id: true, numero: true },
  })
  if (!fattura) return NextResponse.json({ error: 'Non trovata' }, { status: 404 })

  try {
    const pdfBytes = await generaPdfFattura(id)
    const safe = sanitizeFilename(`fattura-${fattura.numero}`)

    logAccessoAsync({
      hostId: auth.user.hostId!,
      userId: auth.user.id,
      userEmail: auth.user.email,
      entita: 'fattura',
      entitaId: id,
      tipoAccesso: 'export',
      ip: getClientIp(req),
      userAgent: req.headers.get('user-agent'),
    })

    return new NextResponse(Buffer.from(pdfBytes), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${safe}.pdf"`,
        'Content-Length': String(pdfBytes.byteLength),
      },
    })
  } catch (err) {
    logger.error('Generazione PDF fattura fallita', 'host/fatture/pdf', {
      fatturaId: id,
      error: err instanceof Error ? err.message : String(err),
    })
    return NextResponse.json({ error: 'Errore generazione PDF' }, { status: 500 })
  }
}
