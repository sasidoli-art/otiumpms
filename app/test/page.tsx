'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import {
  MapPin, LogIn, Globe, Hotel, Briefcase, UserCog, Shield, ShieldCheck,
  Server, ChevronDown, ChevronRight, ExternalLink, Boxes,
  LayoutDashboard, CalendarDays, ClipboardList, Users, Sparkles,
  Bed, Wrench, UtensilsCrossed, Heart, Gift, Star,
  BarChart3, Mail, Wifi, ShoppingCart, Bot, CreditCard,
  Lock, BookOpen,
  Monitor, Zap, Package, Receipt,
  Clipboard, Truck, Search,
  Building2, BadgeCheck, CircleDollarSign
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

type PageLink = {
  label: string
  href: string
  description?: string
}

type Section = {
  id: string
  title: string
  icon: React.ElementType
  color: string
  borderColor: string
  bgColor: string
  textColor: string
  links: PageLink[]
}

type ApiGroup = {
  title: string
  color: string
  routes: { method: string; path: string }[]
}

type Module = {
  name: string
  icon: React.ElementType
  category: 'Base' | 'Operativi' | 'Avanzati' | 'Integrazioni'
}

// ─── Data ─────────────────────────────────────────────────────────────────────

const sections: Section[] = [
  {
    id: 'pubbliche',
    title: 'Pagine Pubbliche',
    icon: Globe,
    color: 'from-sky-600 to-cyan-600',
    borderColor: 'border-l-sky-500',
    bgColor: 'bg-sky-50',
    textColor: 'text-sky-700',
    links: [
      { label: 'Landing Page', href: '/', description: 'Homepage pubblica' },
      { label: 'Catalogo Strutture', href: '/book', description: 'Booking catalog' },
      { label: 'Booking Alloggio', href: '/book/[strutturaId]', description: 'Form prenotazione' },
      { label: 'Booking SPA', href: '/book/[strutturaId]/spa', description: 'Prenotazione trattamenti' },
      { label: 'Pacchetti', href: '/book/[strutturaId]/pacchetti', description: 'Scelta pacchetti' },
      { label: 'Scelta Pasti', href: '/book/[strutturaId]/pasti', description: 'Menu e preferenze' },
      { label: 'Chat Ospite', href: '/book/chat/[id]', description: 'Conversazione con host' },
      { label: 'Online Check-in', href: '/checkin/[token]', description: 'Self check-in con token' },
      { label: 'Registrazione Staff', href: '/registrazione/[token]', description: 'Invito staff' },
      { label: 'Kiosk Checkout', href: '/kiosk/[token]', description: 'Totem self-service' },
      { label: 'Kiosk SPA Cabina', href: '/kiosk/spa/[cabinaId]', description: 'Tablet cabina SPA' },
      { label: 'Privacy Policy', href: '/privacy-policy' },
      { label: 'Termini & Condizioni', href: '/terms' },
      { label: 'Cookie Policy', href: '/cookie-policy' },
    ],
  },
  {
    id: 'ricevimento',
    title: 'Area Host -- Ricevimento',
    icon: Hotel,
    color: 'from-emerald-600 to-green-600',
    borderColor: 'border-l-emerald-500',
    bgColor: 'bg-emerald-50',
    textColor: 'text-emerald-700',
    links: [
      { label: 'Dashboard', href: '/host/dashboard', description: 'Panoramica generale' },
      { label: 'Front Desk / Oggi', href: '/host/oggi', description: 'Arrivi e partenze di oggi' },
      { label: 'Strutture', href: '/host/strutture', description: 'Gestione proprieta' },
      { label: 'Nuova Struttura', href: '/host/strutture/nuova' },
      { label: 'Pannello Struttura', href: '/host/strutture/[id]/pannello' },
      { label: 'Calendario', href: '/host/calendario', description: 'Disponibilita visuale' },
      { label: 'Disponibilita', href: '/host/strutture/[id]/disponibilita' },
      { label: 'Tariffe', href: '/host/strutture/[id]/tariffe', description: 'Periodi tariffari' },
      { label: 'Impostazioni Struttura', href: '/host/strutture/[id]/impostazioni' },
      { label: 'Prenotazioni', href: '/host/prenotazioni', description: 'Elenco prenotazioni' },
      { label: 'Nuova Prenotazione', href: '/host/prenotazioni/nuova' },
      { label: 'Dettaglio Prenotazione', href: '/host/prenotazioni/[id]' },
      { label: 'Ricevuta', href: '/host/prenotazioni/[id]/ricevuta' },
    ],
  },
  {
    id: 'operativita',
    title: 'Area Host -- Operativita',
    icon: ClipboardList,
    color: 'from-amber-600 to-orange-600',
    borderColor: 'border-l-amber-500',
    bgColor: 'bg-amber-50',
    textColor: 'text-amber-700',
    links: [
      { label: 'CRM Ospiti', href: '/host/crm', description: 'Anagrafica e storico' },
      { label: 'Dettaglio Ospite', href: '/host/crm/[id]' },
      { label: 'Housekeeping', href: '/host/housekeeping', description: 'Task pulizie' },
      { label: 'HK Unita', href: '/host/housekeeping/[unitaId]' },
      { label: 'Biancheria', href: '/host/housekeeping/biancheria', description: 'Dotazione e lavanderia' },
      { label: 'Manutenzione', href: '/host/manutenzione', description: 'Segnalazioni tecniche' },
      { label: 'Staff', href: '/host/staff', description: 'Gestione personale' },
      { label: 'Alloggiati Web', href: '/host/alloggiati', description: 'Schedine PS' },
      { label: 'Promemoria', href: '/host/promemoria', description: 'Reminder operativi' },
      { label: 'Lost & Found', href: '/host/oggetti-smarriti', description: 'Oggetti smarriti' },
      { label: 'Magazzino', href: '/host/magazzino', description: 'Inventario e movimenti' },
      { label: 'Ristorazione', href: '/host/ristorazione', description: 'F&B management' },
      { label: 'Menu Editor', href: '/host/ristorazione/menu', description: 'Gestione menu' },
    ],
  },
  {
    id: 'spa',
    title: 'Area Host -- SPA & Benessere',
    icon: Heart,
    color: 'from-pink-600 to-rose-600',
    borderColor: 'border-l-pink-500',
    bgColor: 'bg-pink-50',
    textColor: 'text-pink-700',
    links: [
      { label: 'SPA Dashboard', href: '/host/spa', description: 'Waiver, pagamenti, overview' },
      { label: 'Calendario SPA', href: '/host/spa/calendario', description: 'Vista settimanale' },
      { label: 'Appuntamenti', href: '/host/spa/appuntamenti', description: 'Board Kanban' },
      { label: 'Trattamenti', href: '/host/spa/trattamenti', description: 'Catalogo servizi' },
      { label: 'Percorsi Benessere', href: '/host/spa/percorsi', description: 'Circuiti wellness' },
      { label: 'Terapisti', href: '/host/spa/terapisti', description: 'Staff SPA' },
      { label: 'Cabine', href: '/host/spa/cabine', description: 'Sale trattamento' },
      { label: 'Gift Card', href: '/host/spa/gift-card', description: 'Buoni regalo' },
      { label: 'Loyalty Program', href: '/host/spa/loyalty', description: 'Fidelizzazione punti' },
      { label: 'Waiting List', href: '/host/spa/waiting-list', description: 'Lista attesa + turnaway' },
      { label: 'Report SPA', href: '/host/spa/report', description: 'Revenue e statistiche' },
    ],
  },
  {
    id: 'business',
    title: 'Area Host -- Business',
    icon: Briefcase,
    color: 'from-violet-600 to-purple-600',
    borderColor: 'border-l-violet-500',
    bgColor: 'bg-violet-50',
    textColor: 'text-violet-700',
    links: [
      { label: 'Pacchetti', href: '/host/pacchetti', description: 'Offerte e bundle' },
      { label: 'Nuovo Pacchetto', href: '/host/pacchetti/nuovo' },
      { label: 'Eventi', href: '/host/eventi', description: 'Eventi locali' },
      { label: 'Nuovo Evento', href: '/host/eventi/nuovo' },
      { label: 'Report Revenue', href: '/host/report', description: 'Analisi ricavi' },
      { label: 'Analytics', href: '/host/analytics', description: 'Statistiche avanzate' },
      { label: 'Fatture', href: '/host/fatture', description: 'Fatturazione elettronica SDI' },
      { label: 'Email Automatiche', href: '/host/email-automatiche', description: 'Flussi email' },
      { label: 'Channel Manager', href: '/host/canali', description: 'OTA sync' },
      { label: 'Catalogo Servizi', href: '/host/servizi', description: 'Extra e add-on' },
      { label: 'Upselling', href: '/host/upselling', description: 'Regole upsell automatiche' },
      { label: 'AI Concierge', href: '/host/concierge', description: 'WhatsApp bot 24/7' },
      { label: 'Concierge Settings', href: '/host/concierge/impostazioni' },
      { label: 'Concierge Test', href: '/host/concierge/test', description: 'Simulatore chat' },
      { label: 'Integrazione Sito', href: '/host/integrazione', description: 'Widget booking' },
      { label: 'POS', href: '/host/pos', description: 'Point of Sale' },
      { label: 'Cassa', href: '/host/cassa', description: 'Registratore + chiusura giornaliera' },
    ],
  },
  {
    id: 'account',
    title: 'Area Host -- Account & Settings',
    icon: UserCog,
    color: 'from-slate-600 to-gray-600',
    borderColor: 'border-l-slate-500',
    bgColor: 'bg-slate-50',
    textColor: 'text-slate-700',
    links: [
      { label: 'Notifiche', href: '/host/notifiche', description: 'Centro notifiche' },
      { label: 'GDPR', href: '/host/gdpr', description: 'Privacy & consensi' },
      { label: 'Registro Audit', href: '/host/audit', description: 'Log operazioni' },
      { label: 'Moduli Attivi', href: '/host/moduli', description: 'Feature toggle' },
      { label: 'Abbonamento', href: '/host/abbonamento', description: 'Piano e fatturazione' },
      { label: 'Profilo', href: '/host/profilo', description: 'Dati account' },
      { label: 'Utenti', href: '/host/utenti', description: 'Staff e permessi' },
      { label: 'Help Center', href: '/host/help', description: 'Guida e supporto' },
      { label: 'Onboarding', href: '/host/onboarding', description: 'Setup wizard' },
      { label: 'Impostazioni Reg Card', href: '/host/impostazioni-regcard', description: 'T&C check-in' },
    ],
  },
  {
    id: 'admin',
    title: 'Area Admin',
    icon: Shield,
    color: 'from-red-600 to-rose-700',
    borderColor: 'border-l-red-500',
    bgColor: 'bg-red-50',
    textColor: 'text-red-700',
    links: [
      { label: 'Dashboard', href: '/admin/dashboard', description: 'Overview piattaforma' },
      { label: 'Clienti (Host)', href: '/admin/clienti', description: 'Gestione host' },
      { label: 'Nuovo Cliente', href: '/admin/clienti/nuovo' },
      { label: 'Dettaglio Cliente', href: '/admin/clienti/[id]' },
      { label: 'Eventi', href: '/admin/eventi', description: 'Eventi piattaforma' },
      { label: 'Prenotazioni', href: '/admin/prenotazioni', description: 'Tutte le prenotazioni' },
      { label: 'Pagamenti', href: '/admin/pagamenti', description: 'Incassi e riconciliazione' },
      { label: 'Nuovo Pagamento', href: '/admin/pagamenti/nuovo' },
      { label: 'Fatture', href: '/admin/fatture', description: 'Fatturazione piattaforma' },
      { label: 'Nuova Fattura', href: '/admin/fatture/nuovo' },
      { label: 'Dettaglio Fattura', href: '/admin/fatture/[id]' },
      { label: 'Ticket Support', href: '/admin/ticket', description: 'Assistenza clienti' },
      { label: 'Impostazioni', href: '/admin/impostazioni', description: 'Config globale' },
    ],
  },
  {
    id: 'superadmin',
    title: 'Area SuperAdmin',
    icon: ShieldCheck,
    color: 'from-gray-800 to-gray-900',
    borderColor: 'border-l-gray-800',
    bgColor: 'bg-gray-100',
    textColor: 'text-gray-800',
    links: [
      { label: 'Dashboard', href: '/superadmin', description: 'System overview' },
      { label: 'Host', href: '/superadmin/host', description: 'Tutti gli host' },
      { label: 'Strutture', href: '/superadmin/strutture', description: 'Tutte le strutture' },
      { label: 'Utenti', href: '/superadmin/utenti', description: 'Gestione utenti globale' },
      { label: 'Abbonamenti', href: '/superadmin/abbonamenti', description: 'Piani e billing' },
      { label: 'Fatture', href: '/superadmin/fatture', description: 'Fatture piattaforma' },
      { label: 'Moduli', href: '/superadmin/moduli', description: 'Feature flags globali' },
      { label: 'Analytics', href: '/superadmin/analytics', description: 'Metriche sistema' },
      { label: 'Monitoring', href: '/superadmin/monitoring', description: 'Health & performance' },
      { label: 'Impostazioni', href: '/superadmin/impostazioni', description: 'Config sistema' },
    ],
  },
]

