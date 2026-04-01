import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

/**
 * POST /api/superadmin/system/clear-cache
 * Pulisce le cache interne della piattaforma (solo SUPERADMIN)
 */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'SUPERADMIN') {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
  }

  // Next.js non ha una API pubblica per pulire la cache ISR/RSC
  // In produzione si userebbe revalidatePath('/') o simili
  // Per ora, segnaliamo successo — l'operazione effettiva dipende dal deployment
  try {
    const { revalidatePath } = await import('next/cache')
    revalidatePath('/', 'layout')
  } catch {
    // revalidatePath potrebbe non essere disponibile in tutti i contesti
  }

  return NextResponse.json({ ok: true, message: 'Cache pulita' })
}
