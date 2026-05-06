'use client'

import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  Search, Plus,
  Home, CalendarCheck, Calendar, BookOpen, Users, Globe, Package,
  Sparkles, Wrench, UtensilsCrossed, Boxes,
  Waves, Flower2, CalendarDays, CalendarClock, DoorOpen, Gift, Award, Clock,
  BarChart3, CreditCard, Banknote, FileText,
  MessageSquare, Bell, Mail, Bot, ClipboardCheck,
  Settings, Building2, UserCog, Puzzle, Crown, TrendingUp, Shield, Lock,
  ClipboardList, HelpCircle, LayoutDashboard, MessageCircle, Wallet,
  type LucideIcon,
} from 'lucide-react'
import { filterSidebarGroups, type SidebarGroup } from '@/lib/sidebar-config'
import { parseModuli } from '@/lib/moduli'
import { getAllowedSections, type StaffRole } from '@/lib/permissions'

// ─── Icon registry ──────────────────────────────────────────────────────────

const ICONS: Record<string, LucideIcon> = {
  Home, CalendarCheck, Calendar, BookOpen, Users, Globe, Package,
  Sparkles, Wrench, UtensilsCrossed, Boxes, Search,
  Waves, Flower2, CalendarDays, CalendarClock, DoorOpen, Gift, Award, Clock,
  BarChart3, CreditCard, Banknote, FileText,
  MessageSquare, Bell, Mail, Bot, ClipboardCheck,
  Settings, Building2, UserCog, Puzzle, Crown, TrendingUp, Shield, Lock,
  ClipboardList, HelpCircle, LayoutDashboard, MessageCircle, Wallet,
  Cog: Settings,
}

// ─── i18n label fallback ────────────────────────────────────────────────────

const LABELS: Record<string, string> = {
  'sidebar.group.oggi': 'Oggi',
  'sidebar.group.prenotazioniOspiti': 'Prenotazioni & Ospiti',
  'sidebar.group.operazioni': 'Operazioni',
  'sidebar.group.spa': 'SPA & Benessere',
  'sidebar.group.finanze': 'Finanze',
  'sidebar.group.comunicazione': 'Comunicazione',
  'sidebar.group.impostazioni': 'Impostazioni',
  'sidebar.dashboard': 'Dashboard',
  'sidebar.oggi': 'Front desk',
  'sidebar.calendario': 'Calendario',
  'sidebar.prenotazioni': 'Prenotazioni',
  'sidebar.crm': 'CRM Ospiti',
  'sidebar.canali': 'Channel Manager',
  'sidebar.pacchetti': 'Pacchetti',
  'sidebar.housekeeping': 'Housekeeping',
  'sidebar.manutenzione': 'Manutenzione',
  'sidebar.ristorazione': 'Ristorazione',
  'sidebar.magazzino': 'Magazzino',
  'sidebar.oggettiSmarriti': 'Lost & Found',
  'sidebar.spaDashboard': 'Dashboard SPA',
  'sidebar.spaAppuntamenti': 'Appuntamenti',
  'sidebar.spaCalendario': 'Calendario SPA',
  'sidebar.spaTrattamenti': 'Trattamenti',
  'sidebar.spaTerapisti': 'Terapisti',
  'sidebar.spaCabine': 'Cabine',
  'sidebar.spaGiftCard': 'Gift Card',
  'sidebar.spaLoyalty': 'Fedeltà',
  'sidebar.spaWaitingList': 'Waiting List',
  'sidebar.spaReport': 'Report SPA',
  'sidebar.pos': 'POS',
  'sidebar.cassa': 'Cassa / Incassi',
  'sidebar.fatture': 'Fatture',
  'sidebar.reportRevenue': 'Report Revenue',
  'sidebar.staff': 'Bacheca staff',
  'sidebar.notifiche': 'Notifiche',
  'sidebar.emailAuto': 'Email automatiche',
  'sidebar.concierge': 'AI Concierge',
  'sidebar.wifi': 'Wi-Fi Ospiti',
  'sidebar.promemoria': 'Promemoria',
  'sidebar.strutture': 'Strutture',
  'sidebar.utenti': 'Utenti & Staff',
  'sidebar.moduli': 'Moduli attivi',
  'sidebar.abbonamento': 'Abbonamento',
  'sidebar.upselling': 'Upselling',
  'sidebar.alloggiati': 'Alloggiati Web',
  'sidebar.gdpr': 'Privacy & GDPR',
  'sidebar.analytics': 'Analytics',
  'sidebar.audit': 'Registro attività',
  'sidebar.help': 'Help Center',
}

function t(key: string): string {
  return LABELS[key] || key.split('.').pop() || key
}

// ─── Search aliases ─────────────────────────────────────────────────────────

