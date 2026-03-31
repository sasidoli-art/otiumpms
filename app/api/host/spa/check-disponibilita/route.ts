import { NextRequest, NextResponse } from 'next/server'
import { requireHostOrAdmin, isUnauthorized } from '@/lib/auth-middleware'
import { prisma } from '@/lib/db'

/**
 * GET /api/host/spa/check-disponibilita
 *   ?dataOra=2025-06-15T10:00   ISO datetime locale
 *   &durata=60                  minuti
 *   &trattamentoId=xxx          (optional) per filtrare terapisti con specializzazione
 *   &terapistaId=xxx            (optional) controlla solo questo terapista
 *   &cabinaId=xxx               (optional) controlla solo questa cabina
 *
 * Returns:
 * {
 *   terapistiDisponibili: [{
 *     terapista: TerapistaSpa,
 *     disponibile: boolean,
 *     motivo?: string,            // es. "Nessuna fascia oraria configurata"
 *     cabineDisponibili: CabinaSpa[]
 *   }],
 *   cabineDisponibili: CabinaSpa[],   // tutte le cabine libere nel periodo
 * }
 */
export async function GET(req: NextRequest) {
  const auth = await requireHostOrAdmin()
  if (isUnauthorized(auth)) return auth

  const sp = req.nextUrl.searchParams
  const dataOraStr = sp.get('dataOra')
  const durataStr = sp.get('durata')
  const terapistaIdFilter = sp.get('terapistaId')
  const cabinaIdFilter = sp.get('cabinaId')

  if (!dataOraStr || !durataStr) {
    return NextResponse.json({ error: 'dataOra e durata sono obbligatori' }, { status: 422 })
  }

  const dataOra = new Date(dataOraStr)
  const durata = Number(durataStr)
  const dataFine = new Date(dataOra.getTime() + durata * 60_000)

  if (isNaN(dataOra.getTime()) || isNaN(durata)) {
    return NextResponse.json({ error: 'Parametri non validi' }, { status: 422 })
  }

  // Helper: ore come minuti da mezzanotte
  const toMins = (hhmm: string) => {
    const [h, m] = hhmm.split(':').map(Number)
    return h * 60 + m
  }
  const iniMins = dataOra.getHours() * 60 + dataOra.getMinutes()
  const finMins = dataFine.getHours() * 60 + dataFine.getMinutes()
  // Giorno settimana (0=lunedì come da convenzione itailana, oppure date-fns: 0=dom, 1=lun...)
  // JS getDay(): 0=dom, 1=lun..6=sab  → convertiamo a 0=lun..6=dom
  const giornoJs = dataOra.getDay() // 0=dom
  const giorno = giornoJs === 0 ? 6 : giornoJs - 1 // 0=lun..6=dom

  // Load all active therapists
  const whereTerap: Record<string, unknown> = { hostId: auth.user.hostId, attivo: true }
  if (terapistaIdFilter) whereTerap.id = terapistaIdFilter

  const terapisti = await prisma.terapistaSpa.findMany({
    where: whereTerap,
    include: {
      disponibilita: { where: { attiva: true } },
    },
    orderBy: [{ nome: 'asc' }, { cognome: 'asc' }],
  })

  // Load conflicting appointments in the time slot (for all therapists)
  const apptConflittuali = await prisma.appuntamentoSpa.findMany({
    where: {
      hostId: auth.user.hostId,
      stato: { notIn: ['ANNULLATO', 'NO_SHOW'] },
      // The appointment overlaps [dataOra, dataFine) if:
      // appt.dataOra < dataFine AND appt.dataOra + appt.durata > dataOra
      dataOra: { lt: dataFine },
    },
    select: { terapistaId: true, cabinaId: true, dataOra: true, durata: true },
  })
  const apptSovrappostiIds = apptConflittuali.filter(a => {
    const aFine = new Date(a.dataOra.getTime() + a.durata * 60_000)
    return aFine > dataOra
  })

  const terapistiBusy = new Set(apptSovrappostiIds.map(a => a.terapistaId).filter(Boolean))
  const cabineBusy = new Set(apptSovrappostiIds.map(a => a.cabinaId).filter(Boolean))

  // Load all active cabine
  const whereCabin: Record<string, unknown> = { hostId: auth.user.hostId, attiva: true }
  if (cabinaIdFilter) whereCabin.id = cabinaIdFilter

  const tuttiCabine = await prisma.cabinaSpa.findMany({ where: whereCabin, orderBy: { nome: 'asc' } })
  const cabineDisponibili = tuttiCabine.filter(c => !cabineBusy.has(c.id))

  // Per ogni terapista, calcola disponibilità
  const terapistiDisponibili = terapisti.map(ter => {
    // 1. Controlla se ha disponibilità configurate
    const fasce = ter.disponibilita

    // Se nessuna fascia → non disponibile
    if (fasce.length === 0) {
      return { terapista: { id: ter.id, nome: ter.nome, cognome: ter.cognome, colore: ter.colore, bio: ter.bio, profiloPublico: ter.profiloPublico, specializzazioni: ter.specializzazioni }, disponibile: false, motivo: 'Nessuna disponibilità configurata', cabineDisponibili: [] }
    }

    // 2. Controlla BLOCCO: se c'è un blocco che copre questo slot, non disponibile
    const blocco = fasce.find(f => {
      if (f.tipo !== 'BLOCCO') return false
      if (!f.data) return false
      const dBlocco = new Date(f.data)
      const isBloccoGiorno = dBlocco.getFullYear() === dataOra.getFullYear() &&
        dBlocco.getMonth() === dataOra.getMonth() && dBlocco.getDate() === dataOra.getDate()
      if (!isBloccoGiorno) return false
      return toMins(f.orarioInizio) <= iniMins && toMins(f.orarioFine) >= finMins
    })
    if (blocco) {
      return { terapista: { id: ter.id, nome: ter.nome, cognome: ter.cognome, colore: ter.colore, bio: ter.bio, profiloPublico: ter.profiloPublico, specializzazioni: ter.specializzazioni }, disponibile: false, motivo: 'In ferie/blocco', cabineDisponibili: [] }
    }

    // 3. Controlla disponibilità SPECIFICA per quella data
    const dataISO = dataOra.toISOString().slice(0, 10)
    const specificaCheck = fasce.filter(f => {
      if (f.tipo !== 'SPECIFICA' || !f.data) return false
      const d = new Date(f.data)
      return d.getFullYear() === dataOra.getFullYear() &&
        d.getMonth() === dataOra.getMonth() && d.getDate() === dataOra.getDate()
    })
    // Se c'è almeno una SPECIFICA per questo giorno, usala
    const fasciaApplicabile = specificaCheck.length > 0 ? specificaCheck : fasce.filter(f => f.tipo === 'SETTIMANALE' && f.giorno === giorno)

    const copertoDaFascia = fasciaApplicabile.some(f =>
      toMins(f.orarioInizio) <= iniMins && toMins(f.orarioFine) >= finMins
    )
    if (!copertoDaFascia) {
      return { terapista: { id: ter.id, nome: ter.nome, cognome: ter.cognome, colore: ter.colore, bio: ter.bio, profiloPublico: ter.profiloPublico, specializzazioni: ter.specializzazioni }, disponibile: false, motivo: 'Fuori orario di disponibilità', cabineDisponibili: [] }
    }

    // 4. Controlla conflitti appuntamenti
    if (terapistiBusy.has(ter.id)) {
      return { terapista: { id: ter.id, nome: ter.nome, cognome: ter.cognome, colore: ter.colore, bio: ter.bio, profiloPublico: ter.profiloPublico, specializzazioni: ter.specializzazioni }, disponibile: false, motivo: 'Ha già un appuntamento in quella fascia', cabineDisponibili: [] }
    }

    // ✅ Disponibile!
    return { terapista: { id: ter.id, nome: ter.nome, cognome: ter.cognome, colore: ter.colore, bio: ter.bio, profiloPublico: ter.profiloPublico, specializzazioni: ter.specializzazioni }, disponibile: true, motivo: null, cabineDisponibili }
  })

  return NextResponse.json({
    terapistiDisponibili,
    cabineDisponibili,
    dataOra: dataOra.toISOString(),
    dataFine: dataFine.toISOString(),
  })
}