const apiGroups: ApiGroup[] = [
  {
    title: 'Host -- Prenotazioni & Strutture',
    color: 'text-emerald-400',
    routes: [
      { method: 'GET|POST', path: '/api/host/prenotazioni' },
      { method: 'GET|PATCH|DELETE', path: '/api/host/prenotazioni/[id]' },
      { method: 'POST', path: '/api/host/prenotazioni/[id]/checkin' },
      { method: 'POST', path: '/api/host/prenotazioni/[id]/checkout' },
      { method: 'POST', path: '/api/host/prenotazioni/[id]/assegna-camera' },
      { method: 'GET|POST', path: '/api/host/prenotazioni/[id]/addebiti' },
      { method: 'GET', path: '/api/host/prenotazioni/[id]/conto' },
      { method: 'GET|POST', path: '/api/host/prenotazioni/[id]/pasto' },
      { method: 'POST', path: '/api/host/prenotazioni/[id]/chat' },
      { method: 'POST', path: '/api/host/prenotazioni/[id]/checkin-token' },
      { method: 'POST', path: '/api/host/prenotazioni/[id]/scheda-ospite' },
      { method: 'GET|POST', path: '/api/host/prenotazioni/[id]/accompagnatori' },
      { method: 'GET', path: '/api/host/prenotazioni/export' },
      { method: 'POST', path: '/api/host/prenotazioni/import' },
      { method: 'GET|POST', path: '/api/host/strutture' },
      { method: 'GET|PATCH|DELETE', path: '/api/host/strutture/[id]' },
      { method: 'GET|POST', path: '/api/host/strutture/[id]/unita' },
      { method: 'GET|PATCH|DELETE', path: '/api/host/strutture/[id]/unita/[unitaId]' },
      { method: 'GET', path: '/api/host/strutture/[id]/unita/[unitaId]/ical' },
      { method: 'GET|POST', path: '/api/host/strutture/[id]/disponibilita' },
      { method: 'GET|POST', path: '/api/host/strutture/[id]/tariffe' },
      { method: 'GET|POST', path: '/api/host/strutture/[id]/regole-tariffa' },
      { method: 'GET', path: '/api/host/strutture/[id]/calcola-prezzo' },
      { method: 'GET', path: '/api/host/strutture/[id]/ical' },
      { method: 'GET|PATCH', path: '/api/host/strutture/[id]/impostazioni' },
      { method: 'GET', path: '/api/host/strutture/[id]/pannello' },
      { method: 'GET|POST', path: '/api/host/strutture/[id]/pasti' },
    ],
  },
  {
    title: 'Host -- SPA',
    color: 'text-pink-400',
    routes: [
      { method: 'GET|POST', path: '/api/host/spa/appuntamenti' },
      { method: 'GET|PATCH', path: '/api/host/spa/appuntamenti/[id]' },
      { method: 'GET|POST', path: '/api/host/spa/trattamenti' },
      { method: 'GET|PATCH|DELETE', path: '/api/host/spa/trattamenti/[id]' },
      { method: 'GET|POST', path: '/api/host/spa/percorsi' },
      { method: 'GET|PATCH|DELETE', path: '/api/host/spa/percorsi/[id]' },
      { method: 'GET|POST', path: '/api/host/spa/terapisti' },
      { method: 'GET|PATCH|DELETE', path: '/api/host/spa/terapisti/[id]' },
      { method: 'GET|POST', path: '/api/host/spa/terapisti/[id]/disponibilita' },
      { method: 'DELETE', path: '/api/host/spa/terapisti/[id]/disponibilita/[slotId]' },
      { method: 'GET|POST', path: '/api/host/spa/cabine' },
      { method: 'GET|PATCH|DELETE', path: '/api/host/spa/cabine/[id]' },
      { method: 'GET|POST', path: '/api/host/spa/cabine/[id]/dotazione' },
      { method: 'POST', path: '/api/host/spa/cabine/[id]/hk' },
      { method: 'GET', path: '/api/host/spa/calendario' },
      { method: 'GET', path: '/api/host/spa/check-disponibilita' },
      { method: 'GET', path: '/api/host/spa/biancheria' },
      { method: 'GET|POST', path: '/api/host/spa/gift-card' },
      { method: 'GET|PATCH', path: '/api/host/spa/gift-card/[id]' },
      { method: 'POST', path: '/api/host/spa/gift-card/redeem' },
      { method: 'GET|POST', path: '/api/host/spa/loyalty' },
      { method: 'GET', path: '/api/host/spa/loyalty/members' },
      { method: 'POST', path: '/api/host/spa/loyalty/points' },
      { method: 'GET|POST', path: '/api/host/spa/waiting-list' },
      { method: 'GET', path: '/api/host/spa/turnaway' },
      { method: 'GET', path: '/api/host/spa/report/advanced' },
      { method: 'GET|PATCH', path: '/api/host/spa/ospite-preferenze/[ospiteId]' },
    ],
  },
  {
    title: 'Host -- Operations',
    color: 'text-amber-400',
    routes: [
      { method: 'GET|POST', path: '/api/host/crm' },
      { method: 'GET|PATCH|DELETE', path: '/api/host/crm/[id]' },
      { method: 'GET|POST', path: '/api/host/housekeeping' },
      { method: 'GET|POST', path: '/api/host/housekeeping/task' },
      { method: 'PATCH', path: '/api/host/housekeeping/task/[id]' },
      { method: 'PATCH', path: '/api/host/housekeeping/unita/[id]' },
      { method: 'GET|POST', path: '/api/host/biancheria' },
      { method: 'POST', path: '/api/host/biancheria/[id]/invia' },
      { method: 'GET|POST', path: '/api/host/biancheria/dotazione' },
      { method: 'GET|POST', path: '/api/host/manutenzione' },
      { method: 'GET|PATCH', path: '/api/host/manutenzione/[id]' },
      { method: 'GET|POST', path: '/api/host/staff' },
      { method: 'GET|PATCH|DELETE', path: '/api/host/staff/[id]' },
      { method: 'POST', path: '/api/host/alloggiati' },
      { method: 'GET|POST', path: '/api/host/oggetti-smarriti' },
      { method: 'PATCH', path: '/api/host/oggetti-smarriti/[id]' },
      { method: 'GET|POST', path: '/api/host/magazzino' },
      { method: 'GET|PATCH|DELETE', path: '/api/host/magazzino/[id]' },
      { method: 'POST', path: '/api/host/magazzino/[id]/movimento' },
      { method: 'GET|POST', path: '/api/host/ristorazione' },
      { method: 'GET|POST', path: '/api/host/ristorazione/menu' },
      { method: 'PATCH|DELETE', path: '/api/host/ristorazione/menu/[id]' },
      { method: 'GET', path: '/api/host/ristorazione/scelte' },
    ],
  },
  {
    title: 'Host -- Business & Settings',
    color: 'text-violet-400',
    routes: [
      { method: 'GET|POST', path: '/api/host/eventi' },
      { method: 'GET|POST', path: '/api/host/pacchetti' },
      { method: 'GET|PATCH|DELETE', path: '/api/host/pacchetti/[id]' },
      { method: 'GET|POST', path: '/api/host/servizi' },
      { method: 'GET|PATCH|DELETE', path: '/api/host/servizi/[id]' },
      { method: 'GET|POST', path: '/api/host/servizi/pacchetti' },
      { method: 'GET|PATCH|DELETE', path: '/api/host/servizi/pacchetti/[id]' },
      { method: 'GET', path: '/api/host/report' },
      { method: 'GET', path: '/api/host/report/pdf' },
      { method: 'GET', path: '/api/host/report/crediti' },
      { method: 'POST', path: '/api/host/report/crediti/sollecito' },
      { method: 'GET', path: '/api/host/report/statistiche-istat' },
      { method: 'GET', path: '/api/host/report/tassa-soggiorno' },
      { method: 'GET|POST', path: '/api/host/canali' },
      { method: 'GET|PATCH|DELETE', path: '/api/host/canali/[id]' },
      { method: 'POST', path: '/api/host/canali/[id]/sync' },
      { method: 'GET|POST', path: '/api/host/pos' },
      { method: 'PATCH', path: '/api/host/pos/[id]' },
      { method: 'GET|POST', path: '/api/host/cassa/incassi' },
      { method: 'GET|POST', path: '/api/host/cassa/chiusura' },
      { method: 'GET', path: '/api/host/cassa/chiusura/[id]' },
      { method: 'GET', path: '/api/host/cassa/report' },
      { method: 'GET|POST', path: '/api/host/concierge' },
      { method: 'GET|PATCH', path: '/api/host/concierge/[id]' },
      { method: 'POST', path: '/api/host/concierge/simulate' },
      { method: 'GET|POST', path: '/api/host/upsell/regole' },
      { method: 'POST', path: '/api/host/upsell/proponi' },
      { method: 'GET', path: '/api/host/upsell' },
      { method: 'GET', path: '/api/host/widget' },
      { method: 'GET|POST', path: '/api/host/chat/[id]' },
      { method: 'POST', path: '/api/host/email-automatiche/invia' },
      { method: 'GET', path: '/api/host/email-queue' },
      { method: 'POST', path: '/api/host/pagamento-checkout' },
      { method: 'GET|POST', path: '/api/host/payment-config' },
    ],
  },
  {
    title: 'Host -- Account',
    color: 'text-slate-400',
    routes: [
      { method: 'GET|PATCH', path: '/api/host/profilo' },
      { method: 'GET|POST', path: '/api/host/notifiche' },
      { method: 'PATCH', path: '/api/host/notifiche/[id]' },
      { method: 'GET|POST', path: '/api/host/utenti' },
      { method: 'GET|PATCH|DELETE', path: '/api/host/utenti/[id]' },
      { method: 'DELETE', path: '/api/host/utenti/inviti/[id]' },
      { method: 'GET|POST', path: '/api/host/moduli' },
      { method: 'GET', path: '/api/host/abbonamento' },
      { method: 'POST', path: '/api/host/abbonamento/upgrade' },
      { method: 'GET|POST', path: '/api/host/gdpr' },
      { method: 'POST', path: '/api/host/gdpr/retention' },
      { method: 'GET', path: '/api/host/audit' },
      { method: 'GET', path: '/api/host/traces' },
      { method: 'GET', path: '/api/host/traces/[id]' },
      { method: 'POST', path: '/api/host/alert-ospite' },
      { method: 'POST', path: '/api/host/kiosk' },
      { method: 'GET|POST', path: '/api/host/onboarding' },
      { method: 'GET|POST', path: '/api/host/regcard-settings' },
      { method: 'GET', path: '/api/host/search' },
      { method: 'POST', path: '/api/host/upload' },
    ],
  },
  {
    title: 'Public Booking',
    color: 'text-sky-400',
    routes: [
      { method: 'GET|POST', path: '/api/book/[strutturaId]' },
      { method: 'GET', path: '/api/book/[strutturaId]/disponibili' },
      { method: 'GET|POST', path: '/api/book/[strutturaId]/spa' },
      { method: 'POST', path: '/api/book/[strutturaId]/spa/prenota' },
      { method: 'GET', path: '/api/book/[strutturaId]/spa/disponibilita' },
      { method: 'GET', path: '/api/book/[strutturaId]/spa/trattamenti' },
      { method: 'GET|POST', path: '/api/book/chat/[id]' },
      { method: 'GET|POST', path: '/api/book/pasto/[prenotazioneId]' },
      { method: 'POST|GET', path: '/api/spa/waiver' },
      { method: 'POST|GET', path: '/api/spa/pagamento' },
      { method: 'POST', path: '/api/spa/registration-card' },
      { method: 'GET|POST', path: '/api/checkin/[token]' },
      { method: 'POST', path: '/api/checkin/[token]/registration-card' },
      { method: 'POST', path: '/api/registrazione/[token]' },
    ],
  },
  {
    title: 'Kiosk',
    color: 'text-teal-400',
    routes: [
      { method: 'POST', path: '/api/kiosk/[token]/sign' },
      { method: 'GET', path: '/api/kiosk/spa/[cabinaId]' },
      { method: 'POST', path: '/api/kiosk/spa/[cabinaId]/sign' },
    ],
  },
  {
    title: 'Admin',
    color: 'text-red-400',
    routes: [
      { method: 'GET|POST', path: '/api/admin/clienti' },
      { method: 'GET|PATCH|DELETE', path: '/api/admin/clienti/[id]' },
      { method: 'GET', path: '/api/admin/hosts/[id]/canali' },
      { method: 'GET|POST', path: '/api/admin/fatture' },
      { method: 'GET|PATCH', path: '/api/admin/fatture/[id]' },
      { method: 'GET', path: '/api/admin/fatture/[id]/pdf' },
      { method: 'GET', path: '/api/admin/fatture/[id]/xml' },
      { method: 'GET|POST', path: '/api/admin/pagamenti' },
      { method: 'GET|PATCH', path: '/api/admin/pagamenti/[id]' },
      { method: 'GET', path: '/api/admin/prenotazioni' },
      { method: 'PATCH', path: '/api/admin/eventi/[id]' },
      { method: 'GET|POST', path: '/api/admin/ticket' },
      { method: 'GET|PATCH', path: '/api/admin/ticket/[id]' },
      { method: 'POST', path: '/api/admin/password' },
    ],
  },
  {
    title: 'SuperAdmin',
    color: 'text-gray-300',
    routes: [
      { method: 'GET|POST', path: '/api/superadmin/utenti' },
      { method: 'GET|PATCH|DELETE', path: '/api/superadmin/utenti/[id]' },
      { method: 'PATCH', path: '/api/superadmin/host/[id]/config' },
      { method: 'PATCH', path: '/api/superadmin/host/[id]/moduli' },
      { method: 'GET|POST', path: '/api/superadmin/moduli' },
      { method: 'POST', path: '/api/superadmin/system/clear-cache' },
      { method: 'POST', path: '/api/superadmin/system/regen-prisma' },
    ],
  },
  {
    title: 'Cron & Webhooks',
    color: 'text-yellow-400',
    routes: [
      { method: 'GET', path: '/api/cron/reminder-spa' },
      { method: 'GET', path: '/api/cron/email-automatiche' },
      { method: 'GET', path: '/api/cron/biancheria' },
      { method: 'GET', path: '/api/cron/check-abbonamenti' },
      { method: 'GET', path: '/api/cron/gdpr-retention' },
      { method: 'GET', path: '/api/cron/sync-canali' },
      { method: 'POST', path: '/api/whatsapp/webhook' },
      { method: 'POST', path: '/api/chat/[chatId]/stream' },
      { method: 'POST', path: '/api/chat/[chatId]/typing' },
      { method: 'POST', path: '/api/ticket' },
      { method: 'POST', path: '/api/locale' },
    ],
  },
]

