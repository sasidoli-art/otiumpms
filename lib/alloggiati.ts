/**
 * Generatore file Alloggiati Web — formato Polizia di Stato
 *
 * IMPORTANTE sul formato:
 *   La documentazione Alloggiati Web PS descrive un tracciato a larghezza fissa,
 *   ma il portale ufficiale https://alloggiatiweb.poliziadistato.it accetta (ed
 *   e` il formato utilizzato in produzione da gran parte dei PMS) il tracciato
 *   TAB-delimited con "Tipo 1" header e "Tipo 2" per ogni alloggiato.
 *   Manteniamo questo formato perche' e` quello effettivamente accettato.
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

export interface AlloggiatiAccompagnatore {
  nome: string
  cognome: string
  sesso: string | null
  dataNascita: Date | null
  luogoNascita: string | null
  provinciaNascita: string | null
  comuneNascitaIstat: string | null
  statoNascitaIstat: string | null
  cittadinanzaIstat: string | null
  tipoDocumento: string | null
  numeroDocumento: string | null
  comuneRilascioIstat: string | null
  provinciaRilascio: string | null
}

export interface AlloggiatiGuestWithAcc extends AlloggiatiGuest {
  accompagnatori?: AlloggiatiAccompagnatore[]
}

function buildRecord(
  arrivo: Date,
  partenza: Date | null,
  cognome: string,
  nome: string,
  sesso: string | null,
  dataNascita: Date | null,
  comuneNascitaIstat: string | null,
  provinciaNascita: string | null,
  statoNascitaIstat: string | null,
  cittadinanzaIstat: string | null,
  tipoDocumento: string | null,
  numeroDocumento: string | null,
  comuneRilascioIstat: string | null,
  provinciaRilascio: string | null,
  tipoAlloggiato: string,
): string {
  const notti = calcolaNotti(arrivo, partenza)
  const isEstero = statoNascitaIstat !== '100000100'

  return [
    '2',
    fmtData(new Date(arrivo)),
    String(notti),
    cognome.toUpperCase(),
    nome.toUpperCase(),
    mapSesso(sesso),
    dataNascita ? fmtData(new Date(dataNascita)) : '',
    isEstero ? '0' : (comuneNascitaIstat ?? '0'),
    isEstero ? 'EE' : (provinciaNascita ?? ''),
    statoNascitaIstat ?? '100000100',
    cittadinanzaIstat ?? '100000100',
    mapTipoDoc(tipoDocumento),
    (numeroDocumento ?? '').toUpperCase(),
    comuneRilascioIstat ?? '0',
    provinciaRilascio ?? '',
    tipoAlloggiato,
  ].join('\t')
}

// ─── Wrapper Prisma-friendly ──────────────────────────────────────────────────

type PrenotazioneAlloggiati = {
  dataArrivo: Date
  dataPartenza: Date | null
  guestNome: string
  guestCognome: string
  guestSesso: string | null
  guestDataNascita: Date | null
  guestLuogoNascita?: string | null
  guestComuneNascitaIstat: string | null
  guestProvinciaNascita: string | null
  guestStatoNascitaIstat: string | null
  guestCittadinanzaIstat: string | null
  guestTipoDocumento: string | null
  guestNumeroDocumento: string | null
  guestLuogoRilascio?: string | null
  guestComuneRilascioIstat: string | null
  guestProvinciaRilascio: string | null
  accompagnatori?: {
    nome: string
    cognome: string
    sesso: string | null
    dataNascita: Date | null
    luogoNascita: string | null
    provinciaNascita: string | null
    comuneNascitaIstat: string | null
    statoNascitaIstat: string | null
    cittadinanzaIstat: string | null
    tipoDocumento: string | null
    numeroDocumento: string | null
    comuneRilascioIstat: string | null
    provinciaRilascio: string | null
  }[]
}

type StrutturaAlloggiati = {
  alloggiatiCodiceStruttura: string | null
}

/**
 * Validazione di una prenotazione per Alloggiati Web.
 * Ritorna `valido=true` se tutti i campi obbligatori sono presenti per generare
 * il record PS, altrimenti lista dei campi mancanti in italiano.
 */
