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
 * Genera 1 o più codici walk-in.
 *
 * Body: {
 *   durataMinuti: number,
 *   usiMax?: number,         (-1 = illimitati, default 1)
 *   validGiorni?: number,    (1-365, default 1)
 *   note?: string,
 *   codiceCustom?: string,   (lascia vuoto per random; valido solo se count=1)
 *   count?: number,          (default 1, max 100)
 *   prefix?: string,         (opzionale per bulk: es. "EVENT-" + suffisso random)
 * }
 *
 * Response: { codes: [...] }  (anche per count=1, sempre array per coerenza)
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
  const count = Math.max(1, Math.min(100, Number(body.count ?? 1)))
  const codiceCustom = typeof body.codiceCustom === 'string' ? body.codiceCustom.trim().toUpperCase() : ''
  const prefix = typeof body.prefix === 'string' ? body.prefix.trim().toUpperCase() : ''

  if (!Number.isFinite(durataMinuti) || durataMinuti <= 0) {
    return NextResponse.json({ error: 'durataMinuti non valida' }, { status: 422 })
  }
  if (!Number.isFinite(validGiorni) || validGiorni <= 0 || validGiorni > 365) {
    return NextResponse.json({ error: 'validGiorni non valido (1-365)' }, { status: 422 })
  }
  if (codiceCustom && count > 1) {
    return NextResponse.json({ error: 'codiceCustom valido solo con count=1' }, { status: 422 })
  }
  if (codiceCustom && !/^[A-Z0-9-]{3,32}$/.test(codiceCustom)) {
    return NextResponse.json({ error: 'codiceCustom deve essere 3-32 char, A-Z/0-9/-' }, { status: 422 })
  }
  if (prefix && !/^[A-Z0-9-]{1,16}$/.test(prefix)) {
    return NextResponse.json({ error: 'prefix max 16 char, A-Z/0-9/-' }, { status: 422 })
  }

  const validoFino = new Date()
  validoFino.setDate(validoFino.getDate() + validGiorni)

  const codes = []
  const errors: string[] = []

  for (let i = 0; i < count; i++) {
    const codice = codiceCustom || (prefix + generaCodice(prefix ? 6 : 8))
    try {
      const c = await prisma.wifiAccessCode.create({
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
      codes.push(c)
    } catch (err) {
      // Collisione su codice (unique constraint) — riprova 1 volta con random nuovo
      if (i === 0 && codiceCustom) {
        return NextResponse.json({ error: `Codice "${codiceCustom}" già esistente` }, { status: 409 })
      }
      const retry = prefix + generaCodice(prefix ? 6 : 8)
      try {
        const c = await prisma.wifiAccessCode.create({
          data: {
            hostId: auth.user.hostId,
            codice: retry,
            durataMinuti, usiMax, validoFino, note,
            createdByUserId: auth.user.id,
          },
        })
        codes.push(c)
      } catch {
        errors.push(`item ${i}: ${err instanceof Error ? err.message : 'errore'}`)
      }
    }
  }

  return NextResponse.json({ codes, errors }, { status: 201 })
}

// ─── Generazione codice alphanum sicuro (8 char, no ambigui) ────────────────

function generaCodice(len: number = 8): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // no 0/O/1/I/L
  const bytes = new Uint8Array(len)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, b => chars[b % chars.length]).join('')
}
