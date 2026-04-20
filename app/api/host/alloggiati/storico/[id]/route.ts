import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireHost, isUnauthorized } from '@/lib/auth-middleware'

// GET /api/host/alloggiati/storico/[id]
// Re-download del file generato in passato.
export async function GET(
  _: NextRequest,
  { params: paramsPromise }: { params: Promise<{ id: string }> },
) {
  const auth = await requireHost()
  if (isUnauthorized(auth)) return auth
  const { id } = await paramsPromise

  const record = await prisma.exportAlloggiati.findFirst({
    where: { id, hostId: auth.user.hostId },
  })
  if (!record) return NextResponse.json({ error: 'Non trovato' }, { status: 404 })

  return new NextResponse(record.fileContenuto, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Content-Disposition': `attachment; filename="${record.fileNome}"`,
    },
  })
}
