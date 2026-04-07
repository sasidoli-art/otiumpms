'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { signOut } from 'next-auth/react'
import {
  LayoutDashboard, CalendarDays, BarChart3, CreditCard, FileText, UserCircle,
  LogOut, Building2, BookOpen, Sun, TrendingUp, Sparkles, Users, Wrench,
  MessageSquare, CalendarPlus, PanelLeftClose, PanelLeftOpen, CalendarRange,
  Package, Shield, Waves, DoorOpen, Star, CalendarClock, Bell, Mail, Eye,
  ClipboardCheck, Puzzle, Search, UtensilsCrossed, Clock, Globe, Boxes,
  X, ExternalLink, Banknote, ShoppingBag, Award, Bot, HelpCircle, Code,
  Shirt, Settings, Receipt, Tag,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { parseModuli } from '@/lib/moduli'
import { canAccessSection } from '@/lib/permissions'
import { useState, useEffect, useMemo } from 'react'

// Mapping: href sidebar → id modulo (se non presente = sempre visibile)
const HREF_MODULO: Record<string, string> = {
  '/host/crm': 'crm',
  '/host/concierge': 'concierge',
  '/host/housekeeping': 'housekeeping',
  '/host/housekeeping/biancheria': 'housekeeping',
  '/host/manutenzione': 'manutenzione',
  '/host/magazzino': 'magazzino',
  '/host/oggetti-smarriti': 'lostFound',
  '/host/staff': 'staff',
  '/host/alloggiati': 'alloggiati',
  '/host/promemoria': 'promemoria',
  '/host/ristorazione': 'ristorazione',
  '/host/ristorazione/menu': 'ristorazione',
  '/host/spa': 'spa',
  '/host/spa/calendario': 'spa',
  '/host/spa/appuntamenti': 'spa',
  '/host/spa/trattamenti': 'spa',
  '/host/spa/percorsi': 'spa',
  '/host/spa/terapisti': 'spa',
  '/host/spa/cabine': 'spa',
  '/host/spa/gift-card': 'giftCard',
  '/host/spa/loyalty': 'loyalty',
  '/host/spa/waiting-list': 'waitingList',
  '/host/pos': 'pos',
  '/host/cassa': 'cassa',
  '/host/servizi': 'catalogo',
  '/host/upselling': 'upselling',
  '/host/eventi': 'eventi',
  '/host/pacchetti': 'eventi',
  '/host/fatture': 'fatturazione',
  '/host/email-automatiche': 'emailAuto',
  '/host/canali': 'channelMgr',
  '/host/fatture-emesse': 'fatturazioneE',
  '/host/allotment': 'allotment',
  '/host/business-intelligence': 'biPrevisionale',
}

const allNavGroups = [
  // ── PANORAMICA ──
  {
    label: 'PANORAMICA',
    items: [
      { href: '/host/dashboard',   label: 'Dashboard',       icon: LayoutDashboard },
      { href: '/host/oggi',        label: 'Front desk',      icon: Sun },
      { href: '/host/calendario',  label: 'Calendario',      icon: CalendarRange },
    ],
  },
  // ── PRENOTAZIONI ──
  {
    label: 'PRENOTAZIONI',
    items: [
      { href: '/host/prenotazioni',       label: 'Prenotazioni',  icon: BookOpen },
      { href: '/host/prenotazioni/nuova', label: 'Nuova',         icon: CalendarPlus },
    ],
  },
  // ── STRUTTURA ──
  {
    label: 'STRUTTURA',
    items: [
      { href: '/host/pacchetti',   label: 'Pacchetti',        icon: Package },
      { href: '/host/canali',      label: 'Channel Manager',  icon: Globe },
    ],
  },
  // ── OSPITI ──
  {
    label: 'OSPITI',
    items: [
      { href: '/host/crm',          label: 'CRM Ospiti',      icon: Users },
      { href: '/host/concierge',    label: 'AI Concierge',    icon: Bot },
      { href: '/host/alloggiati',   label: 'Alloggiati Web',  icon: Shield },
    ],
  },
  // ── OPERAZIONI ──
  {
    label: 'OPERAZIONI',
    items: [
      { href: '/host/housekeeping',            label: 'Housekeeping',  icon: Sparkles },
      { href: '/host/housekeeping/biancheria', label: 'Biancheria',    icon: Shirt },
      { href: '/host/manutenzione',            label: 'Manutenzione',  icon: Wrench },
      { href: '/host/magazzino',               label: 'Magazzino',     icon: Boxes },
      { href: '/host/oggetti-smarriti',        label: 'Lost & Found',  icon: Search },
      { href: '/host/promemoria',              label: 'Promemoria',    icon: ClipboardCheck },
      { href: '/host/staff',                   label: 'Bacheca staff', icon: MessageSquare },
    ],
  },
  // ── F&B ──
  {
    label: 'F&B',
    items: [
      { href: '/host/ristorazione',      label: 'Coperti giornalieri', icon: UtensilsCrossed },
      { href: '/host/ristorazione/menu', label: 'Menu & piatti',       icon: ClipboardCheck },
    ],
  },
  // ── SPA & BENESSERE ──
  {
    label: 'SPA & BENESSERE',
    items: [
      { href: '/host/spa',               label: 'Dashboard',      icon: Waves },
      { href: '/host/spa/calendario',    label: 'Calendario',     icon: CalendarClock },
      { href: '/host/spa/appuntamenti',  label: 'Appuntamenti',   icon: CalendarDays },
      { href: '/host/spa/trattamenti',   label: 'Trattamenti',    icon: Sparkles },
      { href: '/host/spa/percorsi',      label: 'Percorsi',       icon: Star },
      { href: '/host/spa/terapisti',     label: 'Terapisti',      icon: Users },
      { href: '/host/spa/cabine',        label: 'Cabine',         icon: DoorOpen },
      { href: '/host/spa/gift-card',     label: 'Gift Card',      icon: Tag },
      { href: '/host/spa/loyalty',       label: 'Fedeltà',        icon: Award },
      { href: '/host/spa/waiting-list',  label: 'Waiting List',   icon: Clock },
    ],
  },
  // ── CASSA & VENDITE ──
  {
    label: 'CASSA & VENDITE',
    items: [
      { href: '/host/pos',        label: 'POS',               icon: Receipt },
      { href: '/host/cassa',      label: 'Cassa / Incassi',   icon: Banknote },
      { href: '/host/servizi',    label: 'Catalogo servizi',  icon: ShoppingBag },
      { href: '/host/upselling',  label: 'Upselling',         icon: TrendingUp },
    ],
  },
  // ── REPORT & FINANZA ──
  {
    label: 'REPORT & FINANZA',
    items: [
      { href: '/host/report',                label: 'Report',                icon: BarChart3 },
      { href: '/host/analytics',             label: 'Analytics',              icon: TrendingUp },
      { href: '/host/business-intelligence', label: 'Business Intelligence',  icon: BarChart3 },
      { href: '/host/fatture',               label: 'Fatture ricevute',       icon: FileText },
      { href: '/host/fatture-emesse',        label: 'Fatture emesse',         icon: Receipt },
      { href: '/host/allotment',             label: 'Contratti & Allotment',  icon: FileText },
      { href: '/host/email-automatiche',     label: 'Email auto',             icon: Mail },
      { href: '/host/eventi',                label: 'I miei eventi',          icon: CalendarDays },
    ],
  },
  // ── IMPOSTAZIONI ──
  {
    label: 'IMPOSTAZIONI',
    items: [
      { href: '/host/profilo',              label: 'Profilo azienda',    icon: UserCircle },
      { href: '/host/strutture',            label: 'Impostazioni strutture', icon: Building2 },
      { href: '/host/utenti',               label: 'Gestione utenti',   icon: Users },
      { href: '/host/moduli',               label: 'Moduli attivi',     icon: Puzzle },
      { href: '/host/abbonamento',          label: 'Abbonamento',       icon: CreditCard },
      { href: '/host/impostazioni-regcard', label: 'Registration Card', icon: FileText },
      { href: '/host/integrazione',         label: 'Widget sito',       icon: Code },
      { href: '/host/gdpr',                 label: 'GDPR & Privacy',    icon: Shield },
      { href: '/host/notifiche',            label: 'Notifiche',         icon: Bell },
      { href: '/host/audit',                label: 'Registro attività', icon: Clock },
      { href: '/host/help',                 label: 'Help Center',       icon: HelpCircle },
    ],
  },
]

// Color dots for section headers
const GROUP_DOT_COLOR: Record<string, string> = {
  'PANORAMICA': 'bg-blue-400',
  'PRENOTAZIONI': 'bg-indigo-400',
  'STRUTTURA': 'bg-emerald-400',
  'OSPITI': 'bg-violet-400',
  'OPERAZIONI': 'bg-amber-400',
  'F&B': 'bg-orange-400',
  'SPA & BENESSERE': 'bg-teal-400',
  'CASSA & VENDITE': 'bg-green-400',
  'REPORT & FINANZA': 'bg-sky-400',
  'IMPOSTAZIONI': 'bg-slate-400',
}

export function HostSidebar({
  nomeUtente,
  nomeAzienda,
  moduliAttivi,
  logo,
  ruolo = 'HOST',
  onMobileClose,
  struttureHost = [],
  strutturaAttivaId = null,
}: {
  nomeUtente: string
  nomeAzienda: string
  moduliAttivi: unknown
  logo?: string | null
  ruolo?: string
  onMobileClose?: () => void
  struttureHost?: { id: string; nome: string }[]
  strutturaAttivaId?: string | null
}) {
  const pathname = usePathname()
  const router = useRouter()
  const [collapsed, setCollapsed] = useState(false)
  const [showLinks, setShowLinks] = useState(false)
  const [strutture, setStrutture] = useState<{ id: string; nome: string }[]>([])
  const [strutturaDropdownOpen, setStrutturaDropdownOpen] = useState(false)
  const strutturaAttiva = struttureHost.find(s => s.id === strutturaAttivaId) ?? null

  async function cambiaStruttura(id: string) {
    if (id === strutturaAttivaId) { setStrutturaDropdownOpen(false); return }
    await fetch('/api/host/struttura-attiva', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ strutturaId: id }),
    })
    setStrutturaDropdownOpen(false)
    router.refresh()
  }

  // Filtra i gruppi sidebar in base ai moduli attivi + permessi ruolo
  const moduli = useMemo(() => parseModuli(moduliAttivi), [moduliAttivi])
  const navGroups = useMemo(() => {
    return allNavGroups
      // Filtra gruppi in base al ruolo utente
      .filter(group => canAccessSection(ruolo, null, group.label))
      .map(group => ({
        ...group,
        items: group.items.filter(item => {
          const moduloId = HREF_MODULO[item.href]
          if (!moduloId) return true
          return moduli[moduloId] === true
        }),
      }))
      .filter(group => group.items.length > 0)
  }, [moduli, ruolo])

  useEffect(() => {
    if (!showLinks || strutture.length > 0) return
    fetch('/api/host/strutture')
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setStrutture(data.map((s: { id: string; nome: string }) => ({ id: s.id, nome: s.nome })))
      })
      .catch(() => {})
  }, [showLinks])

  return (
    <aside
      className={cn(
        'flex flex-col h-full bg-slate-900 text-white shrink-0 transition-all duration-300 overflow-hidden',
        collapsed ? 'w-[64px]' : 'w-[220px]'
      )}
    >
      {/* ── Logo ──────────────────────────────────────────── */}
      <div
        className={cn(
          'flex items-center h-16 border-b border-white/10 shrink-0',
          collapsed ? 'justify-center px-0' : 'justify-between px-4'
        )}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          {logo ? (
            <img src={logo} alt="" className="w-8 h-8 rounded-lg object-cover shrink-0" />
          ) : (
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-base shrink-0 select-none">
              🏨
            </div>
          )}
          {!collapsed && (
            struttureHost.length >= 2 ? (
              <div className="relative min-w-0">
                <button
                  onClick={() => setStrutturaDropdownOpen(v => !v)}
                  className="flex items-center gap-1 text-left min-w-0 hover:opacity-80 transition-opacity"
                >
                  <div className="min-w-0">
                    <p className="font-bold text-white text-sm leading-tight truncate max-w-[140px]">
                      {strutturaAttiva?.nome ?? 'Seleziona struttura'}
                    </p>
                    <p className="text-slate-400 text-[10px] truncate max-w-[140px]">
                      {nomeAzienda} · cambia ▾
                    </p>
                  </div>
                </button>
                {strutturaDropdownOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setStrutturaDropdownOpen(false)}
                    />
                    <div className="absolute left-0 top-full mt-2 w-60 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl py-1 z-50">
                      <div className="px-3 py-2 border-b border-slate-700">
                        <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">
                          Le tue strutture ({struttureHost.length})
                        </p>
                      </div>
                      {struttureHost.map(s => (
                        <button
                          key={s.id}
                          onClick={() => cambiaStruttura(s.id)}
                          className="w-full text-left px-3 py-2 text-sm text-slate-200 hover:bg-slate-700 flex items-center justify-between gap-2"
                        >
                          <span className="truncate">{s.nome}</span>
                          {s.id === strutturaAttivaId && <span className="text-emerald-400 text-xs">✓</span>}
                        </button>
                      ))}
                      <button
                        onClick={() => { setStrutturaDropdownOpen(false); router.push('/host/seleziona-struttura') }}
                        className="w-full text-left px-3 py-2 text-xs text-indigo-400 hover:bg-slate-700 border-t border-slate-700"
                      >
                        ⊞ Riepilogo generale
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="min-w-0">
                <p className="font-bold text-white text-sm leading-tight">Otium Week</p>
                <p className="text-slate-400 text-[11px] truncate max-w-[120px]">{nomeAzienda}</p>
              </div>
            )
          )}
        </div>
        {!collapsed && onMobileClose && (
          <button
            onClick={onMobileClose}
            className="lg:hidden text-slate-500 hover:text-white p-1 rounded transition-colors shrink-0"
          >
            <X size={18} />
          </button>
        )}
        {!collapsed && (
          <button
            onClick={() => setCollapsed(true)}
            className="hidden lg:block text-slate-500 hover:text-white p-1 rounded transition-colors shrink-0 ml-1"
            title="Comprimi menu"
          >
            <PanelLeftClose size={15} />
          </button>
        )}
      </div>

      {/* ── Navigation ────────────────────────────────────── */}
      <nav className="flex-1 overflow-y-auto py-3 space-y-0.5 px-2">
        {navGroups.map((group) => (
          <div key={group.label} className="mb-1">
            {/* Section header */}
            {!collapsed ? (
              <p className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-500 uppercase tracking-widest px-2 mb-1 mt-2 first:mt-0">
                <span className={cn('inline-block w-1.5 h-1.5 rounded-full shrink-0', GROUP_DOT_COLOR[group.label] || 'bg-slate-500')} />
                {group.label}
              </p>
            ) : (
              <div className="border-t border-white/10 my-2 mx-1" />
            )}

            {group.items.map(({ href, label, icon: Icon }) => {
              // Exact match for "nuova" to avoid activating "prenotazioni" too
              const isActive =
                pathname === href ||
                (href !== '/host/prenotazioni/nuova' &&
                  href !== '/host/prenotazioni' &&
                  pathname.startsWith(href + '/')) ||
                (href === '/host/prenotazioni' &&
                  pathname === '/host/prenotazioni')

              return (
                <Link
                  key={href}
                  href={href}
                  title={collapsed ? label : undefined}
                  className={cn(
                    'relative flex items-center gap-2.5 rounded-lg text-sm font-medium transition-all group',
                    collapsed ? 'justify-center w-10 h-10 mx-auto' : 'px-3 py-2',
                    isActive
                      ? 'bg-blue-600/20 text-blue-400 border-l-[3px] border-blue-400'
                      : 'text-slate-400 hover:bg-white/5 hover:text-slate-100 hover:translate-x-0.5'
                  )}
                >
                  <Icon size={16} className="shrink-0" />

                  {!collapsed && <span className="flex-1 truncate">{label}</span>}

                  {/* Tooltip for collapsed */}
                  {collapsed && (
                    <span className="absolute left-full ml-3 px-2.5 py-1.5 bg-slate-800 text-white text-xs rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 shadow-xl border border-white/10">
                      {label}
                    </span>
                  )}
                </Link>
              )
            })}
          </div>
        ))}
      </nav>

      {/* ── Footer ────────────────────────────────────────── */}
      <div className="border-t border-white/10 shrink-0 py-3 px-2">
        {!collapsed && (
          <div className="px-2 py-1 mb-1">
            <div className="flex items-center justify-between">
              <p className="text-[10px] text-slate-500 uppercase tracking-widest">Accesso come</p>
              <span className="text-[9px] font-medium text-slate-600 bg-slate-800 px-1.5 py-0.5 rounded">v1.0</span>
            </div>
            <p className="text-xs font-semibold text-white truncate mt-0.5">{nomeUtente}</p>
            <p className="text-[9px] text-slate-600 mt-2">Powered by <span className="text-slate-500">OtiumPMS</span></p>
          </div>
        )}

        <div className={cn('flex gap-1', collapsed ? 'flex-col items-center' : 'items-center')}>
          {collapsed && (
            <button
              onClick={() => setCollapsed(false)}
              title="Espandi menu"
              className="flex items-center justify-center w-10 h-9 rounded-lg text-slate-400 hover:bg-white/5 hover:text-white transition-all"
            >
              <PanelLeftOpen size={16} />
            </button>
          )}
          <button
            onClick={() => setShowLinks((v) => !v)}
            title="Anteprima front end"
            className={cn(
              'flex items-center gap-2.5 rounded-lg text-sm font-medium text-slate-400 hover:bg-white/5 hover:text-slate-100 transition-all',
              collapsed ? 'justify-center w-10 h-9' : 'w-full px-3 py-2'
            )}
          >
            <Eye size={16} className="shrink-0" />
            {!collapsed && <span>Anteprima front end</span>}
          </button>
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            title="Esci"
            className={cn(
              'flex items-center gap-2.5 rounded-lg text-sm font-medium text-slate-400 hover:bg-white/5 hover:text-slate-100 transition-all',
              collapsed ? 'justify-center w-10 h-9' : 'w-full px-3 py-2'
            )}
          >
            <LogOut size={16} className="shrink-0" />
            {!collapsed && <span>Esci</span>}
          </button>
        </div>
      </div>

      {/* ── Pannello link frontend ─────────────────────────── */}
      {showLinks && (
        <div className="fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowLinks(false)} />

          {/* Panel */}
          <div className="relative ml-auto w-80 max-w-full h-full bg-slate-900 border-l border-white/10 overflow-y-auto flex flex-col shadow-2xl">
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 shrink-0">
              <div className="flex items-center gap-2 text-white font-semibold text-sm">
                <Eye size={15} />
                <span>Anteprima front end</span>
              </div>
              <button
                onClick={() => setShowLinks(false)}
                className="text-slate-400 hover:text-white transition-colors p-1 rounded"
              >
                <X size={15} />
              </button>
            </div>

            <div className="flex-1 px-4 py-4 space-y-5 text-sm">
              {/* Link generici */}
              <section>
                <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2">Generali</p>
                <div className="space-y-1">
                  {[
                    { label: 'Homepage', href: '/' },
                    { label: 'Pagina prenotazioni', href: '/book' },
                  ].map(({ label, href }) => (
                    <a
                      key={href}
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-colors group"
                    >
                      <span className="truncate">{label}</span>
                      <ExternalLink size={12} className="shrink-0 opacity-50 group-hover:opacity-100" />
                    </a>
                  ))}
                </div>
              </section>

              {/* Link per struttura */}
              {strutture.length === 0 ? (
                <p className="text-slate-500 text-xs text-center py-4">Caricamento strutture…</p>
              ) : (
                strutture.map((s) => (
                  <section key={s.id}>
                    <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2 truncate">
                      {s.nome}
                    </p>
                    <div className="space-y-1">
                      {[
                        { label: 'Prenota', href: `/book/${s.id}` },
                        { label: 'Prenota (SPA)', href: `/book/${s.id}/spa` },
                        { label: 'Prenota (Pacchetti)', href: `/book/${s.id}/pacchetti` },
                      ].map(({ label, href }) => (
                        <a
                          key={href}
                          href={href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-colors group"
                        >
                          <span className="truncate">{label}</span>
                          <ExternalLink size={12} className="shrink-0 opacity-50 group-hover:opacity-100" />
                        </a>
                      ))}
                    </div>
                  </section>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </aside>
  )
}
