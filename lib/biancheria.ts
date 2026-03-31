/**
 * Engine Biancheria — calcola la biancheria necessaria per gli arrivi del giorno dopo.
 *
 * Flusso:
 * 1. Trova tutte le prenotazioni con check-in nella data target
 * 2. Per ogni camera, calcola la dotazione necessaria in base a numOspiti
 * 3. Genera un riepilogo con totali per articolo
 * 4. Può inviare la richiesta via email/WhatsApp/SMS/chat
 */

import { prisma } from '@/lib/db'
import { startOfDay, endOfDay, addDays, format } from 'date-fns'
import { it } from 'date-fns/locale'

// Dotazione default se non configurata per la camera
const DOTAZIONE_DEFAULT = [
  { articolo: 'Lenzuola matrimoniale', quantitaPerOspite: 0, quantitaFissa: 1, categoria: 'BIANCHERIA' },
  { articolo: 'Federa cuscino', quantitaPerOspite: 1, quantitaFissa: 0, categoria: 'BIANCHERIA' },
  { articolo: 'Asciugamano grande', quantitaPerOspite: 1, quantitaFissa: 0, categoria: 'BAGNO' },
  { articolo: 'Asciugamano piccolo', quantitaPerOspite: 1, quantitaFissa: 0, categoria: 'BAGNO' },
  { articolo: 'Tappetino bagno', quantitaPerOspite: 0, quantitaFissa: 1, categoria: 'BAGNO' },
  { articolo: 'Accappatoio', quantitaPerOspite: 1, quantitaFissa: 0, categoria: 'BAGNO' },
]

export interface RigaBiancheria {
  camera: string
  unitaId: string
  ospite: string
  numOspiti: number
  prenotazioneId: string
  articoli: { nome: string; quantita: number; categoria: string }[]
}

export interface RiepilogoBiancheria {
  dataConsegna: string
  righe: RigaBiancheria[]
  totaleCamere: number
  totaleArticoli: number
  riepilogoArticoli: { nome: string; quantita: number; categoria: string }[]
}

/**
 * Calcola la biancheria necessaria per tutti gli arrivi di una data.
 */
export async function calcolaBiancheria(hostId: string, dataTarget: Date): Promise<RiepilogoBiancheria> {
  const giorno = startOfDay(dataTarget)
  const fineGiorno = endOfDay(dataTarget)

  // Prenotazioni con check-in nella data target
  const prenotazioni = await prisma.prenotazione.findMany({
    where: {
      hostId,
      stato: { in: ['CONFERMATA', 'RICHIESTA'] },
      dataArrivo: { gte: giorno, lte: fineGiorno },
      unitaId: { not: null },
    },
    select: {
      id: true,
      guestNome: true,
      guestCognome: true,
      numOspiti: true,
      unitaId: true,
      unita: { select: { id: true, nome: true } },
    },
  })

  // Dotazioni personalizzate per host
  const dotazioniDB = await prisma.dotazioneBiancheria.findMany({
    where: { hostId },
  })

  const righe: RigaBiancheria[] = []
  const totaliArticoli: Record<string, { quantita: number; categoria: string }> = {}

  for (const p of prenotazioni) {
    if (!p.unita) continue

    // Dotazione per questa unità o default
    const dotazione = dotazioniDB.filter(d => d.unitaId === p.unitaId || d.unitaId === null)
    const articoliBase = dotazione.length > 0 ? dotazione : DOTAZIONE_DEFAULT

    const articoli: { nome: string; quantita: number; categoria: string }[] = []

    for (const d of articoliBase) {
      const qta = (d.quantitaPerOspite * p.numOspiti) + d.quantitaFissa
      if (qta <= 0) continue

      articoli.push({ nome: d.articolo, quantita: qta, categoria: d.categoria })

      if (!totaliArticoli[d.articolo]) totaliArticoli[d.articolo] = { quantita: 0, categoria: d.categoria }
      totaliArticoli[d.articolo].quantita += qta
    }

    righe.push({
      camera: p.unita.nome,
      unitaId: p.unita.id,
      ospite: `${p.guestCognome} ${p.guestNome}`,
      numOspiti: p.numOspiti,
      prenotazioneId: p.id,
      articoli,
    })
  }

  const riepilogoArticoli = Object.entries(totaliArticoli)
    .map(([nome, { quantita, categoria }]) => ({ nome, quantita, categoria }))
    .sort((a, b) => a.categoria.localeCompare(b.categoria) || a.nome.localeCompare(b.nome))

  return {
    dataConsegna: format(giorno, 'yyyy-MM-dd'),
    righe,
    totaleCamere: righe.length,
    totaleArticoli: riepilogoArticoli.reduce((s, a) => s + a.quantita, 0),
    riepilogoArticoli,
  }
}

/**
 * Genera il testo della richiesta biancheria (per email/WhatsApp/SMS).
 */
export function generaTestoRichiesta(riepilogo: RiepilogoBiancheria, nomeStruttura: string): string {
  const dataLabel = format(new Date(riepilogo.dataConsegna + 'T12:00'), 'EEEE d MMMM yyyy', { locale: it })

  let testo = `RICHIESTA BIANCHERIA — ${nomeStruttura}\n`
  testo += `Data consegna: ${dataLabel}\n`
  testo += `Camere: ${riepilogo.totaleCamere} | Articoli totali: ${riepilogo.totaleArticoli}\n`
  testo += `${'─'.repeat(40)}\n\n`

  // Riepilogo totali
  testo += `RIEPILOGO TOTALE:\n`
  for (const a of riepilogo.riepilogoArticoli) {
    testo += `  ${a.quantita}x ${a.nome}\n`
  }
  testo += `\n${'─'.repeat(40)}\n\n`

  // Dettaglio per camera
  testo += `DETTAGLIO PER CAMERA:\n\n`
  for (const r of riepilogo.righe) {
    testo += `${r.camera} — ${r.ospite} (${r.numOspiti} ospiti)\n`
    for (const a of r.articoli) {
      testo += `  ${a.quantita}x ${a.nome}\n`
    }
    testo += `\n`
  }

  return testo
}
