import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { CATALOGO_MODULI, parseModuli } from '@/lib/moduli'

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

  // Validazione
  if (!moduloId || typeof attivo !== 'boolean') {
    return NextResponse.json(
      { error: 'moduloId e attivo sono obbligatori' },
      { status: 422 }
    )
  }

  const moduloEsiste = CATALOGO_MODULI.some(m => m.id === moduloId)
  if (!moduloEsiste) {
    return NextResponse.json({ error: 'Modulo non trovato nel catalogo' }, { status: 404 })
  }

  // Recupera host target
  const where = hostIds && hostIds.length > 0 ? { id: { in: hostIds } } : {}
  const hosts = await prisma.host.findMany({
    where,
    select: { id: true, moduliAttivi: true },
  })

  // Aggiorna in batch
  let aggiornati = 0
  for (const host of hosts) {
    const attuali = parseModuli(host.moduliAttivi)
    const nuovi = { ...attuali, [moduloId]: attivo }
    await prisma.host.update({
      where: { id: host.id },
      data: { moduliAttivi: nuovi },
    })
    aggiornati++
  }

  return NextResponse.json({ ok: true, aggiornati })
}
