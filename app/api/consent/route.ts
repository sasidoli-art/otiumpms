import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getClientIp } from '@/lib/rate-limit'

/**
 * POST /api/consent — Pubblico
 * Registra il consenso di un utente/ospite (Art. 7 GDPR).
 * Body: { tipo, userId?, guestEmail?, hostId?, versione? }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { tipo, userId, guestEmail, hostId, versione } = body

    if (!tipo) return NextResponse.json({ error: 'tipo richiesto' }, { status: 400 })

    const consent = await prisma.userConsent.create({
      data: {
        tipo,
        userId: userId ?? null,
        guestEmail: guestEmail ?? null,
        hostId: hostId ?? null,
        versione: versione ?? '1.0',
        accettato: true,
        ip: getClientIp(req),
        userAgent: req.headers.get('user-agent')?.substring(0, 255) ?? null,
      },
    })

    return NextResponse.json({ ok: true, id: consent.id })
  } catch (err) {
    console.error('[consent]', err)
    return NextResponse.json({ error: 'Errore' }, { status: 500 })
  }
}
