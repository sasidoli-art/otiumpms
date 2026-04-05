import { NextRequest, NextResponse } from 'next/server'
import { requireHostOrAdmin, isUnauthorized } from '@/lib/auth-middleware'
import { auditFromAuth } from '@/lib/audit'
import { prisma } from '@/lib/db'

/**
 * GET /api/host/spa/calendario?data=YYYY-MM-DD&view=day|week&raggruppamento=cabine|terapisti
 *
 * Returns:
 * {
 *   appuntamenti: AppuntamentoSpa[], // with relations
 *   cabine: CabinaSpa[],
 *   terapisti: TerapistaSpa[],
 *   slot: { [risorsa_id]: { inizio: string, fine: string, libero: boolean }[] }
 * }
 */
export async function GET(req: NextRequest) {
  const auth = await requireHostOrAdmin()
  if (isUnauthorized(auth)) return auth

  const sp = req.nextUrl.searchParams
  const dataParam = sp.get('data') || new Date().toISOString().slice(0, 10)
  const view = (sp.get('view') || 'day') as 'day' | 'week'

  const dataInizio = new Date(dataParam)
  dataInizio.setHours(0, 0, 0, 0)
  const dataFine = new Date(dataInizio)
  if (view === 'week') {
    dataFine.setDate(dataFine.getDate() + 7)
  } else {
    dataFine.setDate(dataFine.getDate() + 1)
  }

  const [appuntamenti, cabine, terapisti, tutteLeDisponibilita] = await Promise.all([
    prisma.appuntamentoSpa.findMany({
      where: {
        hostId: auth.user.hostId,
        dataOra: { gte: dataInizio, lt: dataFine },
        stato: { notIn: ['ANNULLATO', 'NO_SHOW'] },
      },
      include: {
        terapista: { select: { id: true, nome: true, cognome: true, colore: true } },
        cabina: { select: { id: true, nome: true, colore: true } },
        trattamento: { select: { id: true, nome: true, categoria: true, durata: true, colore: true } },
        percorso: { select: { id: true, nome: true, durataMinuti: true } },
      },
      orderBy: { dataOra: 'asc' },
    }),
    prisma.cabinaSpa.findMany({
      where: { hostId: auth.user.hostId, attiva: true },
      orderBy: { nome: 'asc' },
    }),
    prisma.terapistaSpa.findMany({
      where: { hostId: auth.user.hostId, attivo: true },
      orderBy: [{ nome: 'asc' }, { cognome: 'asc' }],
    }),
    prisma.disponibilitaTerapista.findMany({
      where: {
        hostId: auth.user.hostId,
        attiva: true,
        OR: [
          { tipo: 'SETTIMANALE' },
          { tipo: 'SPECIFICA', data: { gte: dataInizio, lt: dataFine } },
          { tipo: 'BLOCCO', data: { gte: dataInizio, lt: dataFine } },
        ],
      },
    }),
  ])

  // Calcola slot liberi per ogni cabina (view=day)
  const oreApertura = 8   // 08:00
  const oreChiusura = 21  // 21:00

  const slotCabine: Record<string, { inizio: string; fine: string; libero: boolean }[]> = {}
  if (view === 'day') {
    for (const cabina of cabine) {
      const appts = appuntamenti.filter(a => a.cabinaId === cabina.id)
      const slots: { inizio: string; fine: string; libero: boolean }[] = []
      let correnteMins = oreApertura * 60
      const fineMins = oreChiusura * 60

      const apptOrdinati = appts
        .map(a => ({
          inizioMins: a.dataOra.getHours() * 60 + a.dataOra.getMinutes(),
          fineMins: a.dataOra.getHours() * 60 + a.dataOra.getMinutes() + a.durata,
        }))
        .sort((a, b) => a.inizioMins - b.inizioMins)

      for (const appt of apptOrdinati) {
        if (appt.inizioMins > correnteMins) {
          slots.push({ inizio: minsToTime(correnteMins), fine: minsToTime(appt.inizioMins), libero: true })
        }
        slots.push({ inizio: minsToTime(appt.inizioMins), fine: minsToTime(appt.fineMins), libero: false })
        correnteMins = appt.fineMins
      }
      if (correnteMins < fineMins) {
        slots.push({ inizio: minsToTime(correnteMins), fine: minsToTime(fineMins), libero: true })
      }
      slotCabine[cabina.id] = slots
    }
  }

  // Build disponibilità terapisti per day view
  const disponibilitaDelGiorno: Record<string, { orarioInizio: string; orarioFine: string }[]> = {}
  if (view === 'day') {
    const giornoJs = dataInizio.getDay() // 0=Sun
    const giornoIT = giornoJs === 0 ? 6 : giornoJs - 1 // 0=Mon..6=Sun

    for (const t of terapisti) {
      const dispo = tutteLeDisponibilita.filter(d => d.terapistaId === t.id)
      const blocchi = dispo.filter(d => d.tipo === 'BLOCCO')
      const specifiche = dispo.filter(d => d.tipo === 'SPECIFICA')
      const settimanali = dispo.filter(d => d.tipo === 'SETTIMANALE' && d.giorno === giornoIT)

      if (blocchi.length > 0) {
        disponibilitaDelGiorno[t.id] = []
        continue
      }
      const slots = specifiche.length > 0 ? specifiche : settimanali
      disponibilitaDelGiorno[t.id] = slots.map(s => ({ orarioInizio: s.orarioInizio, orarioFine: s.orarioFine }))
    }
  }

  return NextResponse.json({ appuntamenti, cabine, terapisti, slotCabine, disponibilitaDelGiorno, dataInizio, dataFine })
}

function minsToTime(mins: number): string {
  const h = Math.floor(mins / 60).toString().padStart(2, '0')
  const m = (mins % 60).toString().padStart(2, '0')
  return `${h}:${m}`
}
