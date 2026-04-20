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
const STATI_FATTURA = ['BOZZA', 'INVIATA', 'PAGATA', 'SCADUTA', 'ANNULLATA', 'STORNATA'] as const
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
  // Multi-valuta
  valutaBase: z.enum(['EUR', 'USD', 'GBP', 'CHF']).optional().nullable(),
  valuteAccettate: z.array(z.enum(['EUR', 'USD', 'GBP', 'CHF'])).optional(),
  // Modalita check-in
  modalitaCheckin: z.enum(['completo', 'leggero']).optional().nullable(),
  // AI Concierge
  conciergeAttivo: z.boolean().optional(),
  conciergeProvider: z.enum(['ollama', 'claude', 'openai']).optional().nullable(),
  conciergeApiKey: z.string().max(512).optional().nullable(),
  conciergeModel: z.string().max(128).trim().optional().nullable(),
  conciergeBaseUrl: z.string().url().max(255).optional().nullable().or(z.literal('')),
  conciergeSystemPrompt: z.string().max(4096).optional().nullable(),
  conciergeGdprAcceptedAt: z.string().datetime().optional().nullable(),
  // WhatsApp Business
  whatsappNumeroId: z.string().max(64).trim().optional().nullable(),
  whatsappAccessToken: z.string().max(512).optional().nullable(),
  whatsappVerifyToken: z.string().max(128).optional().nullable(),
})

export type ProfiloUpdateInput = z.infer<typeof profiloUpdateSchema>

// ─── Host: manutenzione ───────────────────────────────────────────────────────

const STATI_MANUTENZIONE = ['APERTA', 'IN_LAVORAZIONE', 'IN_ATTESA_PARTI', 'RISOLTA', 'ANNULLATA'] as const
const PRIORITA_MANUTENZIONE = ['BASSA', 'NORMALE', 'ALTA', 'URGENTE'] as const

export type StatoManutenzione = typeof STATI_MANUTENZIONE[number]

// ─── SPA: re-export da lib/spa (bounded context) per retrocompatibilità ─────
// Tipi/schemi/costanti SPA sono stati spostati in lib/spa/. I nuovi consumer
// devono importare da '@/lib/spa'. Questi re-export esistono per non rompere
// i consumer già in essere.
export {
  waiverSpaSchema,
  pagamentoSpaSchema,
  type WaiverSpaInput,
  type PagamentoSpaInput,
} from '@/lib/spa'
export type {
  MetodoPagamentoSpa as MetodoPagamentoSpaEnum,
  StatoPagamentoSpa as StatoPagamentoSpaEnum,
} from '@/lib/spa'

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

// ─── Abbonamento Upgrade ─────────────────────────────────────────────────────

export const abbonamentoUpgradeSchema = z.object({
  nuovoPiano: z.enum(['LIGHT', 'EVENTO_SINGOLO', 'VISIBILITA_MENSILE', 'PARTNER_PREMIUM']),
})

export type AbbonamentoUpgradeInput = z.infer<typeof abbonamentoUpgradeSchema>
