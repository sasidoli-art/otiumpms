/**
 * Splash page rich config — schema TypeScript per Host.splashConfig (JSONB).
 *
 * Tutta la personalizzazione visiva del captive portal locale vive qui.
 * Il renderer (splash-renderer.ts) la trasforma in HTML completo che il
 * backend `/api/wifi/router/sync` include nel payload e il router scrive
 * su /www/otium/index.html.
 */

export interface SplashConfig {
  // Versione schema per migrazioni future
  v?: 1

  // ─── Branding ─────────────────────────────────────────────────────────
  /** Titolo principale (default: hostNomeAzienda) */
  titolo?: string
  /** Sottotitolo / tagline (default: "Wi-Fi gratuito per ospiti") */
  sottotitolo?: string
  /** Logo URL (PNG/SVG da CDN o data URI) */
  logoUrl?: string
  /** Altezza logo in px (default 60) */
  logoHeight?: number

  // ─── Colori ───────────────────────────────────────────────────────────
  /** Colore primario brand (default #4f46e5 indigo) */
  colorePrimario?: string
  /** Colore sfondo (default #f3f4f6 gray-100) */
  coloreSfondo?: string
  /** Colore testi (default #111827 gray-900) */
  coloreTesto?: string
  /** Immagine sfondo URL (sovrascrive coloreSfondo) */
  sfondoImmagineUrl?: string

  // ─── Testi form ───────────────────────────────────────────────────────
  /** Messaggio sopra il form (default: nessuno) */
  messaggioWelcome?: string
  /** Label bottone submit (default "Connetti al Wi-Fi") */
  testoBottone?: string
  /** Etichetta tab codice (default "Ho un codice") */
  labelTabCodice?: string
  /** Etichetta tab prenotazione (default "Sono ospite") */
  labelTabPrenotazione?: string

  // ─── Comportamento ────────────────────────────────────────────────────
  /** Mostra tab "Ho un codice" (default true) */
  mostraTabCodice?: boolean
  /** Mostra tab "Sono ospite" (default true) */
  mostraTabPrenotazione?: boolean
  /** URL redirect dopo login (default: nessuno, mostra pagina "Connesso!") */
  urlRedirectPostLogin?: string

  // ─── Footer + legale ──────────────────────────────────────────────────
  /** Testo footer (default "Log accessi conservati 6 mesi - GDPR") */
  testoFooter?: string
  /** URL T&C (mostra link in footer se presente) */
  urlTermsConditions?: string
  /** URL Privacy Policy (idem) */
  urlPrivacyPolicy?: string

  // ─── Pagina success ───────────────────────────────────────────────────
  /** Titolo pagina connesso (default "Connesso!") */
  successTitolo?: string
  /** Messaggio pagina connesso (default "Sei connesso al Wi-Fi...") */
  successMessaggio?: string

  // ─── Template scelto (sprint 3) ───────────────────────────────────────
  /** Template pre-built selezionato (sovrascrive defaults sopra prima del merge) */
  template?: 'minimalist' | 'hotel-chic' | 'agriturismo' | 'beach-resort' | 'business'

  // ─── Multilingua ───────────────────────────────────────────────────────
  /** Lingue abilitate (default: ['it']) */
  lingue?: Lang[]
  /** Lingua di default mostrata al primo caricamento (default: prima di `lingue`) */
  linguaDefault?: Lang
  /** Traduzioni per ogni campo. Es: { en: { titolo: 'Welcome', ... } } */
  traduzioni?: Partial<Record<Lang, TranslatableFields>>
}

export type Lang = 'it' | 'en' | 'de' | 'fr'

/** Campi traducibili (solo testi visibili, no colori/url/toggle) */
export interface TranslatableFields {
  titolo?: string
  sottotitolo?: string
  messaggioWelcome?: string
  testoBottone?: string
  labelTabCodice?: string
  labelTabPrenotazione?: string
  testoFooter?: string
  successTitolo?: string
  successMessaggio?: string
}

export const LANG_LABELS: Record<Lang, { label: string; flag: string }> = {
  it: { label: 'Italiano', flag: '🇮🇹' },
  en: { label: 'English',  flag: '🇬🇧' },
  de: { label: 'Deutsch',  flag: '🇩🇪' },
  fr: { label: 'Français', flag: '🇫🇷' },
}

export const TRANSLATABLE_FIELDS: (keyof TranslatableFields)[] = [
  'titolo', 'sottotitolo', 'messaggioWelcome', 'testoBottone',
  'labelTabCodice', 'labelTabPrenotazione', 'testoFooter',
  'successTitolo', 'successMessaggio',
]

/** Valori di fallback per i campi quando il config è vuoto */
export function getSplashDefaults(hostNomeAzienda: string): SplashConfig {
  return {
    v: 1,
    titolo: hostNomeAzienda,
    sottotitolo: 'Wi-Fi gratuito per ospiti',
    logoHeight: 60,
    colorePrimario: '#4f46e5',
    coloreSfondo: '#f3f4f6',
    coloreTesto: '#111827',
    testoBottone: 'Connetti al Wi-Fi',
    labelTabCodice: 'Ho un codice',
    labelTabPrenotazione: 'Sono ospite',
    mostraTabCodice: true,
    mostraTabPrenotazione: true,
    testoFooter: 'Log accessi conservati 6 mesi - GDPR',
    successTitolo: 'Connesso!',
    successMessaggio: 'Sei connesso al Wi-Fi. Buona navigazione.',
    lingue: ['it'],
  }
}

/** Merge config utente con defaults */
export function mergeSplashConfig(
  hostNomeAzienda: string,
  userConfig: SplashConfig | null | undefined,
): SplashConfig {
  return { ...getSplashDefaults(hostNomeAzienda), ...(userConfig ?? {}) }
}
