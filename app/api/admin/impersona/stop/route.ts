import { NextResponse } from 'next/server'
import { requireAdmin, isUnauthorized } from '@/lib/auth-middleware'
import { auditFromAuth } from '@/lib/audit'
import { getImpersonation, clearImpersonation } from '@/lib/impersonation'

// POST /api/admin/impersona/stop — termina sessione impersonata
export async function POST() {
  const auth = await requireAdmin()
  if (isUnauthorized(auth)) return auth

  const imp = await getImpersonation()
  await clearImpersonation()

  if (imp) {
    await auditFromAuth(auth, {
      azione: 'admin.impersonation.stop',
      entita: 'host',
      entitaId: imp.hostId,
      dettagli: `Admin ${auth.user.email} ha terminato l'impersonation di hostId=${imp.hostId}`,
    })
  }

  return NextResponse.json({ ok: true, redirectTo: '/admin/host' })
}
