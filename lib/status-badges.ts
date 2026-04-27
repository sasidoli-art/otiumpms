/**
 * Status badge maps — un solo posto dove stato → { color, label, icon, pulse }.
 *
 * Uso:
 *   import { Badge } from '@/components/ui/badge'
 *   import { PRENOTAZIONE_BADGES } from '@/lib/status-badges'
 *
 *   <Badge {...PRENOTAZIONE_BADGES[p.stato]}>
 *     {PRENOTAZIONE_BADGES[p.stato].label}
 *   </Badge>
 *
 * Oppure, per badge "drop-in":
 *   <StatoBadge kind="prenotazione" value={p.stato} />
 *
 * Le mappe coprono TUTTI gli enum Stato* del progetto. Se aggiungi un enum,
 * aggiungi anche la mappa qui — così lo stile è uniforme ovunque.
 */
import type { LucideIcon } from 'lucide-react'
import {
  Check, CheckCheck, Clock, X, UserX, AlertCircle, Package, Truck,
  Sparkles, Pause, Ban, Euro, Send, MailCheck, Wrench, Settings2,
  FileText, FileCheck2, Play, PauseCircle, Inbox, MessageSquare,
  ShieldCheck, FileX2, Trash2, RefreshCw, Calendar, Hourglass,
} from 'lucide-react'
import type { BadgeColor } from '@/components/ui/badge'

// ────────────────────────────────────────────────────────────────────────────
// Shared config type
// ────────────────────────────────────────────────────────────────────────────

export type BadgeConfig = {
  color: BadgeColor
  label: string
  icon?: LucideIcon
  /** Se true, il dot pulsa (stati "live" che richiedono attenzione) */
  pulse?: boolean
}

// ────────────────────────────────────────────────────────────────────────────
// PRENOTAZIONE (StatoPrenotazione enum)
// ────────────────────────────────────────────────────────────────────────────

export const PRENOTAZIONE_BADGES = {
  RICHIESTA:  { color: 'warning', label: 'Da confermare', icon: Clock,     pulse: true },
  CONFERMATA: { color: 'success', label: 'Confermata',    icon: Check },
  ANNULLATA:  { color: 'error',   label: 'Annullata',     icon: X },
  COMPLETATA: { color: 'info',    label: 'Completata',    icon: CheckCheck },
  NO_SHOW:    { color: 'neutral', label: 'No show',       icon: UserX },
} as const satisfies Record<string, BadgeConfig>

// ────────────────────────────────────────────────────────────────────────────
// CHECK-IN (StatoCheckIn enum)
// ────────────────────────────────────────────────────────────────────────────

export const CHECKIN_BADGES = {
  NON_INIZIATO:      { color: 'neutral', label: 'In attesa' },
  ONLINE_COMPLETATO: { color: 'info',    label: 'Da verificare', pulse: true },
  VERIFICATO:        { color: 'success', label: 'Verificato',    icon: ShieldCheck },
} as const satisfies Record<string, BadgeConfig>

// ────────────────────────────────────────────────────────────────────────────
// HOUSEKEEPING (StatoHK enum) — stato unità
// ────────────────────────────────────────────────────────────────────────────

export const HK_BADGES = {
  PULITA:         { color: 'success', label: 'Pulita',         icon: Check },
  SPORCA:         { color: 'error',   label: 'Sporca' },
  IN_PULIZIA:     { color: 'warning', label: 'In pulizia',     pulse: true },
  NON_DISTURBARE: { color: 'info',    label: 'Non disturbare' },
  MANUTENZIONE:   { color: 'purple',  label: 'Manutenzione',   icon: Wrench },
  FUORI_SERVIZIO: { color: 'neutral', label: 'Fuori servizio', icon: Ban },
} as const satisfies Record<string, BadgeConfig>

// ────────────────────────────────────────────────────────────────────────────
// SPA — appuntamenti (StatoAppuntamentoSpa enum)
// ────────────────────────────────────────────────────────────────────────────

