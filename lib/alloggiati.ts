/**
 * Generatore file Alloggiati Web — formato Polizia di Stato
 *
 * Tracciato record:
 *   Tipo 2 (Schedina alloggiato) — campi separati da tabulazione (\t)
 *
 *   Pos  Campo
 *   1    Tipo record (sempre "2")
 *   2    Data arrivo (gg/mm/aaaa)
 *   3    Notti di permanenza
 *   4    Cognome
 *   5    Nome
 *   6    Sesso (1=M, 2=F)
 *   7    Data nascita (gg/mm/aaaa)
 *   8    Codice ISTAT comune nascita (6 cifre) — "0" se estero
 *   9    Codice ISTAT provincia nascita (3 cifre) — "EE" se estero
 *   10   Codice ISTAT stato nascita (9 cifre, es. "100000100" per Italia)
 *   11   Codice ISTAT cittadinanza (9 cifre)
 *   12   Tipo documento (PPORT, IDENTE, PATEN, PATEN_INT, ALTRO)
 *   13   Numero documento
 *   14   Codice ISTAT comune rilascio — "0" se estero
 *   15   Codice ISTAT provincia rilascio — "EE" se estero (non usato dal tracciato)
 *   16   Tipo alloggiato (16=ospite singolo, 17=capogruppo, 18=membro, 19=capofam, 20=familiare)
 *
 * Testata (Tipo 1):
 *   1    "1"
 *   2    Codice struttura (assegnato dalla Questura)
 *   3    Data del file (gg/mm/aaaa)
 */

export interface AlloggiatiGuest {
  dataArrivo: Date
  dataPartenza: Date | null
  guestCognome: string
  guestNome: string
  guestSesso: string | null           // "M" | "F"
  guestDataNascita: Date | null
  guestComuneNascitaIstat: string | null
  guestProvinciaNascita: string | null
  guestStatoNascitaIstat: string | null
  guestCittadinanzaIstat: string | null
  guestTipoDocumento: string | null
  guestNumeroDocumento: string | null
  guestComuneRilascioIstat: string | null
  guestProvinciaRilascio: string | null
}

function fmtData(d: Date): string {
  const giorno = String(d.getDate()).padStart(2, '0')
  const mese = String(d.getMonth() + 1).padStart(2, '0')
  const anno = d.getFullYear()
  return `${giorno}/${mese}/${anno}`
}

function calcolaNotti(arrivo: Date, partenza: Date | null): number {
  if (!partenza) return 1
  const diff = Math.round((partenza.getTime() - arrivo.getTime()) / (1000 * 60 * 60 * 24))
  return Math.max(diff, 1)
}

function mapSesso(s: string | null): string {
  if (s === 'M') return '1'
  if (s === 'F') return '2'
  return '1' // default
}

function mapTipoDoc(t: string | null): string {
  const tipi: Record<string, string> = {
    PPORT: 'PASSO',
    IDENTE: 'CIDEN',
    PATEN: 'PATEN',
    PATEN_INT: 'PATIN',
    ALTRO: 'ALTRO',
  }
  return tipi[t ?? ''] ?? 'ALTRO'
}

export interface AlloggiatiValidation {
  valid: boolean
  campiMancanti: string[]
}

export function validateGuest(g: AlloggiatiGuest): AlloggiatiValidation {
  const mancanti: string[] = []
  if (!g.guestSesso) mancanti.push('Sesso')
  if (!g.guestDataNascita) mancanti.push('Data nascita')
  if (!g.guestComuneNascitaIstat && !g.guestStatoNascitaIstat) mancanti.push('Luogo nascita')
  if (!g.guestCittadinanzaIstat) mancanti.push('Cittadinanza')
  if (!g.guestTipoDocumento) mancanti.push('Tipo documento')
  if (!g.guestNumeroDocumento) mancanti.push('Numero documento')
  return { valid: mancanti.length === 0, campiMancanti: mancanti }
}

export function generateAlloggiatiFile(
  codiceStruttura: string,
  ospiti: AlloggiatiGuest[],
): string {
  const lines: string[] = []

  // Testata (Tipo 1)
  lines.push(['1', codiceStruttura, fmtData(new Date())].join('\t'))

  // Record schedina (Tipo 2) — un record per ospite
  for (const g of ospiti) {
    const notti = calcolaNotti(g.dataArrivo, g.dataPartenza)
    const isEstero = g.guestStatoNascitaIstat !== '100000100'

    const fields = [
      '2',                                                    // tipo record
      fmtData(new Date(g.dataArrivo)),                       // data arrivo
      String(notti),                                          // notti
      g.guestCognome.toUpperCase(),                          // cognome
      g.guestNome.toUpperCase(),                             // nome
      mapSesso(g.guestSesso),                                // sesso
      g.guestDataNascita ? fmtData(new Date(g.guestDataNascita)) : '', // data nascita
      isEstero ? '0' : (g.guestComuneNascitaIstat ?? '0'),  // comune nascita ISTAT
      isEstero ? 'EE' : (g.guestProvinciaNascita ?? ''),    // provincia nascita
      g.guestStatoNascitaIstat ?? '100000100',               // stato nascita
      g.guestCittadinanzaIstat ?? '100000100',               // cittadinanza
      mapTipoDoc(g.guestTipoDocumento),                      // tipo documento
      (g.guestNumeroDocumento ?? '').toUpperCase(),           // numero documento
      g.guestComuneRilascioIstat ?? '0',                     // comune rilascio
      g.guestProvinciaRilascio ?? '',                         // provincia rilascio
      '16',                                                   // tipo alloggiato (singolo)
    ]

    lines.push(fields.join('\t'))
  }

  return lines.join('\r\n')
}
