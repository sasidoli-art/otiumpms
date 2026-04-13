import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import type { Prisma } from '@prisma/client'
import {
  CATALOGO_MODULI,
  parseModuli,
  parseModuliEsteso,
  type ModuloStatoEsteso,
} from '@/lib/moduli'

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
 * Aggiorna lo stato di uno o più moduli per l'host — preserva modalita/prezzo
 * degli altri moduli non toccati.
 *
 * Body supportato (retrocompatibile):
 *   { moduli: { spa: true } }                                           // legacy boolean
 *   { moduli: { spa: { attivo: true, modalita: 'demo', prezzo: 0 } } }  // esteso
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
  const { moduli } = body as {
    moduli: Record<string, boolean | ModuloStatoEsteso>
  }

  if (!moduli || typeof moduli !== 'object') {
    return NextResponse.json(
      { error: 'Campo "moduli" obbligatorio (oggetto { moduloId: stato })' },
      { status: 422 }
    )
  }

  // Parte dal formato esteso per preservare modalita/prezzo degli altri moduli
  const nuovi = parseModuliEsteso(host.moduliAttivi)

  for (const [moduloId, valore] of Object.entries(moduli)) {
    if (!CATALOGO_MODULI.some(m => m.id === moduloId)) continue

    if (typeof valore === 'boolean') {
      // Legacy: solo attivo/disattivo
      nuovi[moduloId] = {
        attivo: valore,
        modalita: valore ? 'incluso' : 'off',
        prezzo: 0,
      }
    } else if (valore && typeof valore === 'object' && 'attivo' in valore) {
      // Formato esteso
      nuovi[moduloId] = {
        attivo: !!valore.attivo,
        modalita: valore.modalita ?? (valore.attivo ? 'incluso' : 'off'),
        prezzo: typeof valore.prezzo === 'number' ? valore.prezzo : 0,
        scadenzaDemo: valore.scadenzaDemo,
      }
    }
  }

  const updated = await prisma.host.update({
    where: { id },
    data: { moduliAttivi: nuovi as unknown as Prisma.InputJsonValue },
    select: { id: true, nomeAzienda: true, moduliAttivi: true },
  })

  return NextResponse.json({
    hostId: updated.id,
    nomeAzienda: updated.nomeAzienda,
    moduliAttivi: parseModuli(updated.moduliAttivi),
    moduliEsteso: parseModuliEsteso(updated.moduliAttivi),
  })
}