export const SPA_APPUNTAMENTO_BADGES = {
  PRENOTATO:  { color: 'info',    label: 'Prenotato' },
  CONFERMATO: { color: 'success', label: 'Confermato', icon: Check },
  IN_CORSO:   { color: 'purple',  label: 'In corso',   icon: Play,   pulse: true },
  COMPLETATO: { color: 'neutral', label: 'Completato', icon: CheckCheck },
  ANNULLATO:  { color: 'error',   label: 'Annullato',  icon: X },
  NO_SHOW:    { color: 'warning', label: 'No show',    icon: UserX },
} as const satisfies Record<string, BadgeConfig>

// ────────────────────────────────────────────────────────────────────────────
// SPA — pagamenti (StatoPagamentoSpa enum)
// ────────────────────────────────────────────────────────────────────────────

export const SPA_PAGAMENTO_BADGES = {
  PENDENTE:            { color: 'warning', label: 'Pendente' },
  RISCOSSO:            { color: 'success', label: 'Riscosso',   icon: Euro },
  RIMBORSO_RICHIESTO:  { color: 'info',    label: 'Rimborso chiesto', pulse: true },
  RIMBORSATO:          { color: 'neutral', label: 'Rimborsato', icon: RefreshCw },
} as const satisfies Record<string, BadgeConfig>

// ────────────────────────────────────────────────────────────────────────────
// FATTURE (StatoFattura enum)
// ────────────────────────────────────────────────────────────────────────────

export const FATTURA_BADGES = {
  BOZZA:     { color: 'neutral', label: 'Bozza',     icon: FileText },
  INVIATA:   { color: 'info',    label: 'Inviata',   icon: Send },
  PAGATA:    { color: 'success', label: 'Pagata',    icon: FileCheck2 },
  SCADUTA:   { color: 'error',   label: 'Scaduta',   icon: AlertCircle },
  ANNULLATA: { color: 'neutral', label: 'Annullata', icon: X },
  STORNATA:  { color: 'warning', label: 'Stornata',  icon: FileX2 },
} as const satisfies Record<string, BadgeConfig>

// ────────────────────────────────────────────────────────────────────────────
// PAGAMENTI piattaforma (StatoPagamento enum)
// ────────────────────────────────────────────────────────────────────────────

export const PAGAMENTO_BADGES = {
  IN_ATTESA:  { color: 'warning', label: 'In attesa' },
  PAGATO:     { color: 'success', label: 'Pagato',    icon: Euro },
  IN_RITARDO: { color: 'error',   label: 'In ritardo', pulse: true },
  ANNULLATO:  { color: 'neutral', label: 'Annullato', icon: X },
} as const satisfies Record<string, BadgeConfig>

// ────────────────────────────────────────────────────────────────────────────
// MANUTENZIONE (StatoManutenzione enum)
// ────────────────────────────────────────────────────────────────────────────

export const MANUTENZIONE_BADGES = {
  APERTA:           { color: 'error',   label: 'Aperta',         icon: AlertCircle, pulse: true },
  IN_LAVORAZIONE:   { color: 'warning', label: 'In lavorazione', icon: Settings2 },
  IN_ATTESA_PARTI:  { color: 'info',    label: 'Attesa parti',   icon: Package },
  RISOLTA:          { color: 'success', label: 'Risolta',        icon: Check },
  ANNULLATA:        { color: 'neutral', label: 'Annullata',      icon: X },
} as const satisfies Record<string, BadgeConfig>

// ────────────────────────────────────────────────────────────────────────────
// TICKET supporto (StatoTicket enum)
// ────────────────────────────────────────────────────────────────────────────

export const TICKET_BADGES = {
  APERTO:              { color: 'error',   label: 'Aperto',         icon: AlertCircle, pulse: true },
  IN_LAVORAZIONE:      { color: 'warning', label: 'In lavorazione', icon: Settings2 },
  IN_ATTESA_RISPOSTA:  { color: 'info',    label: 'Attesa risposta' },
  RISOLTO:             { color: 'success', label: 'Risolto',        icon: Check },
  CHIUSO:              { color: 'neutral', label: 'Chiuso' },
} as const satisfies Record<string, BadgeConfig>

