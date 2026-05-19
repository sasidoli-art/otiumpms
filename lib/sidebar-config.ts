/**
 * Configurazione sidebar Host — source of truth per struttura, ordine e visibilità.
 *
 * La sidebar legge questa config e la filtra in base a:
 *   1. Moduli attivi dell'host (`parseModuli`)
 *   2. Ruolo utente/staff (`canAccessSection`)
 *
 * Ogni gruppo ha `defaultOpen` per lo stato iniziale (l'utente può poi
 * override con un toggle salvato in localStorage).
 *
 * I badge sono dichiarativi: il componente sidebar risolve i contatori
 * a runtime chiamando le API di conteggio.
 */

import type { HostSection } from '@/lib/permissions'

// ─── Types ──────────────────────────────────────────────────────────────────

export type BadgeType =
  | 'prenotazioniNuove'
  | 'arriviOggi'
  | 'partenzeOggi'
  | 'taskHKAperti'
  | 'manutenzioneAperta'
  | 'messaggiNonLetti'
  | 'notificheNonLette'
  | 'spaAppuntamentiOggi'
  | 'ticketAperti'

export type StaffRole =
  | 'MANAGER'
  | 'RECEPTIONIST'
  | 'HOUSEKEEPING'
  | 'SPA_OPERATOR'
  | 'RESTAURANT'
  | 'CONCIERGE'
  | 'READONLY'

export interface SidebarItem {
  /** Chiave univoca (usata come React key) */
  id: string
  /** Chiave i18n: "sidebar.dashboard", "sidebar.prenotazioni" */
  label: string
  /** Route Next.js */
  href: string
  /** Nome icona Lucide (PascalCase) */
  icon: string
  /** Tipo badge contatore (risolto a runtime) */
  badge?: BadgeType
  /** Se richiede un modulo attivo (id da CATALOGO_MODULI) */
  modulo?: string
  /** Se visibile solo per certi ruoli staff */
  ruoliStaff?: StaffRole[]
}

export interface SidebarGroup {
  /** Chiave univoca gruppo */
  id: string
  /** Chiave i18n per l'header gruppo */
  label: string
  /** Nome icona Lucide del gruppo (per collapsed mode) */
  icon: string
  /** Aperto di default al primo render */
  defaultOpen: boolean
  /** Sezione permessi (per filtraggio ruolo) */
  section: HostSection
  /** Se l'intero gruppo richiede un modulo attivo */
  moduloGruppo?: string
  /** Voci del gruppo */
  items: SidebarItem[]
}

// ─── Configurazione ─────────────────────────────────────────────────────────

