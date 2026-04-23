/**
 * Configurazione sidebar ADMIN — operatore piattaforma Otium.
 *
 * Separata da sidebar-config.ts (host): l'admin non vede prenotazioni/ospiti
 * ma gestisce host clienti, abbonamenti, supporto.
 *
 * Il gruppo `superadmin` e` visibile solo a role=SUPERADMIN (flag `superadminOnly`).
 */

export type AdminBadgeType =
  | 'ticketAperti'
  | 'hostTrialScadenza'
  | 'pagamentiPendenti'
  | 'notificheAdmin'

export interface AdminSidebarItem {
  id: string
  label: string
  href: string
  icon: string // Lucide icon name (PascalCase)
  badge?: AdminBadgeType
  /** Se true, apre in nuova tab (per link esterni) */
  external?: boolean
}

export interface AdminSidebarGroup {
  id: string
  label: string
  icon: string
  defaultOpen: boolean
  items: AdminSidebarItem[]
  /** Se true, il gruppo e` visibile solo a role=SUPERADMIN */
  superadminOnly?: boolean
  /** Accent color tailwind per gruppo (default = amber, 'red' = critico SUPERADMIN) */
  accent?: 'red' | 'amber'
}

export const ADMIN_SIDEBAR_GROUPS: AdminSidebarGroup[] = [
  {
    id: 'panoramica',
    label: 'PANORAMICA',
    icon: 'LayoutDashboard',
    defaultOpen: true,
    items: [
      { id: 'dashboard', label: 'Dashboard', href: '/admin/dashboard', icon: 'Home' },
      { id: 'attivita',  label: 'Attività',  href: '/admin/attivita',  icon: 'Activity' },
    ],
  },
  {
    id: 'clienti',
    label: 'CLIENTI',
    icon: 'Users',
    defaultOpen: true,
    items: [
      { id: 'host',     label: 'Host',         href: '/admin/host',    icon: 'Building2' },
      { id: 'billing',  label: 'Abbonamenti',  href: '/admin/billing', icon: 'CreditCard' },
      { id: 'moduli',   label: 'Moduli',       href: '/admin/moduli',  icon: 'Puzzle' },
    ],
  },
  {
    id: 'supporto',
    label: 'SUPPORTO',
    icon: 'LifeBuoy',
    defaultOpen: true,
    items: [
      { id: 'ticket',  label: 'Ticket',           href: '/admin/ticket', icon: 'LifeBuoy', badge: 'ticketAperti' },
      { id: 'kb',      label: 'Knowledge base',   href: '/admin/kb',     icon: 'BookOpen' },
    ],
  },
  {
    id: 'piattaforma',
    label: 'PIATTAFORMA',
    icon: 'Settings',
    defaultOpen: false,
    items: [
      { id: 'impostazioni', label: 'Impostazioni',       href: '/admin/impostazioni', icon: 'Settings' },
      { id: 'email',        label: 'Email piattaforma',  href: '/admin/email',        icon: 'Mail' },
      { id: 'audit',        label: 'Audit log',          href: '/admin/audit',        icon: 'ScrollText' },
    ],
  },

  // ─── Gruppo visibile solo a SUPERADMIN ──────────────────────────────────
  {
    id: 'superadmin',
    label: 'SUPERADMIN',
    icon: 'Shield',
    defaultOpen: true,
    superadminOnly: true,
    accent: 'red',
    items: [
      { id: 'monitoring',    label: 'Monitoring',              href: '/superadmin/monitoring', icon: 'Activity' },
      { id: 'platform',      label: 'Impostazioni piattaforma', href: '/superadmin/settings',   icon: 'Settings' },
      { id: 'admin',         label: 'Gestione admin',          href: '/superadmin/utenti',     icon: 'UserCog' },
      { id: 'database',      label: 'Database',                href: 'https://console.neon.tech/',        icon: 'Database', external: true },
      { id: 'deploy',        label: 'Deploy',                  href: 'https://vercel.com/sasidoli-arts-projects/otium-pms', icon: 'Rocket',   external: true },
    ],
  },
]
