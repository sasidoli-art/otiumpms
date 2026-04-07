'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { signOut } from 'next-auth/react'
import { LogOut, ChevronDown, User, Settings, Search, BookOpen, Users, Building2, Moon, Sun, Menu } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { NotificheBell } from '@/components/layout/notifiche-bell'
import { LanguageSwitcher } from '@/components/layout/language-switcher'
import { StrutturaSwitcher } from '@/components/layout/struttura-switcher'
import { useTheme } from '@/components/theme-provider'

interface TopbarProps {
  nomeUtente: string
  ruolo: string
  settingsHref: string
  onMenuClick?: () => void
  strutture?: { id: string; nome: string }[]
  strutturaAttivaId?: string | null
}

type SearchResult = {
  type: 'prenotazione' | 'ospite' | 'struttura'
  id: string
  label: string
  sub: string
  href: string
}

const TYPE_ICON: Record<string, React.ReactNode> = {
  prenotazione: <BookOpen className="w-4 h-4 text-indigo-500" />,
  ospite: <Users className="w-4 h-4 text-green-500" />,
  struttura: <Building2 className="w-4 h-4 text-amber-500" />,
}

export function Topbar({ nomeUtente, ruolo, settingsHref, onMenuClick, strutture, strutturaAttivaId }: TopbarProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const router = useRouter()

  // Search state
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [searchOpen, setSearchOpen] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>()

  const doSearch = useCallback(async (q: string) => {
    if (q.length < 2) { setResults([]); setSearchOpen(false); return }
    const res = await fetch(`/api/host/search?q=${encodeURIComponent(q)}`)
    if (res.ok) {
      const data = await res.json()
      setResults(data.results)
      setSearchOpen(data.results.length > 0)
    }
  }, [])

  function onSearchChange(val: string) {
    setQuery(val)
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => doSearch(val), 300)
  }

  function pickResult(href: string) {
    setQuery('')
    setResults([])
    setSearchOpen(false)
    router.push(href)
  }

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setSearchOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const initials = nomeUtente
    .split(' ')
    .map(w => w[0]?.toUpperCase() ?? '')
    .slice(0, 2)
    .join('')

  return (
    <div className="bg-white dark:bg-slate-900 h-14 flex items-center justify-between px-5 border-b border-slate-200 dark:border-slate-700 shadow-topbar shrink-0 sticky top-0 z-30">
      {/* Left — hamburger + search */}
      <div className="flex items-center gap-3 flex-1 max-w-md">
        {/* Hamburger menu — mobile only */}
        {onMenuClick && (
          <button
            onClick={onMenuClick}
            className="lg:hidden p-2 -ml-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 transition-colors"
            aria-label="Menu"
          >
            <Menu size={20} />
          </button>
        )}
        {strutture && strutture.length >= 2 && (
          <StrutturaSwitcher strutture={strutture} attivaId={strutturaAttivaId ?? null} />
        )}
        {ruolo === 'HOST' && (
          <div className="relative flex-1" ref={searchRef}>
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <input
              type="text"
              value={query}
              onChange={e => onSearchChange(e.target.value)}
              onFocus={() => results.length > 0 && setSearchOpen(true)}
              placeholder="Cerca prenotazioni, ospiti, strutture..."
              className="w-full pl-9 pr-3 py-1.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300 transition-colors dark:text-slate-200 dark:placeholder-slate-500"
            />
            {searchOpen && results.length > 0 && (
              <div className="absolute top-full mt-1 left-0 right-0 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-gray-200 dark:border-slate-600 overflow-hidden z-50 max-h-80 overflow-y-auto">
                {results.map(r => (
                  <button
                    key={`${r.type}-${r.id}`}
                    onClick={() => pickResult(r.href)}
                    className="w-full text-left px-4 py-2.5 flex items-center gap-3 hover:bg-gray-50 transition-colors"
                  >
                    <div className="p-1.5 rounded-lg bg-gray-50 shrink-0">
                      {TYPE_ICON[r.type]}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900 truncate">{r.label}</p>
                      <p className="text-xs text-gray-400 truncate">{r.sub}</p>
                    </div>
                    <span className="text-[10px] text-gray-300 uppercase shrink-0">{r.type}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
        {ruolo === 'ADMIN' && (
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest hidden sm:block">
            Amministrazione
          </span>
        )}
      </div>

      {/* Right */}
      <div className="flex items-center gap-3" ref={ref}>
        {/* Dark mode toggle */}
        <ThemeToggle />

        {/* Language switcher */}
        <LanguageSwitcher className="hidden sm:block" />

        {ruolo === 'HOST' && <NotificheBell />}

        {/* User Dropdown */}
        <div className="relative">
          <button
            onClick={() => setOpen(v => !v)}
            className="flex items-center gap-2.5 py-1.5 px-2.5 rounded-lg hover:bg-slate-50 transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold select-none">
              {initials || <User size={14} />}
            </div>
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-200 hidden sm:block max-w-[120px] truncate">
              {nomeUtente}
            </span>
            <ChevronDown size={13} className="text-slate-400" />
          </button>

          {open && (
            <div className="absolute right-0 top-12 w-52 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-600 py-1 z-50">
              <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700">
                <p className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">{nomeUtente}</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {ruolo === 'ADMIN' ? 'Amministratore' : 'Host'}
                </p>
              </div>
              <Link
                href={settingsHref}
                onClick={() => setOpen(false)}
                className="flex items-center gap-2 px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50 transition-colors"
              >
                <Settings size={14} />
                Impostazioni
              </Link>
              <button
                onClick={() => signOut({ callbackUrl: '/login' })}
                className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50 transition-colors border-t border-slate-100 mt-1"
              >
                <LogOut size={14} />
                Esci
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function ThemeToggle() {
  const { theme, toggle } = useTheme()
  return (
    <button
      onClick={toggle}
      className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 transition-colors"
      title={theme === 'dark' ? 'Modalità chiara' : 'Modalità scura'}
    >
      {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
    </button>
  )
}
