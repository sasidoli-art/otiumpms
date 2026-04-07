import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { requireHost, isUnauthorized } from '@/lib/auth-middleware'
import { prisma } from '@/lib/db'
import { STRUTTURA_COOKIE } from '@/lib/struttura-attiva'

/**
 * POST /api/host/struttura-attiva
 * Body: { strutturaId: string }
 *
 * Setta il cookie `otm_struttura_id` dopo aver verificato che la struttura
 * appartenga all'host autenticato.
 */
export async function POST(req: Request) {
  const auth = await requireHost()
  if (isUnauthorized(auth)) return auth
  const hostId = auth.user.hostId

  let body: { strutturaId?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Body non valido' }, { status: 400 })
  }
  const strutturaId = body.strutturaId
  if (!strutturaId) {
    return NextResponse.json({ error: 'strutturaId mancante' }, { status: 400 })
  }

  // Verifica che la struttura appartenga all'host
  const struttura = await prisma.struttura.findFirst({
    where: { id: strutturaId, hostId },
    select: { id: true, nome: true },
  })
  if (!struttura) {
    return NextResponse.json({ error: 'Struttura non trovata' }, { status: 404 })
  }

  const store = await cookies()
  store.set(STRUTTURA_COOKIE, struttura.id, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 30, // 30 giorni
  })

  return NextResponse.json({ ok: true, struttura })
}

/**
 * DELETE /api/host/struttura-attiva
 * Rimuove il cookie (torna a "nessuna selezione" → redirect a seleziona).
 */
export async function DELETE() {
  const auth = await requireHost()
  if (isUnauthorized(auth)) return auth

  const store = await cookies()
  store.delete(STRUTTURA_COOKIE)
  return NextResponse.json({ ok: true })
}
