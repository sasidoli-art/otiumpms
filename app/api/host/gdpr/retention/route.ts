import { NextResponse } from 'next/server'
import { requireHost, isUnauthorized } from '@/lib/auth-middleware'
import { runAllRetentionPolicies, RETENTION_POLICIES } from '@/lib/gdpr-retention'

/** GET /api/host/gdpr/retention — lista policy di retention */
export async function GET() {
  const auth = await requireHost()
  if (isUnauthorized(auth)) return auth

  return NextResponse.json({
    policies: Object.values(RETENTION_POLICIES),
  })
}

/** POST /api/host/gdpr/retention — esegui pulizia manuale */
export async function POST() {
  const auth = await requireHost()
  if (isUnauthorized(auth)) return auth

  const results = await runAllRetentionPolicies(auth.user.hostId)

  return NextResponse.json({
    results,
    totalProcessed: results.reduce((s, r) => s + r.processed, 0),
    totalErrors: results.reduce((s, r) => s + r.errors, 0),
  })
}