const ALIASES: Record<string, string[]> = {
  'prenotazioni': ['booking', 'bookings', 'prenota'],
  'strutture': ['camere', 'rooms', 'camera'],
  'housekeeping': ['pulizie', 'pulizia', 'cleaning'],
  'cassa': ['soldi', 'incassi', 'money', 'cash'],
  'crm': ['clienti', 'guests', 'ospiti', 'guest'],
  'manutenzione': ['guasti', 'guasto', 'riparazione', 'riparazioni', 'maintenance'],
  'concierge': ['chat', 'ai', 'assistente'],
  'spa-dashboard': ['benessere', 'wellness'],
  'spa-appuntamenti': ['appuntamento', 'appointment'],
  'spa-trattamenti': ['trattamento', 'treatment', 'massaggio', 'massaggi'],
  'fatture': ['invoice', 'fattura', 'invoices'],
  'pos': ['vendita', 'vendite', 'sale'],
  'notifiche': ['notification', 'avvisi'],
  'calendario': ['calendar', 'agenda'],
  'staff': ['team', 'comunicazioni', 'bacheca'],
  'oggi': ['front desk', 'reception', 'arrivi', 'partenze'],
  'analytics': ['statistiche', 'stats'],
}

// ─── Quick actions ──────────────────────────────────────────────────────────

interface QuickAction {
  id: string
  label: string
  href: string
  icon: 'Plus'
  group: 'Azione rapida'
  keywords: string[]
}

const QUICK_ACTIONS: QuickAction[] = [
  {
    id: 'action-nuova-prenotazione',
    label: 'Nuova prenotazione',
    href: '/host/prenotazioni/nuova',
    icon: 'Plus',
    group: 'Azione rapida',
    keywords: ['nuova', 'prenotazione', 'booking', 'crea', 'aggiungi', 'new'],
  },
  {
    id: 'action-nuova-segnalazione',
    label: 'Nuova segnalazione manutenzione',
    href: '/host/manutenzione?new=1',
    icon: 'Plus',
    group: 'Azione rapida',
    keywords: ['nuova', 'segnalazione', 'guasto', 'manutenzione', 'crea'],
  },
  {
    id: 'action-nuovo-appuntamento',
    label: 'Nuovo appuntamento SPA',
    href: '/host/spa/appuntamenti?new=1',
    icon: 'Plus',
    group: 'Azione rapida',
    keywords: ['nuovo', 'appuntamento', 'spa', 'trattamento', 'crea'],
  },
]

// ─── Result type ────────────────────────────────────────────────────────────

interface SearchResult {
  id: string
  label: string
  href: string
  icon: string
  group: string
  isAction?: boolean
}

// ─── Props ──────────────────────────────────────────────────────────────────

interface Props {
  open: boolean
  onClose: () => void
  moduliAttivi: unknown
  ruolo: string
  staffRole?: string | null
}

// ─── Component ──────────────────────────────────────────────────────────────