// ────────────────────────────────────────────────────────────────────────────
// TRACE (StatoTrace enum) — richieste generiche ospite-staff
// ────────────────────────────────────────────────────────────────────────────

export const TRACE_BADGES = {
  APERTO:     { color: 'error',   label: 'Aperto',     icon: Inbox, pulse: true },
  IN_CORSO:   { color: 'warning', label: 'In corso',   icon: Clock },
  COMPLETATO: { color: 'success', label: 'Completato', icon: Check },
  ANNULLATO:  { color: 'neutral', label: 'Annullato',  icon: X },
} as const satisfies Record<string, BadgeConfig>

// ────────────────────────────────────────────────────────────────────────────
// ABBONAMENTO (StatoAbbonamento enum)
// ────────────────────────────────────────────────────────────────────────────

export const ABBONAMENTO_BADGES = {
  ATTIVO:   { color: 'success', label: 'Attivo',   icon: Check },
  SOSPESO:  { color: 'warning', label: 'Sospeso',  icon: PauseCircle },
  SCADUTO:  { color: 'error',   label: 'Scaduto',  icon: AlertCircle },
  IN_PROVA: { color: 'info',    label: 'In prova', icon: Hourglass },
} as const satisfies Record<string, BadgeConfig>

// ────────────────────────────────────────────────────────────────────────────
// EVENTO (StatoEvento enum)
// ────────────────────────────────────────────────────────────────────────────

export const EVENTO_BADGES = {
  BOZZA:     { color: 'neutral', label: 'Bozza' },
  IN_ATTESA: { color: 'warning', label: 'In revisione', icon: Hourglass, pulse: true },
  APPROVATO: { color: 'success', label: 'Approvato',    icon: Check },
  RIFIUTATO: { color: 'error',   label: 'Rifiutato',    icon: X },
  SCADUTO:   { color: 'neutral', label: 'Scaduto' },
} as const satisfies Record<string, BadgeConfig>

// ────────────────────────────────────────────────────────────────────────────
// OGGETTI SMARRITI (StatoOggettoSmarrito enum)
// ────────────────────────────────────────────────────────────────────────────

export const OGGETTO_SMARRITO_BADGES = {
  IN_CUSTODIA:   { color: 'info',    label: 'In custodia', icon: Package },
  RESTITUITO:    { color: 'success', label: 'Restituito',  icon: Check },
  SPEDITO:       { color: 'info',    label: 'Spedito',     icon: Truck, pulse: true },
  NON_RECLAMATO: { color: 'warning', label: 'Non reclamato' },
  SMALTITO:      { color: 'neutral', label: 'Smaltito',    icon: Trash2 },
} as const satisfies Record<string, BadgeConfig>

// ────────────────────────────────────────────────────────────────────────────
// INVITI STAFF (StatoInvito enum)
// ────────────────────────────────────────────────────────────────────────────

export const INVITO_BADGES = {
  INVIATO:   { color: 'info',    label: 'Inviato',   icon: MailCheck, pulse: true },
  ACCETTATO: { color: 'success', label: 'Accettato', icon: Check },
  SCADUTO:   { color: 'neutral', label: 'Scaduto' },
  REVOCATO:  { color: 'error',   label: 'Revocato',  icon: X },
} as const satisfies Record<string, BadgeConfig>

// ────────────────────────────────────────────────────────────────────────────
// CONVERSAZIONE WHATSAPP (StatoConversazioneWA enum)
// ────────────────────────────────────────────────────────────────────────────

export const CONVERSAZIONE_WA_BADGES = {
  ATTIVA:   { color: 'teal',    label: 'AI attiva',   icon: MessageSquare, pulse: true },
  ESCALATA: { color: 'warning', label: 'In escalation' },
  CHIUSA:   { color: 'neutral', label: 'Chiusa' },
} as const satisfies Record<string, BadgeConfig>

// ────────────────────────────────────────────────────────────────────────────
// PRENOTAZIONE RISTORANTE (stringhe, non enum Prisma)
// ────────────────────────────────────────────────────────────────────────────

