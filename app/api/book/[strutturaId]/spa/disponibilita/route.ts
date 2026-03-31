import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { format, addDays, eachDayOfInterval } from 'date-fns'

/**
 * GET /api/book/[strutturaId]/spa/disponibilita
 *   ?data=2025-06-15       — giorno da controllare
 *   &trattamentoId=xxx     — (optional) filtro trattamento
 *   &percorsoId=xxx        — (optional) filtro percorso
 *   &terapistaId=xxx       — (optional) filtro terapista
 *
 * Returns available time slots for the given day
 */
export async function GET(
  req: NextRequest,
  { params: paramsPromise }: { params: Promise<{ strutturaId: string }> },
) {
  const params = await paramsPromise
  const sp = req.nextUrl.searchParams
  const dataStr = sp.get('data')
  const trattamentoId = sp.get('trattamentoId')
  const percorsoId = sp.get('percorsoId')
  const terapistaId = sp.get('terapistaId')

  if (!dataStr) {
    return NextResponse.json({ error: 'Parametro data obbligatorio' }, { status: 400 })
  }

  const struttura = await prisma.struttura.findFirst({
    where: { id: params.strutturaId, attiva: true },
    select: { hostId: true },
  })
  if (!struttura) return NextResponse.json({ error: 'Non trovato' }, { status: 404 })

  // Determine duration
  let durata = 60
  if (trattamentoId) {
    const t = await prisma.trattamentoSpa.findFirst({ where: { id: trattamentoId, hostId: struttura.hostId } })
    if (t) durata = t.durata
  } else if (percorsoId) {
    const p = await prisma.percorsoBenessere.findFirst({ where: { id: percorsoId, hostId: struttura.hostId } })
    if (p) durata = p.durataMinuti
  }

  const dataTarget = new Date(dataStr + 'T00:00:00')
  if (isNaN(dataTarget.getTime())) {
    return NextResponse.json({ error: 'Data non valida' }, { status: 400 })
  }

  const giornoJs = dataTarget.getDay()
  const giorno = giornoJs === 0 ? 6 : giornoJs - 1

  const toMins = (hhmm: string) => {
    const [h, m] = hhmm.split(':').map(Number)
    return h * 60 + m
  }

  // Load therapists with availability
  const terapistiWhere: Record<string, unknown> = {
    hostId: struttura.hostId, attivo: true,
  }
  if (terapistaId) terapistiWhere.id = terapistaId

  const terapisti = await prisma.terapistaSpa.findMany({
    where: terapistiWhere,
    include: { disponibilita: { where: { attiva: true } } },
  })

  // Load existing appointments for this day
  const dayStart = new Date(dataStr + 'T00:00:00')
  const dayEnd = new Date(dataStr + 'T23:59:59')

  const apptGiorno = await prisma.appuntamentoSpa.findMany({
    where: {
      hostId: struttura.hostId,
      stato: { notIn: ['ANNULLATO', 'NO_SHOW'] },
      dataOra: { gte: dayStart, lte: dayEnd },
    },
    select: { terapistaId: true, cabinaId: true, dataOra: true, durata: true },
  })

  // Load cabins
  const cabine = await prisma.cabinaSpa.findMany({
    where: { hostId: struttura.hostId, attiva: true },
  })

  // Generate available slots (every 30 min from 8:00 to 20:00)
  const SLOT_INTERVAL = 30
  const START_HOUR = 8
  const END_HOUR = 20
  const slots: { ora: string; disponibile: boolean; terapisti: number }[] = []

  for (let mins = START_HOUR * 60; mins + durata <= END_HOUR * 60; mins += SLOT_INTERVAL) {
    const slotStart = new Date(dataTarget)
    slotStart.setHours(Math.floor(mins / 60), mins % 60, 0, 0)
    const slotEnd = new Date(slotStart.getTime() + durata * 60_000)

    const slotIniMins = mins
    const slotFinMins = mins + durata

    // Check if slot is in the past
    if (slotStart < new Date()) {
      slots.push({ ora: format(slotStart, 'HH:mm'), disponibile: false, terapisti: 0 })
      continue
    }

    // Find which therapists/cabins are busy during this slot
    const busy = apptGiorno.filter(a => {
      const aStart = a.dataOra.getTime()
      const aEnd = aStart + a.durata * 60_000
      return aStart < slotEnd.getTime() && aEnd > slotStart.getTime()
    })
    const terapistiBusy = new Set(busy.map(a => a.terapistaId).filter(Boolean))
    const cabineBusy = new Set(busy.map(a => a.cabinaId).filter(Boolean))

    const cabineLibere = cabine.filter(c => !cabineBusy.has(c.id)).length

    // Count available therapists for this slot
    let terapistiLiberi = 0
    for (const ter of terapisti) {
      if (terapistiBusy.has(ter.id)) continue
      const fasce = ter.disponibilita
      if (fasce.length === 0) continue

      // Check blocks
      const blocco = fasce.some(f => {
        if (f.tipo !== 'BLOCCO' || !f.data) return false
        const d = new Date(f.data)
        return d.getFullYear() === dataTarget.getFullYear() &&
          d.getMonth() === dataTarget.getMonth() && d.getDate() === dataTarget.getDate() &&
          toMins(f.orarioInizio) <= slotIniMins && toMins(f.orarioFine) >= slotFinMins
      })
      if (blocco) continue

      const specificaCheck = fasce.filter(f => {
        if (f.tipo !== 'SPECIFICA' || !f.data) return false
        const d = new Date(f.data)
        return d.getFullYear() === dataTarget.getFullYear() &&
          d.getMonth() === dataTarget.getMonth() && d.getDate() === dataTarget.getDate()
      })
      const fasciaApplicabile = specificaCheck.length > 0
        ? specificaCheck
        : fasce.filter(f => f.tipo === 'SETTIMANALE' && f.giorno === giorno)

      const coperto = fasciaApplicabile.some(f =>
        toMins(f.orarioInizio) <= slotIniMins && toMins(f.orarioFine) >= slotFinMins
      )
      if (coperto) terapistiLiberi++
    }

    const disponibile = terapistiLiberi > 0 && cabineLibere > 0
    slots.push({ ora: format(slotStart, 'HH:mm'), disponibile, terapisti: terapistiLiberi })
  }

  return NextResponse.json({
    data: dataStr,
    durata,
    slots,
  })
}
