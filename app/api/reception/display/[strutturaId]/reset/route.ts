import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

/**
 * POST /api/reception/display/[strutturaId]/reset
 * Resetta il display a idle. Pubblico (usato dal tablet).
 */
export async function POST(_req: NextRequest, { params: paramsPromise }: { params: Promise<{ strutturaId: string }> }) {
  const { strutturaId } = await paramsPromise

  await prisma.struttura.update({
    where: { id: strutturaId },
    data: { firmaDisplayPrenotazioneId: null, firmaDisplayAttivaAt: null },
  })

  return NextResponse.json({ ok: true })
}
