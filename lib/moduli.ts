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
  { id: 'catalogo',     nome: 'Catalogo Servizi',    descrizione: 'Prodotti, servizi, pacchetti con IVA per fatturazione', icona: 'ShoppingBag',    categoria: 'avanzato',     defaultAttivo: false },
  { id: 'upselling',   nome: 'Upselling Camera',    descrizione: 'Proposta upgrade al check-in con incentivi operatore',  icona: 'TrendingUp',     categoria: 'avanzato',     defaultAttivo: false },
  { id: 'giftCard',   nome: 'Gift Card SPA',       descrizione: 'Buoni regalo con saldo, ricarica, scadenza e riscatto', icona: 'Gift',           categoria: 'avanzato',     defaultAttivo: false },
  { id: 'pos',        nome: 'Point of Sale',       descrizione: 'Cassa integrata per vendita trattamenti e prodotti',    icona: 'CreditCard',     categoria: 'avanzato',     defaultAttivo: false },
  { id: 'loyalty',    nome: 'Programma Fedeltà',   descrizione: 'Punti fedeltà, livelli reward, accumulo automatico',    icona: 'Award',          categoria: 'avanzato',     defaultAttivo: false },
  { id: 'waitingList', nome: 'Waiting List SPA',   descrizione: 'Lista d\'attesa con notifica e turnaway tracking',      icona: 'Clock',          categoria: 'avanzato',     defaultAttivo: false },
  { id: 'cassa',      nome: 'Cassa & Incassi',    descrizione: 'Chiusura cassa, report incassi per metodo, riconciliazione', icona: 'Banknote',     categoria: 'avanzato',     defaultAttivo: false },

  // Integrazioni
  { id: 'wifi',          nome: 'Wi-Fi Guest & Captive Portal', descrizione: 'Gestione remota access point Comfast, utenti Wi-Fi ospiti, captive portal brandizzato', icona: 'Wifi', categoria: 'integrazioni', defaultAttivo: false },
  { id: 'concierge',     nome: 'AI Concierge',        descrizione: 'Assistente WhatsApp 24/7 con AI per ospiti',           icona: 'Bot',             categoria: 'integrazioni', defaultAttivo: false },
  { id: 'emailAuto',     nome: 'Email Automatiche',   descrizione: 'Conferme, reminder, follow-up automatici',             icona: 'Mail',            categoria: 'integrazioni', defaultAttivo: true },
  { id: 'ical',          nome: 'Calendario iCal',     descrizione: 'Export calendario per sync con altri sistemi',          icona: 'CalendarRange',   categoria: 'integrazioni', defaultAttivo: true },
  { id: 'channelMgr',   nome: 'Channel Manager',     descrizione: 'Import prenotazioni da Booking.com, Airbnb, VRBO via iCal', icona: 'Globe',      categoria: 'integrazioni', defaultAttivo: false },
  { id: 'fatturazioneE', nome: 'Fatturazione Elettronica', descrizione: 'Emissione fatture, invio SDI, note di credito, provider Aruba/FIC', icona: 'FileText', categoria: 'avanzato', defaultAttivo: false },
  { id: 'allotment',   nome: 'Contratti & Allotment', descrizione: 'Gestione accordi con tour operator, agenzie viaggio, contingenti', icona: 'Handshake', categoria: 'avanzato', defaultAttivo: false },
  { id: 'biPrevisionale', nome: 'Business Intelligence', descrizione: 'Forecast revenue, analisi previsionale, confronti YoY, budget', icona: 'LineChart', categoria: 'avanzato', defaultAttivo: false },
  { id: 'multiValuta', nome: 'Multi-valuta',          descrizione: 'Supporto EUR, USD, GBP, CHF con tassi di cambio automatici', icona: 'Coins',     categoria: 'avanzato', defaultAttivo: false },
]

// ─── Tipo stato moduli ────────────────────────────────────────────────────────

export type ModuliAttivi = Record<string, boolean>

/** Stato esteso di un modulo (usato dal SuperAdmin) */
export interface ModuloStatoEsteso {
  attivo: boolean
  modalita: 'incluso' | 'demo' | 'pagamento' | 'off'
  prezzo: number           // €/mese (0 se incluso o demo)
  scadenzaDemo?: string    // ISO date, solo se modalita=demo
}

/** Prezzi add-on suggeriti per modulo */
export const PREZZI_ADDON: Record<string, number> = {
  spa: 30, giftCard: 20, pos: 20, loyalty: 20, waitingList: 10, cassa: 20,
  concierge: 25, fatturazione: 15, channelMgr: 15, ristorazione: 15,
  catalogo: 10, upselling: 10, alloggiati: 10, manutenzione: 10,
  magazzino: 10, lostFound: 5, alertOspite: 5, tariffeDurata: 10,
  fatturazioneE: 20, allotment: 25, biPrevisionale: 30, multiValuta: 15,
  wifi: 40,
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Parsa il campo JSON moduliAttivi dal DB.
 * Retrocompatibile: supporta sia il vecchio formato { "spa": true }
 * che il nuovo { "spa": { "attivo": true, "modalita": "demo", "prezzo": 0 } }
 */
export function parseModuli(moduliJson: unknown): ModuliAttivi {
  const defaults: ModuliAttivi = {}
  for (const m of CATALOGO_MODULI) {
    defaults[m.id] = m.defaultAttivo
  }

  if (!moduliJson || typeof moduliJson !== 'object') return defaults

  const stored = moduliJson as Record<string, unknown>
  const result = { ...defaults }

  for (const [key, value] of Object.entries(stored)) {
    if (typeof value === 'boolean') {
      // Vecchio formato: { "spa": true }
      result[key] = value
    } else if (value && typeof value === 'object' && 'attivo' in value) {
      // Nuovo formato: { "spa": { "attivo": true, "modalita": "demo" } }
      result[key] = !!(value as ModuloStatoEsteso).attivo
    }
  }

  return result
}

/**
 * Parsa i moduli nel formato esteso (per SuperAdmin).
 */
export function parseModuliEsteso(moduliJson: unknown): Record<string, ModuloStatoEsteso> {
  const result: Record<string, ModuloStatoEsteso> = {}

  for (const m of CATALOGO_MODULI) {
    result[m.id] = {
      attivo: m.defaultAttivo,
      modalita: m.defaultAttivo ? 'incluso' : 'off',
      prezzo: 0,
    }
  }

  if (!moduliJson || typeof moduliJson !== 'object') return result

  const stored = moduliJson as Record<string, unknown>
  for (const [key, value] of Object.entries(stored)) {
    if (typeof value === 'boolean') {
      result[key] = {
        attivo: value,
        modalita: value ? 'incluso' : 'off',
        prezzo: 0,
      }
    } else if (value && typeof value === 'object') {
      result[key] = value as ModuloStatoEsteso
    }
  }

  return result
}

/**
 * Calcola il canone mensile add-on di un host.
 */
export function calcolaCanoneAddon(moduliJson: unknown): number {
  const moduli = parseModuliEsteso(moduliJson)
  let totale = 0
  for (const m of Object.values(moduli)) {
    if (m.modalita === 'pagamento' && m.prezzo > 0) {
      totale += m.prezzo
    }
  }
  return totale
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
  giftCard:      ['/host/spa/gift-card'],
  pos:           ['/host/pos'],
  loyalty:       ['/host/spa/loyalty'],
  waitingList:   ['/host/spa/waiting-list'],
  allotment:     ['/host/allotment'],
  biPrevisionale: ['/host/business-intelligence'],
  multiValuta:   ['/host/impostazioni-valuta'],
  wifi:          ['/host/wifi'],
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
