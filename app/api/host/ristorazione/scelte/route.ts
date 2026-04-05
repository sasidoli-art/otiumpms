import { NextRequest, NextResponse } from 'next/server'
import { requireHost, isUnauthorized } from '@/lib/auth-middleware'
import { auditFromAuth } from '@/lib/audit'
import { prisma } from '@/lib/db'

/**
 * GET /api/host/ristorazione/scelte?data=2026-04-01&strutturaId=xxx
 *
 * Returns meal choices for a given date, grouped by tipoPasto -> piatto -> count.
 * Used by the kitchen to know what to prepare.
 */
export async function GET(req: NextRequest) {
  const auth = await requireHost()
  if (isUnauthorized(auth)) return auth

  const sp = req.nextUrl.searchParams
  const dataStr = sp.get('data')
  if (!dataStr) {
    return NextResponse.json({ error: 'Parametro "data" obbligatorio' }, { status: 400 })
  }

  const strutturaId = sp.get('strutturaId')

  const giorno = new Date(dataStr + 'T00:00:00Z')
  const giornoFine = new Date(dataStr + 'T23:59:59.999Z')

  // Build where clause — always filter by host's structures
  const strutture = await prisma.struttura.findMany({
    where: {
      hostId: auth.user.hostId,
      ...(strutturaId ? { id: strutturaId } : {}),
    },
    select: { id: true, nome: true },
  })

  if (strutture.length === 0) {
    return NextResponse.json({ error: 'Nessuna struttura trovata' }, { status: 404 })
  }

  const strutturaIds = strutture.map((s) => s.id)
  const struttureMap = Object.fromEntries(strutture.map((s) => [s.id, s.nome]))

  // Fetch all choices for the date, across host's structures
  const scelte = await prisma.sceltaPastoOspite.findMany({
    where: {
      data: { gte: giorno, lte: giornoFine },
      prenotazione: {
        strutturaId: { in: strutturaIds },
      },
    },
    include: {
      piatto: {
        select: { id: true, nome: true, categoria: true },
      },
      prenotazione: {
        select: { strutturaId: true, guestNome: true, guestCognome: true },
      },
    },
  })

  // Group: tipoPasto -> piatto -> { count, guests[] }
  const grouped: Record<string, Record<string, {
    piattoId: string
    nome: string
    categoria: string
    quantitaTotale: number
    ospiti: { nome: string; quantita: number; note: string | null }[]
  }>> = {}

  for (const s of scelte) {
    const tipo = s.tipoPasto
    if (!grouped[tipo]) grouped[tipo] = {}

    const key = s.piattoId
    if (!grouped[tipo][key]) {
      grouped[tipo][key] = {
        piattoId: s.piatto.id,
        nome: s.piatto.nome,
        categoria: s.piatto.categoria,
        quantitaTotale: 0,
        ospiti: [],
      }
    }

    grouped[tipo][key].quantitaTotale += s.quantita
    grouped[tipo][key].ospiti.push({
      nome: s.guestNome || `${s.prenotazione.guestNome} ${s.prenotazione.guestCognome}`,
      quantita: s.quantita,
      note: s.note,
    })
  }

  // Convert to array format for easier frontend consumption
  const risultato = Object.entries(grouped).map(([tipoPasto, piattiMap]) => ({
    tipoPasto,
    piatti: Object.values(piattiMap).sort((a, b) => a.nome.localeCompare(b.nome)),
    totaleScelte: Object.values(piattiMap).reduce((sum, p) => sum + p.quantitaTotale, 0),
  }))

  return NextResponse.json({
    data: dataStr,
    strutture: struttureMap,
    pasti: risultato,
    totaleScelteGiorno: scelte.reduce((sum, s) => sum + s.quantita, 0),
  })
}
