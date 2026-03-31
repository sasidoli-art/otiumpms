/**
 * Sistema Moduli — feature attivabili/disattivabili per host.
 *
 * Ogni host può attivare solo i moduli di cui ha bisogno.
 * La sidebar, le API e le pagine usano questo sistema per decidere cosa mostrare.
 *
 * Uso:
 *   const moduli = parseModuli(host.moduliAttivi)
 *   if (moduli.spa) { ... }
 *
 *   // Nelle API:
 *   if (!isModuloAttivo(host.moduliAttivi, 'spa')) return 403
 */

// ─── Catalogo moduli disponibili ──────────────────────────────────────────────

export interface ModuloConfig {
  id: string
  nome: string
  descrizione: string
  icona: string         // nome icona Lucide
  categoria: 'base' | 'operativo' | 'avanzato' | 'integrazioni'
  defaultAttivo: boolean
}

export const CATALOGO_MODULI: ModuloConfig[] = [
  // Base — sempre disponibili, attivi di default
  { id: 'prenotazioni',  nome: 'Prenotazioni',       descrizione: 'Gestione prenotazioni, check-in/out, calendario',      icona: 'BookOpen',        categoria: 'base',         defaultAttivo: true },
  { id: 'strutture',     nome: 'Strutture & Camere',  descrizione: 'Gestione strutture, unità prenotabili, tariffe',       icona: 'Building2',       categoria: 'base',         defaultAttivo: true },
  { id: 'crm',           nome: 'CRM Ospiti',          descrizione: 'Anagrafica ospiti, preferenze, storico',               icona: 'Users',           categoria: 'base',         defaultAttivo: true },
  { id: 'housekeeping',  nome: 'Housekeeping',        descrizione: 'Gestione pulizie, stato camere, task HK',              icona: 'Sparkles',        categoria: 'base',         defaultAttivo: true },

  // Operativo — attivabili
  { id: 'manutenzione',  nome: 'Manutenzione',        descrizione: 'Segnalazioni guasti, interventi tecnici',              icona: 'Wrench',          categoria: 'operativo',    defaultAttivo: true },
  { id: 'promemoria',    nome: 'Promemoria',          descrizione: 'Task interni legati a prenotazioni con scadenza',      icona: 'ClipboardCheck',  categoria: 'operativo',    defaultAttivo: true },
  { id: 'staff',         nome: 'Bacheca Staff',       descrizione: 'Comunicazioni interne, avvisi, task per il team',      icona: 'MessageSquare',   categoria: 'operativo',    defaultAttivo: true },
  { id: 'alloggiati',    nome: 'Alloggiati Web',      descrizione: 'Export schedine per Questura (PS)',                    icona: 'Shield',          categoria: 'operativo',    defaultAttivo: false },
  { id: 'lostFound',     nome: 'Lost & Found',        descrizione: 'Registro oggetti trovati/smarriti',                    icona: 'Search',          categoria: 'operativo',    defaultAttivo: false },
  { id: 'magazzino',    nome: 'Magazzino',           descrizione: 'Inventario articoli, scorte, movimenti carico/scarico', icona: 'Boxes',           categoria: 'operativo',    defaultAttivo: false },
  { id: 'alertOspite',   nome: 'Alert Ospite',        descrizione: 'Avvisi automatici a check-in/checkout (VIP, allergie)',icona: 'AlertTriangle',   categoria: 'operativo',    defaultAttivo: false },

  // Avanzato
  { id: 'spa',           nome: 'SPA & Benessere',     descrizione: 'Trattamenti, terapisti, cabine, appuntamenti, waiver', icona: 'Waves',           categoria: 'avanzato',     defaultAttivo: false },
  { id: 'eventi',        nome: 'Eventi',              descrizione: 'Gestione eventi locali e pacchetti',                   icona: 'CalendarDays',    categoria: 'avanzato',     defaultAttivo: false },
  { id: 'fatturazione',  nome: 'Fatturazione',        descrizione: 'Fatture, FatturaPA XML, scadenziario crediti',         icona: 'FileText',        categoria: 'avanzato',     defaultAttivo: false },
  { id: 'tariffeDurata', nome: 'Tariffe Durata',      descrizione: 'Sconti automatici per soggiorni lunghi',              icona: 'TrendingUp',      categoria: 'avanzato',     defaultAttivo: false },
  { id: 'ristorazione', nome: 'Ristorazione & Pasti', descrizione: 'Piani pasto (B&B, MP, PC), coperti giornalieri, cucina', icona: 'UtensilsCrossed', categoria: 'avanzato',     defaultAttivo: false },

  // Integrazioni
  { id: 'concierge',     nome: 'AI Concierge',        descrizione: 'Assistente WhatsApp 24/7 con AI per ospiti',           icona: 'Bot',             categoria: 'integrazioni', defaultAttivo: false },
  { id: 'emailAuto',     nome: 'Email Automatiche',   descrizione: 'Conferme, reminder, follow-up automatici',             icona: 'Mail',            categoria: 'integrazioni', defaultAttivo: true },
  { id: 'ical',          nome: 'Calendario iCal',     descrizione: 'Export calendario per sync con altri sistemi',          icona: 'CalendarRange',   categoria: 'integrazioni', defaultAttivo: true },
  { id: 'channelMgr',   nome: 'Channel Manager',     descrizione: 'Import prenotazioni da Booking.com, Airbnb, VRBO via iCal', icona: 'Globe',      categoria: 'integrazioni', defaultAttivo: false },
]

