/**
 * Schemi di validazione Zod per tutti gli endpoint API di Otium Week.
 * Ogni schema corrisponde al body o ai parametri di un gruppo di route.
 *
 * Uso standard in un route handler:
 *
 *   const parsed = parseBody(prenotazionePublicSchema, await req.json())
 *   if (parsed.error) return parsed.error
 *   const data = parsed.data  // typed, validated, sanitized
 */

import { z } from 'zod'
import { NextResponse } from 'next/server'

// ─── Helper ───────────────────────────────────────────────────────────────────

type ParseOk<T> = { data: T; error: null }
type ParseFail = { data: null; error: NextResponse }

/**
 * Valida `raw` contro `schema`.
 * In caso di errore restituisce una NextResponse 422 con i dettagli dei campi.
 */
export function parseBody<T>(
  schema: z.ZodSchema<T>,
  raw: unknown,
): ParseOk<T> | ParseFail {
  const result = schema.safeParse(raw)
  if (!result.success) {
    return {
      data: null,
      error: NextResponse.json(
        {
          error: 'Dati non validi',
          details: result.error.flatten().fieldErrors,
        },
        { status: 422 },
      ),
    }
  }
  return { data: result.data, error: null }
}

// ─── Enum helpers (evita `as never` nei filtri Prisma) ────────────────────────

const STATI_PRENOTAZIONE = ['RICHIESTA', 'CONFERMATA', 'ANNULLATA', 'COMPLETATA', 'NO_SHOW'] as const
const STATI_ABBONAMENTO = ['ATTIVO', 'SOSPESO', 'SCADUTO', 'IN_PROVA'] as const
const STATI_FATTURA = ['BOZZA', 'INVIATA', 'PAGATA', 'SCADUTA', 'ANNULLATA'] as const
const STATI_PAGAMENTO = ['IN_ATTESA', 'PAGATO', 'IN_RITARDO', 'ANNULLATO'] as const
const PIANI_TIPO = ['EVENTO_SINGOLO', 'VISIBILITA_MENSILE', 'PARTNER_PREMIUM'] as const

export type StatoPrenotazione = typeof STATI_PRENOTAZIONE[number]
export type StatoAbbonamento = typeof STATI_ABBONAMENTO[number]
export type StatoFatturaEnum = typeof STATI_FATTURA[number]
export type StatoPagamento = typeof STATI_PAGAMENTO[number]
export type PianoTipoEnum = typeof PIANI_TIPO[number]

export function isStatoPrenotazione(s: string): s is StatoPrenotazione {
  return (STATI_PRENOTAZIONE as readonly string[]).includes(s)
}
export function isStatoAbbonamento(s: string): s is StatoAbbonamento {
  return (STATI_ABBONAMENTO as readonly string[]).includes(s)
}
export function isStatoFattura(s: string): s is StatoFatturaEnum {
  return (STATI_FATTURA as readonly string[]).includes(s)
}
export function isStatoPagamento(s: string): s is StatoPagamento {
  return (STATI_PAGAMENTO as readonly string[]).includes(s)
}
export function isPianoTipo(s: string): s is PianoTipoEnum {
  return (PIANI_TIPO as readonly string[]).includes(s)
}

// ─── Prenotazione pubblica (ospite, no-auth) ──────────────────────────────────

export const prenotazionePublicSchema = z.object({
  guestNome: z.string().min(1, 'Nome obbligatorio').max(100).trim(),
  guestCognome: z.string().min(1, 'Cognome obbligatorio').max(100).trim(),
  guestEmail: z.string().email('Email non valida').max(254).trim().toLowerCase(),
  guestTelefono: z.string().max(30).trim().optional().nullable(),
  guestNote: z.string().max(2000).trim().optional().nullable(),
  dataArrivo: z.string().min(1, 'Data arrivo obbligatoria'),
  dataPartenza: z.string().optional().nullable(),
  numOspiti: z.coerce.number().int().min(1).max(999).default(1),
  unitaId: z.string().optional().nullable(),
})

export type PrenotazionePublicInput = z.infer<typeof prenotazionePublicSchema>

// ─── Messaggio chat (ospite pubblico) ─────────────────────────────────────────

export const messaggioChatSchema = z.object({
  testo: z.string().min(1, 'Testo obbligatorio').max(5000).trim(),
})

