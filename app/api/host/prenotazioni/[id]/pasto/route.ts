import { NextRequest, NextResponse } from 'next/server'
import { requireHost, isUnauthorized } from '@/lib/auth-middleware'
import { auditFromAuth } from '@/lib/audit'
import { prisma } from '@/lib/db'

/**
 * GET /api/host/prenotazioni/[id]/pasto
 * Restituisce il piano pasto della prenotazione + config struttura.
 */
export async function GET(
  _: NextRequest,
  { params: paramsPromise }: { params: Promise<{ id: string }> },
) {
  const auth = await requireHost()
  if (isUnauthorized(auth)) return auth
  const { id } = await paramsPromise

  const pren = await prisma.prenotazione.findFirst({
    where: { id, hostId: auth.user.hostId },
    select: {
      id: true,
      numOspiti: true,
      dataArrivo: true,
      dataPartenza: true,
      pianoPasto: true,
      struttura: {
        select: {
          configPasti: { orderBy: { tipoPasto: 'asc' } },
        },
      },
    },
  })

  if (!pren) return NextResponse.json({ error: 'Non trovata' }, { status: 404 })

  // Calcola coperti previsti
  const notti = pren.dataPartenza
    ? Math.max(1, Math.round((new Date(pren.dataPartenza).getTime() - new Date(pren.dataArrivo).getTime()) / 86400000))
    : 1

  const piano = pren.pianoPasto?.piano || 'PERNOTTAMENTO_COLAZIONE'
  const pastiInclusi = getPastiInclusi(piano, pren.pianoPasto?.pastiExtra || [], pren.pianoPasto?.pastiEsclusi || [])

  return NextResponse.json({
    pianoPasto: pren.pianoPasto,
    configStruttura: pren.struttura?.configPasti || [],
    riepilogo: {
      piano,
      pastiInclusi,
      notti,
      ospiti: pren.numOspiti,
      copertiColazione: pastiInclusi.includes('COLAZIONE') ? notti * pren.numOspiti : 0,
      copertiPranzo: pastiInclusi.includes('PRANZO') ? notti * pren.numOspiti : 0,
      copertiCena: pastiInclusi.includes('CENA') ? notti * pren.numOspiti : 0,
    },
  })
}

/**
 * POST /api/host/prenotazioni/[id]/pasto
 * Assegna o aggiorna il piano pasto di una prenotazione.
 * Body: { piano, incluso?, note?, sovraprezzoGiornaliero?, pastiExtra?, pastiEsclusi? }
 */
export async function POST(
  req: NextRequest,
  { params: paramsPromise }: { params: Promise<{ id: string }> },
) {
  const auth = await requireHost()
  if (isUnauthorized(auth)) return auth
  const { id } = await paramsPromise

  const pren = await prisma.prenotazione.findFirst({
    where: { id, hostId: auth.user.hostId },
    select: { id: true },
  })
  if (!pren) return NextResponse.json({ error: 'Non trovata' }, { status: 404 })

  const body = await req.json()
  const { piano, incluso, note, sovraprezzoGiornaliero, pastiExtra, pastiEsclusi } = body

  const pianiValidi = ['SOLO_PERNOTTAMENTO', 'PERNOTTAMENTO_COLAZIONE', 'MEZZA_PENSIONE', 'PENSIONE_COMPLETA', 'ALL_INCLUSIVE']
  if (!piano || !pianiValidi.includes(piano)) {
    return NextResponse.json({ error: 'Piano non valido' }, { status: 400 })
  }

  const result = await prisma.pastoPrenotazione.upsert({
    where: { prenotazioneId: id },
    update: {
      piano,
      incluso: incluso ?? true,
      note: note || null,
      sovraprezzoGiornaliero: sovraprezzoGiornaliero ?? null,
      pastiExtra: pastiExtra || [],
      pastiEsclusi: pastiEsclusi || [],
    },
    create: {
      prenotazioneId: id,
      piano,
      incluso: incluso ?? true,
      note: note || null,
      sovraprezzoGiornaliero: sovraprezzoGiornaliero ?? null,
      pastiExtra: pastiExtra || [],
      pastiEsclusi: pastiEsclusi || [],
    },
  })

  return NextResponse.json(result)
}

// Helper: dato un piano, restituisce quali pasti sono inclusi
function getPastiInclusi(piano: string, extra: string[], esclusi: string[]): string[] {
  const base: Record<string, string[]> = {
    SOLO_PERNOTTAMENTO: [],
    PERNOTTAMENTO_COLAZIONE: ['COLAZIONE'],
    MEZZA_PENSIONE: ['COLAZIONE', 'CENA'],
    PENSIONE_COMPLETA: ['COLAZIONE', 'PRANZO', 'CENA'],
    ALL_INCLUSIVE: ['COLAZIONE', 'PRANZO', 'CENA'],
  }

  const pasti = new Set(base[piano] || [])
  for (const e of extra) pasti.add(e)
  for (const e of esclusi) pasti.delete(e)
  return Array.from(pasti)
}
