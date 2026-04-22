import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, isUnauthorized } from '@/lib/auth-middleware'
import { prisma } from '@/lib/db'
import { auditFromAuth } from '@/lib/audit'
import { setImpersonation } from '@/lib/impersonation'

// POST /api/admin/host/[id]/impersona
// Crea sessione impersonata per ADMIN/SUPERADMIN
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin()
  if (isUnauthorized(auth)) return auth
  const { id } = await params

  const host = await prisma.host.findUnique({
    where: { id },
    select: {
      id: true,
      nomeAzienda: true,
      deletedAt: true,
      user: { select: { email: true } },
    },
  })
  if (!host) return NextResponse.json({ error: 'Non trovato' }, { status: 404 })
  if (host.deletedAt) return NextResponse.json({ error: 'Host eliminato' }, { status: 410 })

  await setImpersonation(host.id, host.nomeAzienda, auth.user.id)

  await auditFromAuth(auth, {
    azione: 'admin.impersonation.start',
    entita: 'host',
    entitaId: host.id,
    dettagli: `Admin ${auth.user.email} ha impersonato ${host.user.email} (${host.nomeAzienda})`,
  })

  return NextResponse.json({
    ok: true,
    hostId: host.id,
    hostNome: host.nomeAzienda,
    redirectTo: '/host/dashboard',
  })
}