export type MessaggioChatInput = z.infer<typeof messaggioChatSchema>

// ─── Prenotazione host (creazione manuale) ────────────────────────────────────

export const prenotazioneHostSchema = z.object({
  strutturaId: z.string().optional().nullable(),
  unitaId: z.string().optional().nullable(),
  guestNome: z.string().min(1).max(100).trim(),
  guestCognome: z.string().min(1).max(100).trim(),
  guestEmail: z.string().email().max(254).trim().toLowerCase(),
  guestTelefono: z.string().max(30).trim().optional().nullable(),
  guestNote: z.string().max(2000).trim().optional().nullable(),
  guestLingua: z.enum(['it', 'en', 'de', 'fr', 'es']).optional().default('it'),
  dataArrivo: z.string().min(1),
  dataPartenza: z.string().optional().nullable(),
  numOspiti: z.coerce.number().int().min(1).max(999).default(1),
  fonte: z.string().max(50).optional(),
  prezzoTotale: z.coerce.number().min(0).optional().nullable(),
  noteInterne: z.string().max(5000).trim().optional().nullable(),
})

export type PrenotazioneHostInput = z.infer<typeof prenotazioneHostSchema>

// ─── Aggiornamento prenotazione (host) ────────────────────────────────────────

export const prenotazioneUpdateSchema = z.object({
  stato: z.enum(STATI_PRENOTAZIONE).optional(),
  prezzoTotale: z.coerce.number().min(0).optional().nullable(),
  acconto: z.coerce.number().min(0).optional().nullable(),
  tassaSoggiorno: z.coerce.number().min(0).optional().nullable(),
  noteInterne: z.string().max(5000).trim().optional().nullable(),
})

export type PrenotazioneUpdateInput = z.infer<typeof prenotazioneUpdateSchema>

// ─── Admin: crea cliente host ─────────────────────────────────────────────────

export const clienteCreateSchema = z.object({
  email: z.string().email().max(254).trim().toLowerCase(),
  password: z.string().min(8, 'Password minimo 8 caratteri').max(128),
  nome: z.string().min(1).max(100).trim(),
  cognome: z.string().min(1).max(100).trim(),
  nomeAzienda: z.string().min(1).max(255).trim(),
  partitaIva: z.string().max(20).trim().optional().nullable(),
  codiceFiscale: z.string().max(20).trim().optional().nullable(),
  telefono: z.string().max(30).trim().optional().nullable(),
  piano: z.enum(PIANI_TIPO).default('EVENTO_SINGOLO'),
  statoAbbonamento: z.enum(STATI_ABBONAMENTO).optional(),
  dataInizioAbb: z.string().optional().nullable(),
  dataFineAbb: z.string().optional().nullable(),
  indirizzo: z.string().max(255).trim().optional().nullable(),
  citta: z.string().max(100).trim().optional().nullable(),
  provincia: z.string().max(10).trim().optional().nullable(),
  cap: z.string().max(10).trim().optional().nullable(),
  regione: z.string().max(100).trim().optional().nullable(),
  note: z.string().max(2000).trim().optional().nullable(),
})

export type ClienteCreateInput = z.infer<typeof clienteCreateSchema>

// ─── Admin: crea fattura ──────────────────────────────────────────────────────

const rigaFatturaSchema = z.object({
  descrizione: z.string().min(1).max(500),
  quantita: z.coerce.number().int().min(1),
  prezzoUnitario: z.coerce.number().min(0),
  iva: z.coerce.number().min(0).max(100),
  totale: z.coerce.number().min(0),
})

export const fatturaCreateSchema = z.object({
  hostId: z.string().min(1),
  righe: z.array(rigaFatturaSchema).min(1, 'Almeno una riga obbligatoria'),
  imponibile: z.coerce.number().min(0),
  iva: z.coerce.number().min(0),
  totale: z.coerce.number().min(0),
  aliquotaIva: z.coerce.number().min(0).max(100).default(22),
  dataScadenza: z.string().optional().nullable(),
  note: z.string().max(2000).trim().optional().nullable(),
  clienteNome: z.string().min(1).max(255),
  clientePIva: z.string().max(20).optional().nullable(),
  clienteCF: z.string().max(20).optional().nullable(),
  clienteIndirizzo: z.string().max(255).optional().nullable(),
  clienteCitta: z.string().max(100).optional().nullable(),
  clienteCap: z.string().max(10).optional().nullable(),
  clienteProvincia: z.string().max(10).optional().nullable(),
  clientePaese: z.string().max(100).default('Italia'),
  clienteEmail: z.string().email().max(254).optional().nullable().or(z.literal('')),
  clientePec: z.string().email().max(254).optional().nullable().or(z.literal('')),
  clienteSDI: z.string().max(20).optional().nullable(),
})

