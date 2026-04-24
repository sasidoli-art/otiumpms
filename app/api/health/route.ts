import { NextResponse } from 'next/server'
import { healthCheck } from '@/lib/health'

// Public endpoint — used by uptime checkers e SuperAdmin monitoring.
// Nessuna autenticazione: il body non contiene PII, solo stato servizi.
// Cache-Control: no-store per evitare che uptime checker vedano stati stantii.

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs' // Prisma non gira su edge

export async function GET() {
  const report = await healthCheck()

  const httpStatus =
    report.status === 'down' ? 503 :
    report.status === 'degraded' ? 200 :
    200

  return NextResponse.json(report, {
    status: httpStatus,
    headers: {
      'Cache-Control': 'no-store, must-revalidate',
      'X-Health-Status': report.status,
    },
  })
}

export async function HEAD() {
  const report = await healthCheck()
  const httpStatus = report.status === 'down' ? 503 : 200

  return new NextResponse(null, {
    status: httpStatus,
    headers: {
      'Cache-Control': 'no-store, must-revalidate',
      'X-Health-Status': report.status,
    },
  })
}
