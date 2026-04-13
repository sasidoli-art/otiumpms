import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireHost, isUnauthorized } from '@/lib/auth-middleware'
import { isModuloAttivo } from '@/lib/moduli'

/**
 * GET /api/host/wifi/access-codes
 * Lista dei codici walk-in dell'host (non revocati + revocati ultimi 30g).
 */
export async function GET() {
  const auth = await requireHost()
  if (isUnauthorized(auth)) return auth

  const host = await prisma.host.findUnique({
    where: { id: auth.user.hostId },
    select: { moduliAttivi: true },
  })
  if (!host || !isModuloAttivo(host.moduliAttivi, 'wifi')) {
    return NextResponse.json({ error: 'Modulo Wi-Fi non attivo' }, { status: 403 })
  }

  const trenta = new Date()
  trenta.setDate(trenta.getDate() - 30)

  const codes = await prisma.wifiAccessCode.findMany({
    where: {
      hostId: auth.user.hostId,
      OR: [
        { revocatoAt: null },
        { revocatoAt: { gte: trenta } },
      ],
    },
    orderBy: { createdAt: 'desc' },
    take: 100,
  })

  return NextResponse.json({ codes })
}

/**
 * POST /api/host/wifi/access-codes
 * Genera un nuovo codice walk-in.
 * Body: { durataMinuti: number, usiMax?: number, validGiorni?: number, note?: string }
 */
export async function POST(req: NextRequest) {
  const auth = await requireHost()
  if (isUnauthorized(auth)) return auth

  const host = await prisma.host.findUnique({
    where: { id: auth.user.hostId },
    select: { moduliAttivi: true },
  })
  if (!host || !isModuloAttivo(host.moduliAttivi, 'wifi')) {
    return NextResponse.json({ error: 'Modulo Wi-Fi non attivo' }, { status: 403 })
  }

  const body = await req.json()
  const durataMinuti = Number(body.durataMinuti)
  const usiMax = body.usiMax === undefined ? 1 : Number(body.usiMax)
  const validGiorni = Number(body.validGiorni ?? 1)
  const note = typeof body.note === 'string' ? body.note : null

  if (!Number.isFinite(durataMinuti) || durataMinuti <= 0) {
    return NextResponse.json({ error: 'durataMinuti non valida' }, { status: 422 })
  }
  if (!Number.isFinite(validGiorni) || validGiorni <= 0 || validGiorni > 365) {
    return NextResponse.json({ error: 'validGiorni non valido (1-365)' }, { status: 422 })
  }

  const codice = generaCodice()
  const validoFino = new Date()
  validoFino.setDate(validoFino.getDate() + validGiorni)

  const code = await prisma.wifiAccessCode.create({
    data: {
      hostId: auth.user.hostId,
      codice,
      durataMinuti,
      usiMax,
      validoFino,
      note,
      createdByUserId: auth.user.id,
    },
  })

  return NextResponse.json({ code }, { status: 201 })
}

// ─── Generazione codice alphanum sicuro (8 char, no ambigui) ────────────────

function generaCodice(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // no 0/O/1/I/L
  const bytes = new Uint8Array(8)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, b => chars[b % chars.length]).join('')
}