// ─── Tipo stato moduli ────────────────────────────────────────────────────────

export type ModuliAttivi = Record<string, boolean>

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Parsa il campo JSON moduliAttivi dal DB.
 * Se null/undefined, restituisce i default.
 */
export function parseModuli(moduliJson: unknown): ModuliAttivi {
  const defaults: ModuliAttivi = {}
  for (const m of CATALOGO_MODULI) {
    defaults[m.id] = m.defaultAttivo
  }

  if (!moduliJson || typeof moduliJson !== 'object') return defaults

  const stored = moduliJson as Record<string, boolean>
  return { ...defaults, ...stored }
}

/**
 * Controlla se un modulo è attivo per un host.
 */
export function isModuloAttivo(moduliJson: unknown, moduloId: string): boolean {
  const moduli = parseModuli(moduliJson)
  return moduli[moduloId] === true
}

/**
 * Restituisce la lista moduli con stato attivo/inattivo per la UI.
 */
export function getModuliConStato(moduliJson: unknown): (ModuloConfig & { attivo: boolean })[] {
  const moduli = parseModuli(moduliJson)
  return CATALOGO_MODULI.map(m => ({
    ...m,
    attivo: moduli[m.id] === true,
  }))
}

/**
 * Mapping modulo → route sidebar.
 * Usato per filtrare le voci della sidebar.
 */
export const MODULO_ROUTES: Record<string, string[]> = {
  prenotazioni:  ['/host/prenotazioni', '/host/oggi', '/host/calendario'],
  strutture:     ['/host/strutture'],
  crm:           ['/host/crm'],
  housekeeping:  ['/host/housekeeping'],
  manutenzione:  ['/host/manutenzione'],
  promemoria:    ['/host/promemoria'],
  staff:         ['/host/staff'],
  alloggiati:    ['/host/alloggiati'],
  spa:           ['/host/spa'],
  eventi:        ['/host/eventi'],
  fatturazione:  ['/host/fatture'],
  emailAuto:     ['/host/email-automatiche'],
  concierge:     ['/host/concierge'],
  lostFound:     ['/host/oggetti-smarriti'],
}

/**
 * Data una route, restituisce true se il modulo corrispondente è attivo.
 */
export function isRouteAttiva(moduliJson: unknown, pathname: string): boolean {
  const moduli = parseModuli(moduliJson)

  for (const [moduloId, routes] of Object.entries(MODULO_ROUTES)) {
    if (routes.some(r => pathname.startsWith(r))) {
      return moduli[moduloId] === true
    }
  }

  // Route non mappate a moduli → sempre visibili (dashboard, profilo, report, ecc.)
  return true
}
