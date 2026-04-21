import { NextResponse, NextRequest } from 'next/server'
import { requireHostOrAdmin, isUnauthorized } from '@/lib/auth-middleware'
import { auditFromAuth } from '@/lib/audit'
import { prisma } from '@/lib/db'

// DELETE /api/host/api-keys/[id] — revoca chiave (soft: flag revocata=true)
export async function DELETE(
  _: NextRequest,
  { params: paramsPromise }: { params: Promise<{ id: string }> },
) {
  const auth = await requireHostOrAdmin()
  if (isUnauthorized(auth)) return auth
  const { id } = await paramsPromise

  const key = await prisma.apiKey.findFirst({
    where: { id, hostId: auth.user.hostId },
  })
  if (!key) return NextResponse.json({ error: 'Non trovata' }, { status: 404 })

  await prisma.apiKey.update({
    where: { id },
    data: { revocata: true },
  })

  await auditFromAuth(auth, {
    azione: 'api_key.revocata',
    entita: 'apiKey',
    entitaId: id,
    dettagli: `API key "${key.nome}" revocata (prefix ${key.prefix})`,
  })

  return NextResponse.json({ ok: true })
}
