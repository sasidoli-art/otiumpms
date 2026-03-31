/**
 * Engine Assegnazione Camera
 *
 * Trova la camera migliore per una prenotazione in base a:
 * 1. Stato HK: solo camere PULITA (priorità massima)
 * 2. Disponibilità: non occupata nel periodo richiesto
 * 3. Capacità: camera adatta al numero di ospiti
 * 4. Preferenze: piano, tipo, caratteristiche (se specificate)
 *
 * Modalità:
 * - AUTOMATICA: il sistema sceglie la migliore
 * - MANUALE: l'operatore vede la lista e sceglie
 * - AI: il concierge AI usa questo engine + preferenze ospite
 */

import { prisma } from '@/lib/db'

export interface CameraDisponibile {
  id: string
  nome: string
  capacita: number
  piano: number | null
  prezzoBase: number
  statoHK: string
  ultimaPulizia: Date | null
  noteHK: string | null
  score: number        // punteggio di idoneità (più alto = migliore)
  motivoScore: string  // spiegazione del punteggio
}

export interface FiltriAssegnazione {
  strutturaId: string
  dataArrivo: Date
  dataPartenza: Date | null
  numOspiti: number
  pianoPreferito?: number | null
  unitaEscluse?: string[]       // ID unità da escludere
  soloStato?: string             // filtra per stato HK specifico
}

/**
 * Trova le camere disponibili e le ordina per idoneità.
 */
export async function trovaCamereDisponibili(filtri: FiltriAssegnazione): Promise<CameraDisponibile[]> {
  const { strutturaId, dataArrivo, dataPartenza, numOspiti, pianoPreferito, unitaEscluse } = filtri

  // 1. Tutte le unità attive della struttura
  const unita = await prisma.unitaPrenotabile.findMany({
    where: {
      strutturaId,
      attiva: true,
      ...(unitaEscluse?.length ? { id: { notIn: unitaEscluse } } : {}),
    },
    select: {
      id: true,
      nome: true,
      capacita: true,
      piano: true,
      prezzoBase: true,
      statoHK: true,
      ultimaPulizia: true,
      noteHK: true,
    },
  })

  // 2. Prenotazioni che occupano nel periodo
  const arrivo = new Date(dataArrivo)
  const partenza = dataPartenza ? new Date(dataPartenza) : new Date(arrivo.getTime() + 86400000)

  const prenotazioniOccupate = await prisma.prenotazione.findMany({
    where: {
      strutturaId,
      stato: { in: ['CONFERMATA', 'RICHIESTA'] },
      unitaId: { not: null },
      OR: [
        { dataArrivo: { lt: partenza }, dataPartenza: { gt: arrivo } },
        { dataArrivo: { lt: partenza }, dataPartenza: null },
      ],
    },
    select: { unitaId: true },
  })

  // 3. Prenotazioni importate da canali che occupano nel periodo
  const canaliOccupati = await prisma.prenotazioneCanale.findMany({
    where: {
      canale: { strutturaId },
      dataInizio: { lt: partenza },
      dataFine: { gt: arrivo },
    },
    select: { canale: { select: { unitaId: true } } },
  })

  const unitaOccupate = new Set<string>()
  for (const p of prenotazioniOccupate) {
    if (p.unitaId) unitaOccupate.add(p.unitaId)
  }
  for (const c of canaliOccupati) {
    if (c.canale.unitaId) unitaOccupate.add(c.canale.unitaId)
  }

  // 4. Calcola punteggio per ogni unità
  const risultati: CameraDisponibile[] = []

  for (const u of unita) {
    if (unitaOccupate.has(u.id)) continue // già occupata

    let score = 0
    const motivi: string[] = []

    // Stato HK: PULITA = +100, IN_PULIZIA = +30, SPORCA = -50
    if (u.statoHK === 'PULITA') { score += 100; motivi.push('Pulita') }
    else if (u.statoHK === 'IN_PULIZIA') { score += 30; motivi.push('In pulizia') }
    else if (u.statoHK === 'SPORCA') { score -= 50; motivi.push('Da pulire') }
    else if (u.statoHK === 'MANUTENZIONE' || u.statoHK === 'FUORI_SERVIZIO') { continue } // escludi

    // Capacità: camera adatta = +50, troppo grande = +20, troppo piccola = escludi
    if (u.capacita >= numOspiti) {
      if (u.capacita === numOspiti) { score += 50; motivi.push('Capacità esatta') }
      else if (u.capacita <= numOspiti + 1) { score += 40; motivi.push('Capacità adeguata') }
      else { score += 20; motivi.push('Capacità ampia') }
    } else {
      continue // camera troppo piccola
    }

    // Piano preferito
    if (pianoPreferito !== undefined && pianoPreferito !== null && u.piano !== null) {
      if (u.piano === pianoPreferito) { score += 30; motivi.push(`Piano ${pianoPreferito} (preferito)`) }
      else { score += 10 }
    }

    // Prezzo: camere meno costose leggermente preferite per ottimizzare revenue
    if (u.prezzoBase > 0) {
      score += Math.max(0, 20 - Math.floor(u.prezzoBase / 50))
    }

    risultati.push({
      id: u.id,
      nome: u.nome,
      capacita: u.capacita,
      piano: u.piano,
      prezzoBase: u.prezzoBase,
      statoHK: u.statoHK,
      ultimaPulizia: u.ultimaPulizia,
      noteHK: u.noteHK,
      score,
      motivoScore: motivi.join(', '),
    })
  }

  // Ordina per score decrescente
  risultati.sort((a, b) => b.score - a.score)

  return risultati
}

/**
 * Assegnazione automatica: restituisce la camera migliore.
 */
export async function assegnaAutomaticamente(filtri: FiltriAssegnazione): Promise<CameraDisponibile | null> {
  const camere = await trovaCamereDisponibili(filtri)
  return camere.length > 0 ? camere[0] : null
}

/**
 * Assegna una camera specifica a una prenotazione.
 */
export async function assegnaCamera(prenotazioneId: string, unitaId: string, assegnatoDa: string): Promise<boolean> {
  const updated = await prisma.prenotazione.update({
    where: { id: prenotazioneId },
    data: { unitaId },
  })

  // Log audit
  const { audit } = await import('@/lib/audit')
  await audit({
    hostId: updated.hostId,
    azione: 'camera.assegnata',
    entita: 'prenotazione',
    entitaId: prenotazioneId,
    dettagli: `Camera assegnata da ${assegnatoDa}: unitaId=${unitaId}`,
  })

  return true
}
