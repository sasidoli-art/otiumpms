import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireHostOrAdmin, isUnauthorized } from '@/lib/auth-middleware'
import { auditFromAuth } from '@/lib/audit'
import { logger } from '@/lib/logger'
import { upsertOspiteFromBooking } from '@/lib/crm'

type ImportRow = {
  nome: string
  cognome: string
  email: string
  telefono?: string
  struttura?: string
  unita?: string
  dataArrivo: string
  dataPartenza?: string
  numOspiti?: string
  prezzoTotale?: string
  fonte?: string
  stato?: string
  lingua?: string
  noteOspite?: string
  noteInterne?: string
}

type ImportResult = {
  totale: number
  importate: number
  errori: { riga: number; motivo: string }[]
}

const STATI_VALIDI = ['RICHIESTA', 'CONFERMATA', 'ANNULLATA', 'COMPLETATA', 'NO_SHOW']

// POST /api/host/prenotazioni/import — body: { righe: ImportRow[] }
export async function POST(req: NextRequest) {
  const auth = await requireHostOrAdmin()
  if (isUnauthorized(auth)) return auth

  let body: { righe: ImportRow[] }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'JSON non valido' }, { status: 400 })
  }

  if (!Array.isArray(body.righe) || body.righe.length === 0) {
    return NextResponse.json({ error: 'Nessuna riga da importare' }, { status: 400 })
  }

  if (body.righe.length > 500) {
    return NextResponse.json({ error: 'Massimo 500 righe per importazione' }, { status: 400 })
  }

  const hostId = auth.user.hostId

  // Pre-load strutture and unita for name matching
  const strutture = await prisma.struttura.findMany({
    where: { hostId, attiva: true },
    select: { id: true, nome: true },
  })
  const unita = await prisma.unitaPrenotabile.findMany({
    where: { struttura: { hostId }, attiva: true },
    select: { id: true, nome: true, strutturaId: true },
  })

  const strutturaMap = new Map(strutture.map(s => [s.nome.toLowerCase().trim(), s.id]))
  const unitaByStruttura = new Map<string, Map<string, string>>()
  for (const u of unita) {
    if (!unitaByStruttura.has(u.strutturaId)) unitaByStruttura.set(u.strutturaId, new Map())
    unitaByStruttura.get(u.strutturaId)!.set(u.nome.toLowerCase().trim(), u.id)
  }

  const result: ImportResult = { totale: body.righe.length, importate: 0, errori: [] }

  for (let i = 0; i < body.righe.length; i++) {
    const r = body.righe[i]
    const rigaNum = i + 2 // +2 because row 1 is header, and we're 0-indexed

    // Validate required fields
    if (!r.nome?.trim() || !r.cognome?.trim() || !r.email?.trim()) {
      result.errori.push({ riga: rigaNum, motivo: 'Nome, cognome o email mancanti' })
      continue
    }
    if (!r.dataArrivo?.trim()) {
      result.errori.push({ riga: rigaNum, motivo: 'Data arrivo mancante' })
      continue
    }

    const dataArrivo = new Date(r.dataArrivo.trim())
    if (isNaN(dataArrivo.getTime())) {
      result.errori.push({ riga: rigaNum, motivo: `Data arrivo non valida: "${r.dataArrivo}"` })
      continue
    }

    let dataPartenza: Date | null = null
    if (r.dataPartenza?.trim()) {
      dataPartenza = new Date(r.dataPartenza.trim())
      if (isNaN(dataPartenza.getTime())) {
        result.errori.push({ riga: rigaNum, motivo: `Data partenza non valida: "${r.dataPartenza}"` })
        continue
      }
    }

    // Match struttura by name
    let strutturaId: string | null = null
    let unitaId: string | null = null
    if (r.struttura?.trim()) {
      strutturaId = strutturaMap.get(r.struttura.trim().toLowerCase()) ?? null
      if (!strutturaId) {
        result.errori.push({ riga: rigaNum, motivo: `Struttura non trovata: "${r.struttura}"` })
        continue
      }
      // Match unita by name within struttura
      if (r.unita?.trim() && strutturaId) {
        const unitaMap = unitaByStruttura.get(strutturaId)
        unitaId = unitaMap?.get(r.unita.trim().toLowerCase()) ?? null
        if (!unitaId) {
          result.errori.push({ riga: rigaNum, motivo: `Unita "${r.unita}" non trovata in "${r.struttura}"` })
          continue
        }
      }
    }

    const stato = r.stato?.trim().toUpperCase()
    const statoFinale = stato && STATI_VALIDI.includes(stato) ? stato : 'CONFERMATA'

    const numOspiti = r.numOspiti ? parseInt(r.numOspiti) : 1
    const prezzoTotale = r.prezzoTotale ? parseFloat(r.prezzoTotale.replace(',', '.')) : null

    try {
      await prisma.prenotazione.create({
        data: {
          hostId,
          strutturaId,
          unitaId,
          guestNome: r.nome.trim(),
          guestCognome: r.cognome.trim(),
          guestEmail: r.email.trim(),
          guestTelefono: r.telefono?.trim() || null,
          guestLingua: r.lingua?.trim() || 'it',
          guestNote: r.noteOspite?.trim() || null,
          dataArrivo,
          dataPartenza,
          numOspiti: isNaN(numOspiti) ? 1 : numOspiti,
          prezzoTotale: prezzoTotale != null && !isNaN(prezzoTotale) ? prezzoTotale : null,
          fonte: r.fonte?.trim() || 'Import CSV',
          stato: statoFinale as never,
          noteInterne: r.noteInterne?.trim() || null,
        },
      })
      result.importate++
      // Sync OspiteCRM (non-bloccante)
      upsertOspiteFromBooking(hostId, {
        guestEmail: r.email.trim(),
        guestNome: r.nome.trim(),
        guestCognome: r.cognome.trim(),
        guestTelefono: r.telefono?.trim() || null,
      }).catch(() => {})
    } catch (err) {
      result.errori.push({
        riga: rigaNum,
        motivo: err instanceof Error ? err.message : 'Errore database',
      })
    }
  }

  logger.info('Import CSV prenotazioni completato', 'host/prenotazioni/import', {
    hostId,
    totale: result.totale,
    importate: result.importate,
    errori: result.errori.length,
  })

  return NextResponse.json(result)
}