export function QuickSwitcher({ open, onClose, moduliAttivi, ruolo, staffRole }: Props) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const [query, setQuery] = useState('')
  const [selectedIdx, setSelectedIdx] = useState(0)

  // Build flat list of navigable items (filtered by modules + role)
  const allItems = useMemo(() => {
    const moduli = parseModuli(moduliAttivi)
    const sections = getAllowedSections(ruolo, staffRole)
    const groups = filterSidebarGroups(moduli, sections, staffRole as StaffRole | null)

    const items: SearchResult[] = []
    for (const group of groups) {
      const groupLabel = t(group.label)
      for (const item of group.items) {
        items.push({
          id: item.id,
          label: t(item.label),
          href: item.href,
          icon: item.icon,
          group: groupLabel,
        })
      }
    }

    // Quick actions (filter by module)
    for (const action of QUICK_ACTIONS) {
      if (action.href.includes('/spa/') && !moduli.spa) continue
      if (action.href.includes('/manutenzione') && !moduli.manutenzione) continue
      items.push({
        id: action.id,
        label: action.label,
        href: action.href,
        icon: action.icon,
        group: action.group,
        isAction: true,
      })
    }

    return items
  }, [moduliAttivi, ruolo, staffRole])

  // Filter results
  const results = useMemo(() => {
    if (!query.trim()) return allItems.slice(0, 8)

    const q = query.toLowerCase().trim()
    const scored: { item: SearchResult; score: number }[] = []

    for (const item of allItems) {
      const label = item.label.toLowerCase()
      const aliases = ALIASES[item.id] || []
      const isAction = item.isAction
      const actionKeywords = isAction
        ? QUICK_ACTIONS.find(a => a.id === item.id)?.keywords || []
        : []

      let score = 0

      // Exact starts-with on label
      if (label.startsWith(q)) {
        score = 100
      }
      // Contains in label
      else if (label.includes(q)) {
        score = 80
      }
      // Alias match
      else if (aliases.some(a => a.startsWith(q) || a.includes(q))) {
        score = 70
      }
      // Action keyword match
      else if (actionKeywords.some(k => k.startsWith(q) || k.includes(q))) {
        score = 90
      }
      // Word-by-word fuzzy: all query words present in label
      else {
        const words = q.split(/\s+/)
        const allText = [label, ...aliases, ...actionKeywords].join(' ')
        if (words.every(w => allText.includes(w))) {
          score = 60
        }
      }

      if (score > 0) {
        // Boost actions to top when query matches
        if (isAction && score > 0) score += 10
        scored.push({ item, score })
      }
    }

    return scored
      .sort((a, b) => b.score - a.score)
      .slice(0, 8)
      .map(s => s.item)
  }, [query, allItems])

  // Reset on open
  useEffect(() => {
    if (open) {
      setQuery('')
      setSelectedIdx(0)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  // Scroll selected into view
  useEffect(() => {
    if (!listRef.current) return
    const el = listRef.current.children[selectedIdx] as HTMLElement | undefined
    el?.scrollIntoView({ block: 'nearest' })
  }, [selectedIdx])

  // Keep selectedIdx in bounds
  useEffect(() => {
    setSelectedIdx(0)
  }, [query])

  const navigate = useCallback((href: string) => {
    onClose()
    router.push(href)
  }, [onClose, router])

  function onKeyDown(e: React.KeyboardEvent) {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedIdx(i => Math.min(i + 1, results.length - 1))
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedIdx(i => Math.max(i - 1, 0))
        break
      case 'Enter':
        e.preventDefault()
        if (results[selectedIdx]) {
          navigate(results[selectedIdx].href)
        }
        break
      case 'Escape':
        e.preventDefault()
        onClose()
        break
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh]">
      {/* Backdrop — click to close, no exit animation */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.15, ease: 'easeOut' }}
        className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-label="Cerca pagina o azione"
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100 dark:border-slate-800">
          <Search size={18} className="text-slate-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Cerca pagina o azione..."
            className="flex-1 text-base bg-transparent border-none outline-none text-slate-900 dark:text-slate-100 placeholder-slate-400"
            autoComplete="off"
            spellCheck={false}
          />
          <kbd className="text-[10px] text-slate-400 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-1.5 py-0.5 font-mono shrink-0">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div ref={listRef} className="max-h-[320px] overflow-y-auto py-1" role="listbox">
          {results.length === 0 ? (
            <div className="py-8 text-center text-sm text-slate-400">
              Nessuna pagina trovata
            </div>
          ) : (
            results.map((item, i) => {
              const Icon = item.isAction ? Plus : (ICONS[item.icon] || Settings)
              const isSelected = i === selectedIdx

              return (
                <button
                  key={item.id}
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => navigate(item.href)}
                  onMouseEnter={() => setSelectedIdx(i)}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                    isSelected
                      ? 'bg-blue-50 dark:bg-blue-900/20'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                    item.isAction
                      ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                  }`}>
                    <Icon size={16} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">
                      <HighlightMatch text={item.label} query={query} />
                    </p>
                    <p className="text-[11px] text-slate-400 truncate">{item.group}</p>
                  </div>
                  {isSelected && (
                    <span className="text-[10px] text-slate-300 dark:text-slate-600 font-mono shrink-0">
                      ↵
                    </span>
                  )}
                </button>
              )
            })
          )}
        </div>

        {/* Footer hint */}
        <div className="border-t border-slate-100 dark:border-slate-800 px-4 py-2 flex items-center gap-4 text-[10px] text-slate-400">
          <span className="flex items-center gap-1">
            <kbd className="bg-slate-100 dark:bg-slate-800 rounded px-1 py-0.5 font-mono">↑↓</kbd>
            naviga
          </span>
          <span className="flex items-center gap-1">
            <kbd className="bg-slate-100 dark:bg-slate-800 rounded px-1 py-0.5 font-mono">↵</kbd>
            apri
          </span>
          <span className="flex items-center gap-1">
            <kbd className="bg-slate-100 dark:bg-slate-800 rounded px-1 py-0.5 font-mono">esc</kbd>
            chiudi
          </span>
        </div>
      </motion.div>
    </div>
  )
}

// ─── Highlight match ────────────────────────────────────────────────────────

function HighlightMatch({ text, query }: { text: string; query: string }) {
  if (!query.trim()) return <>{text}</>

  const q = query.toLowerCase().trim()
  const idx = text.toLowerCase().indexOf(q)
  if (idx === -1) return <>{text}</>

  const before = text.slice(0, idx)
  const match = text.slice(idx, idx + q.length)
  const after = text.slice(idx + q.length)

  return (
    <>
      {before}
      <span className="text-blue-600 dark:text-blue-400 font-semibold">{match}</span>
      {after}
    </>
  )
}