export const SIDEBAR_GROUPS: SidebarGroup[] = [
  // ━━━ 1. OGGI ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    id: 'oggi',
    label: 'sidebar.group.oggi',
    icon: 'LayoutDashboard',
    defaultOpen: true,
    section: 'panoramica',
    items: [
      {
        id: 'dashboard',
        label: 'sidebar.dashboard',
        href: '/host/dashboard',
        icon: 'Home',
      },
      {
        id: 'oggi',
        label: 'sidebar.oggi',
        href: '/host/oggi',
        icon: 'CalendarCheck',
        badge: 'arriviOggi',
      },
      {
        id: 'calendario',
        label: 'sidebar.calendario',
        href: '/host/calendario',
        icon: 'Calendar',
      },
    ],
  },

  // ━━━ 2. PRENOTAZIONI & OSPITI ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    id: 'prenotazioni-ospiti',
    label: 'sidebar.group.prenotazioniOspiti',
    icon: 'BookOpen',
    defaultOpen: true,
    section: 'prenotazioni',
    items: [
      {
        id: 'prenotazioni',
        label: 'sidebar.prenotazioni',
        href: '/host/prenotazioni',
        icon: 'BookOpen',
        badge: 'prenotazioniNuove',
      },
      {
        id: 'crm',
        label: 'sidebar.crm',
        href: '/host/crm',
        icon: 'Users',
      },
      {
        id: 'canali',
        label: 'sidebar.canali',
        href: '/host/canali',
        icon: 'Globe',
        modulo: 'channelMgr',
      },
      {
        id: 'pacchetti',
        label: 'sidebar.pacchetti',
        href: '/host/pacchetti',
        icon: 'Package',
      },
    ],
  },

  // ━━━ 3. OPERAZIONI ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    id: 'operazioni',
    label: 'sidebar.group.operazioni',
    icon: 'Cog',
    defaultOpen: false,
    section: 'operazioni',
    items: [
      {
        id: 'housekeeping',
        label: 'sidebar.housekeeping',
        href: '/host/housekeeping',
        icon: 'Sparkles',
        badge: 'taskHKAperti',
      },
      {
        id: 'manutenzione',
        label: 'sidebar.manutenzione',
        href: '/host/manutenzione',
        icon: 'Wrench',
        badge: 'manutenzioneAperta',
        modulo: 'manutenzione',
      },
      {
        id: 'ristorazione',
        label: 'sidebar.ristorazione',
        href: '/host/ristorazione',
        icon: 'UtensilsCrossed',
        modulo: 'ristorazione',
        ruoliStaff: ['MANAGER', 'RESTAURANT', 'READONLY'],
      },
      {
        id: 'magazzino',
        label: 'sidebar.magazzino',
        href: '/host/magazzino',
        icon: 'Boxes',
        modulo: 'magazzino',
      },
      {
        id: 'oggetti-smarriti',
        label: 'sidebar.oggettiSmarriti',
        href: '/host/oggetti-smarriti',
        icon: 'Search',
        modulo: 'lostFound',
      },
    ],
  },

  // ━━━ 4. SPA & BENESSERE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    id: 'spa',
    label: 'sidebar.group.spa',
    icon: 'Waves',
    defaultOpen: false,
    section: 'spa',
    moduloGruppo: 'spa',
    items: [
      {
        id: 'spa-dashboard',
        label: 'sidebar.spaDashboard',
        href: '/host/spa',
        icon: 'Flower2',
      },
      {
        id: 'spa-appuntamenti',
        label: 'sidebar.spaAppuntamenti',
        href: '/host/spa/appuntamenti',
        icon: 'CalendarDays',
        badge: 'spaAppuntamentiOggi',
      },
      {
        id: 'spa-calendario',
        label: 'sidebar.spaCalendario',
        href: '/host/spa/calendario',
        icon: 'CalendarClock',
      },
      {
        id: 'spa-trattamenti',
        label: 'sidebar.spaTrattamenti',
        href: '/host/spa/trattamenti',
        icon: 'Sparkles',
      },
      {
        id: 'spa-terapisti',
        label: 'sidebar.spaTerapisti',
        href: '/host/spa/terapisti',
        icon: 'Users',
      },
      {
        id: 'spa-cabine',
        label: 'sidebar.spaCabine',
        href: '/host/spa/cabine',
        icon: 'DoorOpen',
      },
      {
        id: 'spa-gift-card',
        label: 'sidebar.spaGiftCard',
        href: '/host/spa/gift-card',
        icon: 'Gift',
        modulo: 'giftCard',
      },
      {
        id: 'spa-loyalty',
        label: 'sidebar.spaLoyalty',
        href: '/host/spa/loyalty',
        icon: 'Award',
        modulo: 'loyalty',
      },
      {
        id: 'spa-waiting-list',
        label: 'sidebar.spaWaitingList',
        href: '/host/spa/waiting-list',
        icon: 'Clock',
        modulo: 'waitingList',
      },
      {
        id: 'spa-report',
        label: 'sidebar.spaReport',
        href: '/host/spa/report',
        icon: 'BarChart3',
      },
    ],
  },

  // ━━━ 5. FINANZE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    id: 'finanze',
    label: 'sidebar.group.finanze',
    icon: 'Wallet',
    defaultOpen: false,
    section: 'cassa',
    items: [
      {
        id: 'pos',
        label: 'sidebar.pos',
        href: '/host/pos',
        icon: 'CreditCard',
        modulo: 'pos',
      },
      {
        id: 'cassa',
        label: 'sidebar.cassa',
        href: '/host/cassa',
        icon: 'Banknote',
        modulo: 'cassa',
      },
      {
        id: 'fatture',
        label: 'sidebar.fatture',
        href: '/host/fatture',
        icon: 'FileText',
        modulo: 'fatturazione',
      },
      {
        id: 'report-revenue',
        label: 'sidebar.reportRevenue',
        href: '/host/report',
        icon: 'BarChart3',
      },
    ],
  },

  // ━━━ 6. COMUNICAZIONE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    id: 'comunicazione',
    label: 'sidebar.group.comunicazione',
    icon: 'MessageCircle',
    defaultOpen: false,
    section: 'operazioni',
    items: [
      {
        id: 'staff',
        label: 'sidebar.staff',
        href: '/host/staff',
        icon: 'MessageSquare',
        modulo: 'staff',
      },
      {
        id: 'notifiche',
        label: 'sidebar.notifiche',
        href: '/host/notifiche',
        icon: 'Bell',
        badge: 'notificheNonLette',
      },
      {
        id: 'email-automatiche',
        label: 'sidebar.emailAuto',
        href: '/host/email-automatiche',
        icon: 'Mail',
        modulo: 'emailAuto',
      },
      {
        id: 'concierge',
        label: 'sidebar.concierge',
        href: '/host/concierge',
        icon: 'Bot',
        modulo: 'concierge',
      },
      {
        id: 'wifi',
        label: 'sidebar.wifi',
        href: '/host/wifi',
        icon: 'Wifi',
        modulo: 'wifi',
      },
      {
        id: 'guida',
        label: 'sidebar.guida',
        href: '/host/guida',
        icon: 'BookOpen',
      },
      {
        id: 'promemoria',
        label: 'sidebar.promemoria',
        href: '/host/promemoria',
        icon: 'ClipboardCheck',
        modulo: 'promemoria',
      },
    ],
  },

  // ━━━ 7. IMPOSTAZIONI ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    id: 'impostazioni',
    label: 'sidebar.group.impostazioni',
    icon: 'Settings',
    defaultOpen: false,
    section: 'impostazioni',
    items: [
      {
        id: 'strutture',
        label: 'sidebar.strutture',
        href: '/host/strutture',
        icon: 'Building2',
      },
      {
        id: 'utenti',
        label: 'sidebar.utenti',
        href: '/host/utenti',
        icon: 'UserCog',
      },
      {
        id: 'moduli',
        label: 'sidebar.moduli',
        href: '/host/moduli',
        icon: 'Puzzle',
      },
      {
        id: 'abbonamento',
        label: 'sidebar.abbonamento',
        href: '/host/abbonamento',
        icon: 'Crown',
      },
      {
        id: 'upselling',
        label: 'sidebar.upselling',
        href: '/host/upselling',
        icon: 'TrendingUp',
        modulo: 'upselling',
      },
      {
        id: 'alloggiati',
        label: 'sidebar.alloggiati',
        href: '/host/alloggiati',
        icon: 'Shield',
        modulo: 'alloggiati',
      },
      {
        id: 'gdpr',
        label: 'sidebar.gdpr',
        href: '/host/gdpr',
        icon: 'Lock',
      },
      {
        id: 'analytics',
        label: 'sidebar.analytics',
        href: '/host/analytics',
        icon: 'BarChart3',
      },
      {
        id: 'audit',
        label: 'sidebar.audit',
        href: '/host/audit',
        icon: 'ClipboardList',
      },
      {
        id: 'supporto',
        label: 'sidebar.supporto',
        href: '/host/supporto',
        icon: 'LifeBuoy',
      },
      {
        id: 'help',
        label: 'sidebar.help',
        href: '/host/help',
        icon: 'HelpCircle',
      },
    ],
  },
]

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Filtra i gruppi sidebar in base ai moduli attivi e al ruolo utente.
 *
 * @param moduliAttivi — output di `parseModuli(host.moduliAttivi)`
 * @param userRole — ruolo utente (HOST, STAFF, ADMIN, SUPERADMIN, DIREZIONE)
 * @param staffRole — ruolo staff (se userRole === 'STAFF')
 * @param allowedSections — sezioni consentite per il ruolo (da `getAllowedSections`)
 * @returns gruppi filtrati con solo le voci visibili
 */