export const PRENOTAZIONE_RISTORANTE_BADGES = {
  CONFERMATA: { color: 'success', label: 'Confermata', icon: Check },
  ANNULLATA:  { color: 'neutral', label: 'Annullata',  icon: X },
  COMPLETATA: { color: 'info',    label: 'Completata', icon: CheckCheck },
  NO_SHOW:    { color: 'warning', label: 'No show',    icon: UserX },
} as const satisfies Record<string, BadgeConfig>

// ────────────────────────────────────────────────────────────────────────────
// PRIORITÀ — usate anche come badge (non stato)
// ────────────────────────────────────────────────────────────────────────────

export const PRIORITA_BADGES = {
  BASSA:   { color: 'neutral', label: 'Bassa' },
  NORMALE: { color: 'info',    label: 'Normale' },
  ALTA:    { color: 'warning', label: 'Alta' },
  URGENTE: { color: 'error',   label: 'Urgente', icon: AlertCircle, pulse: true },
} as const satisfies Record<string, BadgeConfig>

// ────────────────────────────────────────────────────────────────────────────
// CANALE PRENOTAZIONE (OTA)
// ────────────────────────────────────────────────────────────────────────────

export const CANALE_BADGES = {
  BOOKING_COM: { color: 'pink',    label: 'Booking.com', icon: Calendar },
  AIRBNB:      { color: 'pink',    label: 'Airbnb',      icon: Calendar },
  VRBO:        { color: 'pink',    label: 'VRBO',        icon: Calendar },
  EXPEDIA:     { color: 'pink',    label: 'Expedia',     icon: Calendar },
  DIRETTO:     { color: 'primary', label: 'Diretto' },
  WEB:         { color: 'primary', label: 'Web' },
  EMAIL:       { color: 'teal',    label: 'Email' },
  TELEFONO:    { color: 'teal',    label: 'Telefono' },
  WALK_IN:     { color: 'neutral', label: 'Walk-in' },
} as const satisfies Record<string, BadgeConfig>

// ────────────────────────────────────────────────────────────────────────────
// Helper: lookup cross-mappa
// ────────────────────────────────────────────────────────────────────────────

type BadgeKind =
  | 'prenotazione' | 'checkin' | 'hk' | 'spa' | 'spa-pagamento'
  | 'fattura' | 'pagamento' | 'manutenzione' | 'ticket' | 'trace'
  | 'abbonamento' | 'evento' | 'oggetto-smarrito' | 'invito'
  | 'conversazione-wa' | 'prenotazione-ristorante' | 'priorita' | 'canale'

const MAPS: Record<BadgeKind, Record<string, BadgeConfig>> = {
  'prenotazione':           PRENOTAZIONE_BADGES,
  'checkin':                CHECKIN_BADGES,
  'hk':                     HK_BADGES,
  'spa':                    SPA_APPUNTAMENTO_BADGES,
  'spa-pagamento':          SPA_PAGAMENTO_BADGES,
  'fattura':                FATTURA_BADGES,
  'pagamento':              PAGAMENTO_BADGES,
  'manutenzione':           MANUTENZIONE_BADGES,
  'ticket':                 TICKET_BADGES,
  'trace':                  TRACE_BADGES,
  'abbonamento':            ABBONAMENTO_BADGES,
  'evento':                 EVENTO_BADGES,
  'oggetto-smarrito':       OGGETTO_SMARRITO_BADGES,
  'invito':                 INVITO_BADGES,
  'conversazione-wa':       CONVERSAZIONE_WA_BADGES,
  'prenotazione-ristorante':PRENOTAZIONE_RISTORANTE_BADGES,
  'priorita':               PRIORITA_BADGES,
  'canale':                 CANALE_BADGES,
}

/**
 * Restituisce la config per una coppia (kind, value). Fallback neutrale
 * se il valore non è mappato (es. enum aggiunto senza aggiornare qui).
 */
export function getBadgeConfig(kind: BadgeKind, value: string | null | undefined): BadgeConfig {
  if (!value) return { color: 'neutral', label: '—' }
  return MAPS[kind]?.[value] ?? { color: 'neutral', label: value }
}
