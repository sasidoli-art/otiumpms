/**
 * status-config.ts — facade su `lib/status-badges.ts` con i nomi standard
 * usati dal nuovo design system (`*_STATUS` invece di `*_BADGES`) + tabelle
 * extra per canali OTA, piani e helper `getStatusConfig`.
 *
 * Coabita con `status-badges.ts`: i 19 export `*_BADGES` originali restano
 * validi (chi li importa già funziona). Il nuovo codice deve preferire i
 * nomi `*_STATUS` da qui — semantica identica.
 */
export type { BadgeConfig } from './status-badges'

import {
  PRENOTAZIONE_BADGES,
  CHECKIN_BADGES,
  HK_BADGES,
  SPA_APPUNTAMENTO_BADGES,
  FATTURA_BADGES,
  MANUTENZIONE_BADGES,
  TICKET_BADGES,
  PRIORITA_BADGES,
  type BadgeConfig,
} from './status-badges'

// ─── Re-export con nomi nuovi ──────────────────────────────────────────────
export const PRENOTAZIONE_STATUS = PRENOTAZIONE_BADGES
export const CHECKIN_STATUS = CHECKIN_BADGES
export const HK_STATUS = HK_BADGES
export const SPA_STATUS = SPA_APPUNTAMENTO_BADGES
export const FATTURA_STATUS = FATTURA_BADGES
export const MANUTENZIONE_STATUS = MANUTENZIONE_BADGES
export const TICKET_STATUS = TICKET_BADGES
export const MANUTENZIONE_PRIORITA = PRIORITA_BADGES

// ─── CANALI OTA: colori brand-correlati ────────────────────────────────────
// Diversamente dagli altri stati, qui i colori non passano da `BadgeConfig`
// (sono tinti col brand del canale, non semantici). Resi disponibili come
// oggetto piatto per essere applicati come `style={{...}}` o classi.
export const CANALE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  'booking.com': { bg: '#eef6ff', text: '#1d4ed8', border: '#bfdbfe' },
  'airbnb':      { bg: '#fdf2f8', text: '#be185d', border: '#fbcfe8' },
  'vrbo':        { bg: '#eff6ff', text: '#1e40af', border: '#bfdbfe' },
  'diretto':     { bg: '#f3eeff', text: '#6d28d9', border: '#ddd6fe' },
  'manuale':     { bg: '#f5f4f7', text: '#6e6880', border: '#e5e3ea' },
}

// ─── PIANI ABBONAMENTO ──────────────────────────────────────────────────────
export const PIANO_BADGE: Record<string, { bg: string; text: string }> = {
  LIGHT:              { bg: '#f5f4f7', text: '#6e6880' },
  EVENTO_SINGOLO:     { bg: '#eff6ff', text: '#1d4ed8' },
  VISIBILITA_MENSILE: { bg: '#f3eeff', text: '#6d28d9' },
  PARTNER_PREMIUM:    { bg: '#fef9ee', text: '#b45309' },
}

// ─── Helper type-safe ──────────────────────────────────────────────────────
/**
 * Lookup sicuro su una mappa stato → BadgeConfig. Se lo stato non è mappato,
 * ritorna un fallback `neutral` con la stringa raw come label (così il badge
 * appare comunque, leggibile, anche se l'enum è stato esteso senza aggiornare
 * la mappa).
 */
export function getStatusConfig(
  map: Record<string, BadgeConfig>,
  status: string,
): BadgeConfig {
  return map[status] ?? { color: 'neutral', label: status }
}
