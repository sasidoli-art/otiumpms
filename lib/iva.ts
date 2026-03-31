/**
 * Aliquote IVA italiane per hospitality.
 * Configurazione centralizzata usata da catalogo servizi e fatturazione.
 */

export const ALIQUOTE_IVA = [
  { valore: 0,  label: 'Esente',   codice: 'N4', descrizione: 'Esente art. 10 (tassa soggiorno, ecc.)' },
  { valore: 4,  label: '4%',       codice: '',   descrizione: 'Super ridotta (beni prima necessità)' },
  { valore: 5,  label: '5%',       codice: '',   descrizione: 'Ridotta (alcuni alimentari)' },
  { valore: 10, label: '10%',      codice: '',   descrizione: 'Ridotta (alloggio, ristorazione, room service)' },
  { valore: 22, label: '22%',      codice: '',   descrizione: 'Ordinaria (bevande alcoliche, SPA, servizi vari)' },
] as const

export type AliquotaIva = typeof ALIQUOTE_IVA[number]['valore']

/**
 * Categorie servizi con IVA suggerita.
 * L'host può sempre sovrascrivere l'aliquota per ogni servizio.
 */
export const CATEGORIE_SERVIZIO = [
  { id: 'ALLOGGIO',      label: 'Alloggio',           ivaSuggerita: 10, esempi: 'Camera, suite, appartamento' },
  { id: 'RISTORAZIONE',  label: 'Ristorazione',       ivaSuggerita: 10, esempi: 'Colazione, pranzo, cena, room service' },
  { id: 'BEVANDE',       label: 'Bevande',            ivaSuggerita: 22, esempi: 'Vino, cocktail, minibar alcolici' },
  { id: 'SPA',           label: 'SPA & Benessere',    ivaSuggerita: 22, esempi: 'Massaggi, trattamenti, percorsi' },
  { id: 'SERVIZI',       label: 'Servizi',            ivaSuggerita: 22, esempi: 'Parcheggio, lavanderia, transfer, noleggio' },
  { id: 'PRODOTTI',      label: 'Prodotti',           ivaSuggerita: 22, esempi: 'Bottiglia vino, souvenir, prodotti SPA' },
  { id: 'DEGUSTAZIONE',  label: 'Degustazione',       ivaSuggerita: 10, esempi: 'Wine tasting, food pairing, cooking class' },
  { id: 'ESCURSIONE',    label: 'Escursioni & Tour',  ivaSuggerita: 22, esempi: 'Tour guidati, bike tour, trekking' },
  { id: 'TASSA',         label: 'Tasse & Imposte',    ivaSuggerita: 0,  esempi: 'Tassa di soggiorno (esente IVA)' },
  { id: 'ALTRO',         label: 'Altro',              ivaSuggerita: 22, esempi: 'Servizi non classificati' },
] as const

/**
 * Dato un array di addebiti, calcola il riepilogo IVA per la fatturazione.
 * Raggruppa per aliquota e calcola imponibile + imposta.
 */
export function calcolaRiepilogoIva(addebiti: { totale: number; aliquotaIva: number }[]): {
  aliquota: number
  imponibile: number
  imposta: number
  totale: number
}[] {
  const perAliquota: Record<number, { imponibile: number }> = {}

  for (const a of addebiti) {
    if (!perAliquota[a.aliquotaIva]) perAliquota[a.aliquotaIva] = { imponibile: 0 }
    // Il totale dell'addebito è IVA inclusa, scorporiamo
    const imponibile = a.totale / (1 + a.aliquotaIva / 100)
    perAliquota[a.aliquotaIva].imponibile += imponibile
  }

  return Object.entries(perAliquota)
    .map(([alq, { imponibile }]) => {
      const aliquota = parseFloat(alq)
      const imp = Math.round(imponibile * 100) / 100
      const imposta = Math.round((imponibile * aliquota / 100) * 100) / 100
      return { aliquota, imponibile: imp, imposta, totale: Math.round((imp + imposta) * 100) / 100 }
    })
    .sort((a, b) => a.aliquota - b.aliquota)
}