const modules: Module[] = [
  // Base
  { name: 'Prenotazioni', icon: CalendarDays, category: 'Base' },
  { name: 'Strutture & Unita', icon: Building2, category: 'Base' },
  { name: 'Tariffe & Disponibilita', icon: CircleDollarSign, category: 'Base' },
  { name: 'CRM Ospiti', icon: Users, category: 'Base' },
  { name: 'Check-in Online', icon: BadgeCheck, category: 'Base' },
  { name: 'Fatturazione SDI', icon: Receipt, category: 'Base' },
  { name: 'Dashboard & Report', icon: BarChart3, category: 'Base' },
  // Operativi
  { name: 'Housekeeping', icon: Bed, category: 'Operativi' },
  { name: 'Biancheria', icon: Truck, category: 'Operativi' },
  { name: 'Manutenzione', icon: Wrench, category: 'Operativi' },
  { name: 'Staff Management', icon: Users, category: 'Operativi' },
  { name: 'Alloggiati Web', icon: Clipboard, category: 'Operativi' },
  { name: 'Ristorazione & Menu', icon: UtensilsCrossed, category: 'Operativi' },
  { name: 'Magazzino', icon: Package, category: 'Operativi' },
  { name: 'Lost & Found', icon: Search, category: 'Operativi' },
  // Avanzati
  { name: 'SPA & Benessere', icon: Heart, category: 'Avanzati' },
  { name: 'Gift Card', icon: Gift, category: 'Avanzati' },
  { name: 'Loyalty Program', icon: Star, category: 'Avanzati' },
  { name: 'POS & Cassa', icon: CreditCard, category: 'Avanzati' },
  { name: 'Pacchetti & Upselling', icon: Sparkles, category: 'Avanzati' },
  { name: 'Email Automatiche', icon: Mail, category: 'Avanzati' },
  { name: 'GDPR & Privacy', icon: Lock, category: 'Avanzati' },
  { name: 'Kiosk & Tablet', icon: Monitor, category: 'Avanzati' },
  // Integrazioni
  { name: 'AI Concierge (WhatsApp)', icon: Bot, category: 'Integrazioni' },
  { name: 'Channel Manager', icon: Wifi, category: 'Integrazioni' },
  { name: 'Widget Booking', icon: Zap, category: 'Integrazioni' },
  { name: 'Webhook & API', icon: Server, category: 'Integrazioni' },
]

