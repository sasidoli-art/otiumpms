/**
 * Sistema permessi centralizzato.
 *
 * Definisce cosa ogni ruolo può vedere e fare.
 * Usato dalla sidebar per filtrare le voci e dalle pagine per il controllo accessi.
 *
 * Gerarchia:
 *   SUPERADMIN > ADMIN > DIREZIONE > HOST > STAFF
 *
 * SUPERADMIN: tutto (piattaforma + tutti gli host)
 * ADMIN: pannello admin (clienti, fatture, pagamenti)
 * DIREZIONE: tutto dell'host (dashboard, report, BI, cassa, impostazioni, staff, GDPR)
 * HOST: operatività quotidiana (prenotazioni, check-in, HK, SPA, CRM, chat)
 * STAFF: sezioni specifiche in base a RuoloStaff
 */

export type UserRole = 'SUPERADMIN' | 'ADMIN' | 'DIREZIONE' | 'HOST' | 'STAFF'
export type StaffRole = 'MANAGER' | 'RECEPTIONIST' | 'HOUSEKEEPING' | 'SPA_OPERATOR' | 'RESTAURANT' | 'CONCIERGE' | 'READONLY'

// Sezioni della sidebar host
export type HostSection =
  | 'panoramica'       // dashboard, front desk, calendario
  | 'prenotazioni'     // lista, nuova
  | 'struttura'        // strutture, pacchetti, channel manager
  | 'ospiti'           // CRM, concierge, alloggiati
  | 'operazioni'       // HK, biancheria, manutenzione, magazzino, lost&found, promemoria, staff
  | 'ristorazione'     // coperti, menu
  | 'spa'              // dashboard SPA, calendario, appuntamenti, trattamenti, ecc
  | 'cassa'            // POS, cassa, catalogo, upselling
  | 'report'           // report, analytics, BI, fatture, email auto, eventi
  | 'impostazioni'     // profilo, utenti, moduli, abbonamento, reg card, widget, GDPR, audit, help

// Permessi per ruolo User (Role enum)
const ROLE_SECTIONS: Record<string, HostSection[]> = {
  SUPERADMIN: ['panoramica', 'prenotazioni', 'struttura', 'ospiti', 'operazioni', 'ristorazione', 'spa', 'cassa', 'report', 'impostazioni'],
  ADMIN: ['panoramica', 'prenotazioni', 'struttura', 'ospiti', 'operazioni', 'ristorazione', 'spa', 'cassa', 'report', 'impostazioni'],
  DIREZIONE: ['panoramica', 'prenotazioni', 'struttura', 'ospiti', 'operazioni', 'ristorazione', 'spa', 'cassa', 'report', 'impostazioni'],
  HOST: ['panoramica', 'prenotazioni', 'struttura', 'ospiti', 'operazioni', 'ristorazione', 'spa', 'cassa', 'report'],
}

// Permessi per ruolo Staff (RuoloStaff enum)
const STAFF_SECTIONS: Record<string, HostSection[]> = {
  MANAGER: ['panoramica', 'prenotazioni', 'struttura', 'ospiti', 'operazioni', 'ristorazione', 'spa', 'cassa', 'report', 'impostazioni'],
  RECEPTIONIST: ['panoramica', 'prenotazioni', 'ospiti', 'cassa'],
  HOUSEKEEPING: ['operazioni'],
  SPA_OPERATOR: ['spa'],
  RESTAURANT: ['ristorazione'],
  CONCIERGE: ['ospiti'],
  READONLY: ['panoramica', 'prenotazioni', 'struttura', 'ospiti', 'operazioni', 'ristorazione', 'spa', 'cassa', 'report'],
}

// Mapping sezione sidebar → gruppo label
const SECTION_TO_GROUP: Record<string, HostSection> = {
  'PANORAMICA': 'panoramica',
  'PRENOTAZIONI': 'prenotazioni',
  'STRUTTURA': 'struttura',
  'OSPITI': 'ospiti',
  'OPERAZIONI': 'operazioni',
  'F&B': 'ristorazione',
  'SPA & BENESSERE': 'spa',
  'CASSA & VENDITE': 'cassa',
  'REPORT & FINANZA': 'report',
  'IMPOSTAZIONI': 'impostazioni',
}

/**
 * Controlla se un utente può vedere una sezione della sidebar.
 */
export function canAccessSection(
  role: string,
  staffRole?: string | null,
  sectionLabel?: string,
): boolean {
  const section = sectionLabel ? SECTION_TO_GROUP[sectionLabel] : undefined
  if (!section) return true // sezione sconosciuta → mostra

  // STAFF usa RuoloStaff
  if (role === 'STAFF' && staffRole) {
    const allowed = STAFF_SECTIONS[staffRole]
    return allowed ? allowed.includes(section) : false
  }

  // Altri ruoli
  const allowed = ROLE_SECTIONS[role]
  return allowed ? allowed.includes(section) : false
}

/**
 * Ritorna le sezioni accessibili per un utente.
 */
export function getAllowedSections(role: string, staffRole?: string | null): HostSection[] {
  if (role === 'STAFF' && staffRole) {
    return STAFF_SECTIONS[staffRole] ?? []
  }
  return ROLE_SECTIONS[role] ?? []
}

/**
 * Controlla se un ruolo può accedere alle impostazioni.
 */
export function canManageSettings(role: string, staffRole?: string | null): boolean {
  if (['SUPERADMIN', 'ADMIN', 'DIREZIONE'].includes(role)) return true
  if (role === 'STAFF' && staffRole === 'MANAGER') return true
  return false
}

/**
 * Controlla se un ruolo può gestire utenti/staff.
 */
export function canManageUsers(role: string): boolean {
  return ['SUPERADMIN', 'ADMIN', 'DIREZIONE'].includes(role)
}

/**
 * Controlla se un ruolo può vedere report e analytics.
 */
export function canViewReports(role: string, staffRole?: string | null): boolean {
  if (['SUPERADMIN', 'ADMIN', 'DIREZIONE', 'HOST'].includes(role)) return true
  if (role === 'STAFF' && (staffRole === 'MANAGER' || staffRole === 'READONLY')) return true
  return false
}

/**
 * Controlla se un ruolo può modificare dati (non readonly).
 */
export function canEdit(role: string, staffRole?: string | null): boolean {
  if (role === 'STAFF' && staffRole === 'READONLY') return false
  return true
}

/**
 * Controlla se un ruolo può accedere all'area /host.
 * Usato come guardia nelle pagine host al posto del check manuale.
 */
export function isHostAuthorized(role: string | undefined): boolean {
  if (!role) return false
  return ['HOST', 'ADMIN', 'SUPERADMIN', 'DIREZIONE', 'STAFF'].includes(role)
}

/**
 * Label per il ruolo da mostrare in UI.
 */
export function roleLabel(role: string): string {
  const labels: Record<string, string> = {
    SUPERADMIN: 'Super Admin',
    ADMIN: 'Amministratore',
    DIREZIONE: 'Direzione',
    HOST: 'Manager',
    STAFF: 'Staff',
  }
  return labels[role] ?? role
}