export type FatturaCreateInput = z.infer<typeof fatturaCreateSchema>

// ─── Admin: aggiorna fattura ──────────────────────────────────────────────────

export const fatturaUpdateSchema = z.object({
  stato: z.enum(STATI_FATTURA).optional(),
  note: z.string().max(2000).trim().optional().nullable(),
})

export type FatturaUpdateInput = z.infer<typeof fatturaUpdateSchema>

// ─── Admin: crea pagamento ────────────────────────────────────────────────────

export const pagamentoCreateSchema = z.object({
  hostId: z.string().min(1),
  importo: z.coerce.number().positive('Importo deve essere positivo'),
  descrizione: z.string().max(500).trim().optional().nullable(),
  dataScadenza: z.string().optional().nullable(),
  abbonamentoId: z.string().optional().nullable(),
  metodo: z.string().max(50).optional().nullable(),
  riferimento: z.string().max(100).optional().nullable(),
  fatturaId: z.string().optional().nullable(),
  note: z.string().max(2000).optional().nullable(),
})

export type PagamentoCreateInput = z.infer<typeof pagamentoCreateSchema>

// ─── Admin: aggiorna pagamento ────────────────────────────────────────────────

export const pagamentoUpdateSchema = z.object({
  stato: z.enum(STATI_PAGAMENTO).optional(),
  metodo: z.string().max(50).optional().nullable(),
  riferimento: z.string().max(100).optional().nullable(),
  dataPagamento: z.string().optional().nullable(),
  note: z.string().max(2000).optional().nullable(),
})

export type PagamentoUpdateInput = z.infer<typeof pagamentoUpdateSchema>

// ─── Admin: aggiorna cliente host ─────────────────────────────────────────────

export const clienteUpdateSchema = z.object({
  nomeAzienda: z.string().min(1).max(255).trim().optional(),
  partitaIva: z.string().max(20).trim().optional().nullable(),
  codiceFiscale: z.string().max(20).trim().optional().nullable(),
  telefono: z.string().max(30).trim().optional().nullable(),
  piano: z.enum(PIANI_TIPO).optional(),
  statoAbbonamento: z.enum(STATI_ABBONAMENTO).optional(),
  dataInizioAbb: z.string().optional().nullable(),
  dataFineAbb: z.string().optional().nullable(),
  indirizzo: z.string().max(255).trim().optional().nullable(),
  citta: z.string().max(100).trim().optional().nullable(),
  provincia: z.string().max(10).trim().optional().nullable(),
  cap: z.string().max(10).trim().optional().nullable(),
  regione: z.string().max(100).trim().optional().nullable(),
  note: z.string().max(2000).trim().optional().nullable(),
  attivo: z.boolean().optional(),
})

export type ClienteUpdateInput = z.infer<typeof clienteUpdateSchema>

// ─── Host: profilo ────────────────────────────────────────────────────────────

