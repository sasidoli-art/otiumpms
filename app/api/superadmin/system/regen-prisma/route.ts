import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

/**
 * POST /api/superadmin/system/regen-prisma
 * Trigger rigenerazione Prisma client (solo SUPERADMIN)
 *
 * Nota: in produzione questa operazione richiede un redeploy.
 * Qui verifichiamo solo che il database sia raggiungibile.
 */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'SUPERADMIN') {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
  }

  try {
    // Verifica connettività database
    const { prisma } = await import('@/lib/db')
    await prisma.$queryRaw`SELECT 1`

    return NextResponse.json({
      ok: true,
      message: 'Database raggiungibile. In produzione, rigenerare Prisma richiede un redeploy.',
    })
  } catch (err) {
    return NextResponse.json(
      { error: 'Database non raggiungibile', details: String(err) },
      { status: 500 },
    )
  }
}