export function validaPrenotazioneAlloggiati(p: PrenotazioneAlloggiati): {
  valido: boolean
  campiMancanti: string[]
} {
  const mancanti: string[] = []
  if (!p.guestCognome?.trim()) mancanti.push('Cognome')
  if (!p.guestNome?.trim()) mancanti.push('Nome')
  if (!p.guestSesso) mancanti.push('Sesso')
  if (!p.guestDataNascita) mancanti.push('Data di nascita')
  if (!p.guestComuneNascitaIstat && !p.guestStatoNascitaIstat) {
    mancanti.push('Luogo di nascita')
  }
  if (!p.guestCittadinanzaIstat) mancanti.push('Cittadinanza')
  if (!p.guestTipoDocumento) mancanti.push('Tipo documento')
  if (!p.guestNumeroDocumento?.trim()) mancanti.push('Numero documento')
  return { valido: mancanti.length === 0, campiMancanti: mancanti }
}

/**
 * Validazione di un accompagnatore. Piu` permissiva (sesso/data/doc sono
 * richiesti, indirizzo di nascita no perche` gestito come "stato" estero).
 */
export function validaAccompagnatoreAlloggiati(a: NonNullable<PrenotazioneAlloggiati['accompagnatori']>[number]): {
  valido: boolean
  campiMancanti: string[]
} {
  const mancanti: string[] = []
  if (!a.cognome?.trim()) mancanti.push('Cognome')
  if (!a.nome?.trim()) mancanti.push('Nome')
  if (!a.sesso) mancanti.push('Sesso')
  if (!a.dataNascita) mancanti.push('Data di nascita')
  if (!a.cittadinanzaIstat) mancanti.push('Cittadinanza')
  if (!a.tipoDocumento) mancanti.push('Tipo documento')
  if (!a.numeroDocumento?.trim()) mancanti.push('Numero documento')
  return { valido: mancanti.length === 0, campiMancanti: mancanti }
}

/**
 * Wrapper che accetta direttamente oggetti Struttura + Prenotazione (shape Prisma)
 * e produce il file Alloggiati Web completo (testata + ospiti + accompagnatori).
 *
 * Salta automaticamente le prenotazioni con campi obbligatori mancanti.
 * Lancia eccezione se struttura non ha `alloggiatiCodiceStruttura`.
 */
export function generaFileAlloggiati(
  struttura: StrutturaAlloggiati,
  prenotazioni: PrenotazioneAlloggiati[],
): string {
  if (!struttura.alloggiatiCodiceStruttura) {
    throw new Error('Codice struttura Alloggiati Web non configurato sulla struttura')
  }
  const validi = prenotazioni.filter((p) => validaPrenotazioneAlloggiati(p).valido)
  return generateAlloggiatiFile(struttura.alloggiatiCodiceStruttura, validi)
}

export function generateAlloggiatiFile(
  codiceStruttura: string,
  ospiti: AlloggiatiGuestWithAcc[],
): string {
  const lines: string[] = []

  // Testata (Tipo 1)
  lines.push(['1', codiceStruttura, fmtData(new Date())].join('\t'))

  for (const g of ospiti) {
    const hasAcc = g.accompagnatori && g.accompagnatori.length > 0
    // 16=singolo, 19=capofamiglia (se ha accompagnatori)
    const tipoTitolare = hasAcc ? '19' : '16'

    lines.push(buildRecord(
      g.dataArrivo, g.dataPartenza,
      g.guestCognome, g.guestNome, g.guestSesso, g.guestDataNascita,
      g.guestComuneNascitaIstat, g.guestProvinciaNascita,
      g.guestStatoNascitaIstat, g.guestCittadinanzaIstat,
      g.guestTipoDocumento, g.guestNumeroDocumento,
      g.guestComuneRilascioIstat, g.guestProvinciaRilascio,
      tipoTitolare,
    ))

    // Accompagnatori (tipo 20 = familiare/accompagnatore)
    if (hasAcc) {
      for (const a of g.accompagnatori!) {
        lines.push(buildRecord(
          g.dataArrivo, g.dataPartenza,
          a.cognome, a.nome, a.sesso, a.dataNascita,
          a.comuneNascitaIstat, a.provinciaNascita,
          a.statoNascitaIstat, a.cittadinanzaIstat,
          a.tipoDocumento, a.numeroDocumento,
          a.comuneRilascioIstat, a.provinciaRilascio,
          '20',
        ))
      }
    }
  }

  return lines.join('\r\n')
}
