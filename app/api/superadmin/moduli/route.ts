import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import type { Prisma } from '@prisma/client'
import { CATALOGO_MODULI, parseModuli, parseModuliEsteso } from '@/lib/moduli'

/**
 * GET /api/superadmin/moduli
 * Restituisce il catalogo moduli con statistiche di utilizzo (count host per modulo).
 */
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'SUPERADMIN') {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
  }

  const hosts = await prisma.host.findMany({
    select: { moduliAttivi: true },
  })

  // Conta quanti host hanno ogni modulo attivo
  const usage: Record<string, number> = {}
  for (const m of CATALOGO_MODULI) {
    usage[m.id] = 0
  }

  for (const h of hosts) {
    const moduli = parseModuli(h.moduliAttivi)
    for (const [id, attivo] of Object.entries(moduli)) {
      if (attivo && usage[id] !== undefined) {
        usage[id]++
      }
    }
  }

  const catalogo = CATALOGO_MODULI.map(m => ({
    ...m,
    hostsAttivi: usage[m.id] ?? 0,
    totaleHost: hosts.length,
  }))

  return NextResponse.json({ catalogo, totaleHost: hosts.length })
}

/**
 * POST /api/superadmin/moduli
 * Bulk update: attiva/disattiva un modulo per tutti o specifici host.
 * Preserva modalita/prezzo degli altri moduli di ciascun host.
 * Body: { moduloId: string, attivo: boolean, hostIds?: string[] }
 */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'SUPERADMIN') {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
  }

  const body = await req.json()
  const { moduloId, attivo, hostIds } = body as {
    moduloId: string
    attivo: boolean
    hostIds?: string[]
  }

  if (!moduloId || typeof attivo !== 'boolean') {
    return NextResponse.json(
      { error: 'moduloId e attivo sono obbligatori' },
      { status: 422 }
    )
  }

  if (!CATALOGO_MODULI.some(m => m.id === moduloId)) {
    return NextResponse.json({ error: 'Modulo non trovato nel catalogo' }, { status: 404 })
  }

  // Target host
  const where = Array.isArray(hostIds) && hostIds.length > 0 ? { id: { in: hostIds } } : {}
  const hosts = await prisma.host.findMany({
    where,
    select: { id: true, moduliAttivi: true },
  })

  // Batch update in singola transazione — preserva modalita/prezzo degli altri moduli
  await prisma.$transaction(
    hosts.map(host => {
      const esteso = parseModuliEsteso(host.moduliAttivi)
      esteso[moduloId] = {
        attivo,
        modalita: attivo ? (esteso[moduloId]?.modalita ?? 'incluso') : 'off',
        prezzo: attivo ? (esteso[moduloId]?.prezzo ?? 0) : 0,
        scadenzaDemo: attivo ? esteso[moduloId]?.scadenzaDemo : undefined,
      }
      return prisma.host.update({
        where: { id: host.id },
        data: { moduliAttivi: esteso as unknown as Prisma.InputJsonValue },
      })
    })
  )

  return NextResponse.json({ ok: true, aggiornati: hosts.length })
}