export const profiloUpdateSchema = z.object({
  nomeAzienda: z.string().min(1).max(255).trim().optional(),
  partitaIva: z.string().max(20).trim().optional().nullable(),
  codiceFiscale: z.string().max(20).trim().optional().nullable(),
  telefono: z.string().max(30).trim().optional().nullable(),
  sitoWeb: z.string().url().max(255).optional().nullable().or(z.literal('')),
  indirizzo: z.string().max(255).trim().optional().nullable(),
  citta: z.string().max(100).trim().optional().nullable(),
  provincia: z.string().max(10).trim().optional().nullable(),
  cap: z.string().max(10).trim().optional().nullable(),
  regione: z.string().max(100).trim().optional().nullable(),
  fattNomeAzienda: z.string().max(255).trim().optional().nullable(),
  fattPartitaIva: z.string().max(20).trim().optional().nullable(),
  fattIndirizzo: z.string().max(255).trim().optional().nullable(),
  fattCitta: z.string().max(100).trim().optional().nullable(),
  fattCap: z.string().max(10).trim().optional().nullable(),
  fattProvincia: z.string().max(10).trim().optional().nullable(),
  fattPaese: z.string().max(100).optional().nullable(),
  fattEmail: z.string().email().max(254).optional().nullable().or(z.literal('')),
  fattPec: z.string().email().max(254).optional().nullable().or(z.literal('')),
  fattCodiceSDI: z.string().max(20).trim().optional().nullable(),
  regimeFiscale: z.string().max(10).optional().nullable(),
  // Canali di comunicazione email
  smtpHost: z.string().max(255).trim().optional().nullable(),
  smtpPort: z.coerce.number().int().min(1).max(65535).optional().nullable(),
  smtpUser: z.string().max(254).trim().optional().nullable(),
  smtpPass: z.string().max(512).optional().nullable(),
  emailMittente: z.string().max(320).trim().optional().nullable(),
})

export type ProfiloUpdateInput = z.infer<typeof profiloUpdateSchema>

// ─── Host: manutenzione ───────────────────────────────────────────────────────

const STATI_MANUTENZIONE = ['APERTA', 'IN_LAVORAZIONE', 'IN_ATTESA_PARTI', 'RISOLTA', 'ANNULLATA'] as const
const PRIORITA_MANUTENZIONE = ['BASSA', 'NORMALE', 'ALTA', 'URGENTE'] as const

export type StatoManutenzione = typeof STATI_MANUTENZIONE[number]

// ─── SPA: Waiver ──────────────────────────────────────────────────────────────

const ZONE_CORPO = ['testa', 'viso', 'collo', 'spalle', 'schiena', 'petto', 'addome', 'fianchi', 'mani', 'braccia', 'avambracci', 'gambe', 'piedi', 'caviglie'] as const

const CONDIZIONI_SALUTE = [
  'pressione_alta', 'pressione_bassa', 'problemi_cardiaci', 'diabete',
  'epilessia', 'problemi_circolatori', 'ernia_disco', 'artrite',
  'problemi_cutanei', 'operazioni_recenti', 'altro',
] as const

const ALLERGIE_COMUNI = [
  'lattice', 'oli_essenziali', 'profumi', 'nichel', 'altro',
] as const

export const waiverSpaSchema = z.object({
  appuntamentoId: z.string().cuid('ID appuntamento non valido'),
  firmaBase64: z.string().optional().nullable(),

  // Zone corpo (semplici checkbox)
  zoneTrattate: z.array(z.enum(ZONE_CORPO)).default([]).optional(),
  zoneEvitare: z.array(z.enum(ZONE_CORPO)).default([]).optional(),

  // Condizioni di salute (checkbox guidate)
  incinta: z.boolean().default(false),
  incintaMesi: z.number().min(1).max(9).optional().nullable(),
  condizioni: z.array(z.enum(CONDIZIONI_SALUTE)).default([]).optional(),
  condizioneAltro: z.string().max(300).trim().optional().nullable(),

  // Allergie (checkbox + testo)
  allergieSelezionate: z.array(z.enum(ALLERGIE_COMUNI)).default([]).optional(),
  allergieAltro: z.string().max(300).trim().optional().nullable(),

  // Legacy (retrocompatibilità)
  allergie: z.string().max(500).trim().optional().nullable(),
  patologie: z.string().max(500).trim().optional().nullable(),
  farmaci: z.string().max(500).trim().optional().nullable(),

  // Preferenze trattamento
  pressioneMassaggio: z.enum(['leggera', 'media', 'forte']).optional().nullable(),
  temperaturaPreferita: z.enum(['freddo', 'tiepido', 'caldo']).optional().nullable(),
  musicaPreferita: z.enum(['si', 'no', 'indifferente']).optional().nullable(),
  aromiPreferiti: z.enum(['si', 'senza']).optional().nullable(),
  notePreferenze: z.string().max(500).trim().optional().nullable(),

  // Accettazione
  accettazioneTermini: z.boolean().refine(v => v === true, 'Devi accettare i termini e le condizioni'),
  accettazionePrivacy: z.boolean().refine(v => v === true, 'Devi accettare la privacy policy'),
  consensoFoto: z.boolean().default(false),
  dichiarazioneNessuna: z.boolean().default(false),
})