export function filterSidebarGroups(
  moduliAttivi: Record<string, boolean>,
  allowedSections: HostSection[],
  staffRole?: StaffRole | null,
): SidebarGroup[] {
  return SIDEBAR_GROUPS
    .filter(group => {
      // Intero gruppo nascosto se la sezione non è accessibile
      if (!allowedSections.includes(group.section)) return false
      // Intero gruppo nascosto se il modulo gruppo non è attivo
      if (group.moduloGruppo && !moduliAttivi[group.moduloGruppo]) return false
      return true
    })
    .map(group => ({
      ...group,
      items: group.items.filter(item => {
        // Modulo richiesto non attivo → nascondi
        if (item.modulo && !moduliAttivi[item.modulo]) return false
        // Ruoli staff specifici → controlla
        if (item.ruoliStaff && staffRole && !item.ruoliStaff.includes(staffRole)) return false
        return true
      }),
    }))
    .filter(group => group.items.length > 0)
}

/**
 * Mappa href → modulo id per il check `isRouteAttiva` centralizzato.
 * Derivata automaticamente dalla config sidebar.
 */
export function buildHrefModuloMap(): Record<string, string> {
  const map: Record<string, string> = {}
  for (const group of SIDEBAR_GROUPS) {
    // Se il gruppo ha un modulo, tutte le sue route lo richiedono
    for (const item of group.items) {
      const modulo = item.modulo || group.moduloGruppo
      if (modulo) {
        map[item.href] = modulo
      }
    }
  }
  return map
}

/** Pre-built per import diretto */
export const HREF_MODULO_MAP = buildHrefModuloMap()
