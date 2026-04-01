import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { CATALOGO_MODULI, parseModuli } from '@/lib/moduli'

type RouteParams = { params: Promise<{ id: string }> }

/**
 * GET /api/superadmin/host/[id]/moduli
 * Restituisce i moduli attivi dell'host con dettagli dal catalogo.
 */
export async function GET(
  _req: NextRequest,
  { params: paramsPromise }: RouteParams,
) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'SUPERADMIN') {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
  }

  const { id } = await paramsPromise
  const host = await prisma.host.findUnique({
    where: { id },
    select: { id: true, nomeAzienda: true, moduliAttivi: true },
  })

  if (!host) {
    return NextResponse.json({ error: 'Host non trovato' }, { status: 404 })
  }

  const moduliAttivi = parseModuli(host.moduliAttivi)

  const moduli = CATALOGO_MODULI.map(m => ({
    ...m,
    attivo: moduliAttivi[m.id] === true,
  }))

  return NextResponse.json({
    hostId: host.id,
    nomeAzienda: host.nomeAzienda,
    moduli,
  })
}

/**
 * PATCH /api/superadmin/host/[id]/moduli
 * Toggle moduli specifici — merge con quelli esistenti.
 * Body: { moduli: { spa: true, pos: false, ... } }
 */
export async function PATCH(
  req: NextRequest,
  { params: paramsPromise }: RouteParams,
) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'SUPERADMIN') {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
  }

  const { id } = await paramsPromise
  const host = await prisma.host.findUnique({
    where: { id },
    select: { id: true, moduliAttivi: true },
  })

  if (!host) {
    return NextResponse.json({ error: 'Host non trovato' }, { status: 404 })
  }

  const body = await req.json()
  const { moduli } = body as { moduli: Record<string, boolean> }

  if (!moduli || typeof moduli !== 'object') {
    return NextResponse.json(
      { error: 'Campo "moduli" obbligatorio (oggetto { moduloId: boolean })' },
      { status: 422 }
    )
  }

  // Merge con moduli attuali
  const attuali = parseModuli(host.moduliAttivi)
  const nuovi = { ...attuali }

  for (const [moduloId, attivo] of Object.entries(moduli)) {
    // Accetta solo moduli del catalogo
    if (CATALOGO_MODULI.some(m => m.id === moduloId)) {
      nuovi[moduloId] = attivo
    }
  }

  const updated = await prisma.host.update({
    where: { id },
    data: { moduliAttivi: nuovi },
    select: { id: true, nomeAzienda: true, moduliAttivi: true },
  })

  return NextResponse.json({
    hostId: updated.id,
    nomeAzienda: updated.nomeAzienda,
    moduliAttivi: parseModuli(updated.moduliAttivi),
  })
}
