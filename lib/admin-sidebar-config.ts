/**
 * Configurazione sidebar ADMIN — operatore piattaforma Otium.
 *
 * Separata da sidebar-config.ts (host): l'admin non vede prenotazioni/ospiti
 * ma gestisce host clienti, abbonamenti, supporto.
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
}

export interface AdminSidebarGroup {
  id: string
  label: string
  icon: string
  defaultOpen: boolean
  items: AdminSidebarItem[]
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
]
