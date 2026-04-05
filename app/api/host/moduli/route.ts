import { NextRequest, NextResponse } from 'next/server'
import { requireHost, isUnauthorized } from '@/lib/auth-middleware'
import { auditFromAuth } from '@/lib/audit'
import { prisma } from '@/lib/db'
import { getModuliConStato, parseModuli, CATALOGO_MODULI } from '@/lib/moduli'

/**
 * GET /api/host/moduli
 * Restituisce la lista dei moduli con stato attivo/inattivo per l'host.
 */
export async function GET(_: NextRequest) {
  const auth = await requireHost()
  if (isUnauthorized(auth)) return auth

  const host = await prisma.host.findUnique({
    where: { id: auth.user.hostId },
    select: { moduliAttivi: true },
  })

  return NextResponse.json({
    moduli: getModuliConStato(host?.moduliAttivi),
    categorie: ['base', 'operativo', 'avanzato', 'integrazioni'],
  })
}

/**
 * PATCH /api/host/moduli
 * Attiva/disattiva moduli. Body: { moduloId: boolean, ... }
 * Es: { "spa": true, "lostFound": false }
 */
export async function PATCH(req: NextRequest) {
  const auth = await requireHost()
  if (isUnauthorized(auth)) return auth

  const body = await req.json()
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Body non valido' }, { status: 400 })
  }

  // Validazione: solo moduli esistenti
  const moduliValidi = CATALOGO_MODULI.map(m => m.id)
  const updates: Record<string, boolean> = {}
  for (const [key, value] of Object.entries(body)) {
    if (moduliValidi.includes(key) && typeof value === 'boolean') {
      updates[key] = value
    }
  }

  const host = await prisma.host.findUnique({
    where: { id: auth.user.hostId },
    select: { moduliAttivi: true },
  })

  const attuali = parseModuli(host?.moduliAttivi)
  const nuovi = { ...attuali, ...updates }

  await prisma.host.update({
    where: { id: auth.user.hostId },
    data: { moduliAttivi: nuovi },
  })

  return NextResponse.json({
    moduli: getModuliConStato(nuovi),
  })
}