export type WaiverSpaInput = z.infer<typeof waiverSpaSchema>

// ─── SPA: Pagamento ───────────────────────────────────────────────────────────

const METODI_PAGAMENTO_SPA = ['CAMERA_CREDIT', 'CONTANTI', 'CARTA', 'TRANSFERWISE'] as const
const STATI_PAGAMENTO_SPA = ['PENDENTE', 'RISCOSSO', 'RIMBORSO_RICHIESTO', 'RIMBORSATO'] as const

export const pagamentoSpaSchema = z.object({
  appuntamentoId: z.string().cuid('ID appuntamento non valido'),
  importo: z.number().positive('Importo deve essere positivo'),
  tipoImporto: z.enum(['TRATTAMENTO', 'PERCORSO', 'PERSONALIZZATO']).default('TRATTAMENTO'),
  metodo: z.enum(METODI_PAGAMENTO_SPA),
  unitaId: z.string().cuid().optional().nullable(), // se CAMERA_CREDIT
  ultimeQuatroCifre: z.string().length(4).regex(/^\d{4}$/).optional().nullable(), // se CARTA
  noteRiscossione: z.string().max(500).optional().nullable(),
})

export type PagamentoSpaInput = z.infer<typeof pagamentoSpaSchema>
export type MetodoPagamentoSpaEnum = typeof METODI_PAGAMENTO_SPA[number]
export type StatoPagamentoSpaEnum = typeof STATI_PAGAMENTO_SPA[number]
export type PrioritaManutenzione = typeof PRIORITA_MANUTENZIONE[number]

export function isStatoManutenzione(s: string): s is StatoManutenzione {
  return (STATI_MANUTENZIONE as readonly string[]).includes(s)
}
export function isPrioritaManutenzione(s: string): s is PrioritaManutenzione {
  return (PRIORITA_MANUTENZIONE as readonly string[]).includes(s)
}

export const manutenzioneCreateSchema = z.object({
  titolo: z.string().min(1).max(255).trim(),
  descrizione: z.string().max(5000).trim().optional().nullable(),
  categoria: z.string().min(1).max(100),
  priorita: z.enum(PRIORITA_MANUTENZIONE).default('NORMALE'),
  strutturaId: z.string().optional().nullable(),
  unitaId: z.string().optional().nullable(),
  assegnatoA: z.string().max(255).trim().optional().nullable(),
  costoStimato: z.coerce.number().min(0).optional().nullable(),
  note: z.string().max(5000).trim().optional().nullable(),
  dataScadenza: z.string().optional().nullable(),
})

export type ManutenzioneCreateInput = z.infer<typeof manutenzioneCreateSchema>

// ─── Host: eventi ─────────────────────────────────────────────────────────────

const CATEGORIE_EVENTO = [
  'MUSICA', 'ARTE', 'TEATRO', 'FOOD', 'SPORT',
  'FESTIVAL', 'FIERA', 'CONFERENZA', 'CINEMA', 'NATURA', 'FAMIGLIA', 'ALTRO',
] as const

export type CategoriaEventoEnum = typeof CATEGORIE_EVENTO[number]

export const eventoCreateSchema = z.object({
  titolo: z.string().min(1).max(500).trim(),
  descrizione: z.string().max(10000).trim().optional().nullable(),
  categoria: z.enum(CATEGORIE_EVENTO),
  dataInizio: z.string().min(1),
  dataFine: z.string().optional().nullable(),
  orario: z.string().max(100).trim().optional().nullable(),
  luogo: z.string().max(255).trim().optional().nullable(),
  citta: z.string().min(1).max(100).trim(),
  regione: z.string().min(1).max(100).trim(),
  indirizzo: z.string().max(255).trim().optional().nullable(),
  prezzo: z.string().max(100).trim().optional().nullable(),
  urlBiglietti: z.string().url().max(500).optional().nullable().or(z.literal('')),
  urlEvento: z.string().url().max(500).optional().nullable().or(z.literal('')),
  immagine: z.string().max(500).optional().nullable(),
  visibilitaNaz: z.boolean().default(false),
  regioni: z.array(z.string().max(100)).default([]),
})

export type EventoCreateInput = z.infer<typeof eventoCreateSchema>