const categoryColors: Record<string, { bg: string; text: string; border: string }> = {
  Base:          { bg: 'bg-emerald-100', text: 'text-emerald-800', border: 'border-emerald-200' },
  Operativi:     { bg: 'bg-amber-100',   text: 'text-amber-800',   border: 'border-amber-200' },
  Avanzati:      { bg: 'bg-violet-100',  text: 'text-violet-800',  border: 'border-violet-200' },
  Integrazioni:  { bg: 'bg-sky-100',     text: 'text-sky-800',     border: 'border-sky-200' },
}

// ─── Components ───────────────────────────────────────────────────────────────

function CollapsibleSection({
  title,
  icon: Icon,
  color,
  borderColor,
  bgColor,
  textColor,
  links,
  defaultOpen = true,
}: Section & { defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div className={`bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden transition-shadow hover:shadow-md`}>
      <button
        onClick={() => setOpen(!open)}
        className={`w-full flex items-center gap-3 px-5 py-4 bg-gradient-to-r ${color} text-white cursor-pointer`}
      >
        <Icon className="w-5 h-5 shrink-0" />
        <span className="font-semibold text-lg flex-1 text-left">{title}</span>
        <span className="text-white/70 text-sm mr-2">{links.length} pagine</span>
        {open ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
      </button>
      {open && (
        <div className="p-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
            {links.map((link, i) => (
              <Link
                key={i}
                href={link.href.includes('[') ? '#' : link.href}
                className={`group flex items-start gap-2 px-3 py-2.5 rounded-lg border ${borderColor} border-l-4 ${bgColor} hover:shadow-sm transition-all`}
              >
                <div className="flex-1 min-w-0">
                  <div className={`text-sm font-medium ${textColor} group-hover:underline`}>
                    {link.label}
                  </div>
                  {link.description && (
                    <div className="text-xs text-gray-500 mt-0.5 truncate">{link.description}</div>
                  )}
                  <div className="text-[10px] text-gray-400 font-mono mt-0.5 truncate">{link.href}</div>
                </div>
                <ExternalLink className="w-3.5 h-3.5 text-gray-400 shrink-0 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity" />
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function ApiSection() {
  const [open, setOpen] = useState(false)
  const totalRoutes = apiGroups.reduce((sum, g) => sum + g.routes.length, 0)

  return (
    <div className="bg-gray-900 rounded-xl shadow-sm border border-gray-700 overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 px-5 py-4 bg-gradient-to-r from-gray-800 to-gray-900 text-white cursor-pointer"
      >
        <Server className="w-5 h-5 shrink-0" />
        <span className="font-semibold text-lg flex-1 text-left">API Routes</span>
        <span className="text-gray-400 text-sm mr-2">{totalRoutes} endpoints</span>
        {open ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
      </button>
      {open && (
        <div className="p-5 space-y-6">
          {apiGroups.map((group, gi) => (
            <div key={gi}>
              <h4 className={`text-sm font-bold ${group.color} mb-2 uppercase tracking-wider`}>
                {group.title}
                <span className="text-gray-500 font-normal ml-2 normal-case tracking-normal">
                  ({group.routes.length})
                </span>
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-1">
                {group.routes.map((route, ri) => (
                  <div key={ri} className="flex items-center gap-2 font-mono text-xs py-1 px-2 rounded hover:bg-gray-800/50">
                    <span className="text-yellow-400 font-bold shrink-0 w-28 text-right">{route.method}</span>
                    <span className="text-gray-300 truncate">{route.path}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function ModulesGrid() {
  const [open, setOpen] = useState(true)
  const categories = ['Base', 'Operativi', 'Avanzati', 'Integrazioni'] as const

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden transition-shadow hover:shadow-md">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 px-5 py-4 bg-gradient-to-r from-indigo-600 to-blue-600 text-white cursor-pointer"
      >
        <Boxes className="w-5 h-5 shrink-0" />
        <span className="font-semibold text-lg flex-1 text-left">Moduli Disponibili</span>
        <span className="text-white/70 text-sm mr-2">{modules.length} moduli</span>
        {open ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
      </button>
      {open && (
        <div className="p-5 space-y-6">
          {categories.map((cat) => {
            const catModules = modules.filter((m) => m.category === cat)
            const colors = categoryColors[cat]
            return (
              <div key={cat}>
                <div className="flex items-center gap-2 mb-3">
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${colors.bg} ${colors.text} border ${colors.border}`}>
                    {cat}
                  </span>
                  <span className="text-xs text-gray-400">{catModules.length} moduli</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
                  {catModules.map((mod, i) => {
                    const ModIcon = mod.icon
                    return (
                      <div
                        key={i}
                        className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg border ${colors.border} ${colors.bg} transition hover:shadow-sm`}
                      >
                        <ModIcon className={`w-4 h-4 ${colors.text} shrink-0`} />
                        <span className={`text-xs font-medium ${colors.text} leading-tight`}>{mod.name}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SystemMapPage() {
  const totalPages = sections.reduce((sum, s) => sum + s.links.length, 0)
  const totalApiRoutes = apiGroups.reduce((sum, g) => sum + g.routes.length, 0)

  return (
    <main className="min-h-screen bg-gray-50">
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <header className="bg-gradient-to-br from-gray-900 via-slate-900 to-gray-800 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center">
                  <MapPin className="w-6 h-6 text-blue-400" />
                </div>
                <span className="text-sm font-medium text-blue-400 uppercase tracking-widest">PMS</span>
              </div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight">
                Otium Week
              </h1>
              <p className="text-xl sm:text-2xl text-gray-300 mt-1">
                Mappa del Sistema
              </p>
              <p className="text-sm text-gray-500 mt-3">
                Property Management System completo per strutture ricettive italiane
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              {[
                { n: `${totalPages}+`, label: 'Pagine', color: 'bg-blue-500/20 text-blue-300 border-blue-500/30' },
                { n: '37', label: 'Modelli DB', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' },
                { n: `${modules.length}`, label: 'Moduli', color: 'bg-violet-500/20 text-violet-300 border-violet-500/30' },
                { n: `${totalApiRoutes}`, label: 'API Routes', color: 'bg-amber-500/20 text-amber-300 border-amber-500/30' },
              ].map((stat) => (
                <div key={stat.label} className={`px-4 py-2 rounded-lg border ${stat.color} text-center min-w-[80px]`}>
                  <div className="text-lg font-bold">{stat.n}</div>
                  <div className="text-[10px] uppercase tracking-wider opacity-70">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Links */}
          <div className="flex flex-wrap gap-2 mt-6 pt-6 border-t border-white/10">
            {[
              { label: 'Login', href: '/login', icon: LogIn },
              { label: 'Landing Page', href: '/', icon: Globe },
              { label: 'Booking', href: '/book', icon: ShoppingCart },
              { label: 'Host Dashboard', href: '/host/dashboard', icon: LayoutDashboard },
              { label: 'Admin', href: '/admin/dashboard', icon: Shield },
              { label: 'Docs', href: '/docs', icon: BookOpen },
            ].map((ql) => (
              <Link
                key={ql.href}
                href={ql.href}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-sm text-white/80 hover:text-white transition"
              >
                <ql.icon className="w-3.5 h-3.5" />
                {ql.label}
              </Link>
            ))}
          </div>
        </div>
      </header>

      {/* ── Body ──────────────────────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-4">
        {/* Page sections */}
        {sections.map((section) => (
          <CollapsibleSection key={section.id} {...section} defaultOpen={section.id === 'pubbliche' || section.id === 'ricevimento'} />
        ))}

        {/* API Routes */}
        <ApiSection />

        {/* Modules */}
        <ModulesGrid />

        {/* ── Tech Stack Footer ──────────────────────────────────────────── */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mt-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h3 className="font-semibold text-gray-900">Tech Stack</h3>
              <p className="text-sm text-gray-500 mt-0.5">Multi-tenant SaaS, server components + REST API</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {[
                'Next.js 16', 'React 19', 'TypeScript 5', 'Tailwind CSS',
                'Prisma 5', 'PostgreSQL (Neon)', 'NextAuth 4 (JWT)', 'Zod',
              ].map((tech) => (
                <span key={tech} className="px-2.5 py-1 bg-gray-100 rounded-md text-xs font-medium text-gray-600 border border-gray-200">
                  {tech}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Test Accounts */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Test Accounts</h3>
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="font-semibold text-red-900 text-sm">Admin</p>
              <p className="text-xs text-red-700 mt-1 font-mono">admin@otiumweek.it</p>
              <p className="text-xs text-red-600 mt-0.5">Password: vedi db:seed</p>
            </div>
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
              <p className="font-semibold text-emerald-900 text-sm">Host</p>
              <p className="text-xs text-emerald-700 mt-1 font-mono">host@example.com</p>
              <p className="text-xs text-emerald-600 mt-0.5">Crea via Admin o seed</p>
            </div>
          </div>
        </div>

        {/* CLI Commands */}
        <div className="bg-gray-900 rounded-xl shadow-sm border border-gray-700 p-6">
          <h3 className="font-semibold text-white mb-4">Dev Commands</h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {[
              { cmd: 'npm run dev', desc: 'Dev server :3000' },
              { cmd: 'npm run build', desc: 'Production build' },
              { cmd: 'npm run lint', desc: 'ESLint' },
              { cmd: 'npm run db:push', desc: 'Push schema' },
              { cmd: 'npm run db:generate', desc: 'Regen Prisma client' },
              { cmd: 'npm run db:studio', desc: 'Prisma Studio :5555' },
              { cmd: 'npm run db:seed', desc: 'Seed database' },
              { cmd: 'npm run test:e2e', desc: 'Playwright tests' },
              { cmd: 'npm run test:e2e:ui', desc: 'Playwright UI' },
            ].map((item) => (
              <div key={item.cmd} className="bg-gray-800 rounded-lg px-3 py-2 font-mono text-xs">
                <span className="text-green-400">$ {item.cmd}</span>
                <span className="text-gray-500 ml-2">-- {item.desc}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Copyright */}
        <p className="text-center text-xs text-gray-400 pt-4 pb-8">
          Otium Week PMS -- Mappa del Sistema -- {new Date().getFullYear()}
        </p>
      </div>
    </main>
  )
}
