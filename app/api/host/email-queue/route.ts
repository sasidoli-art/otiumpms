import { NextResponse } from 'next/server'
import { requireHost, isUnauthorized } from '@/lib/auth-middleware'
import { auditFromAuth } from '@/lib/audit'
import { emailQueue } from '@/lib/email-queue'

/** GET /api/host/email-queue — email queue stats + dead letters */
export async function GET() {
  const auth = await requireHost()
  if (isUnauthorized(auth)) return auth

  return NextResponse.json({
    stats: emailQueue.getStats(),
    deadLetters: emailQueue.getDeadLetters(),
  })
}

/** DELETE /api/host/email-queue — clear dead letters */
export async function DELETE() {
  const auth = await requireHost()
  if (isUnauthorized(auth)) return auth

  emailQueue.clearDeadLetters()
  return NextResponse.json({ ok: true })
}
