'use client'

import { createContext, useCallback, useContext, useEffect, useState } from 'react'

/**
 * Theme provider — 3 stati: light | dark | system.
 *
 * - `system` legge `prefers-color-scheme` del browser e ascolta i cambi
 * - localStorage key: `otium-theme` (legacy `theme` letta solo come fallback)
 * - Nessun flash di tema sbagliato: pre-mount renderizza children senza
 *   applicare la classe — la classe sul <html> viene gestita ON MOUNT
 */

export type Theme = 'light' | 'dark' | 'system'

type ThemeContextValue = {
  /** Preferenza utente (light/dark/system) */
  theme: Theme
  /** Tema risolto attualmente applicato (light/dark) — utile per icone */
  resolvedTheme: 'light' | 'dark'
  setTheme: (t: Theme) => void
  /** Toggle ciclico light → dark → system → light (per back-compat) */
  toggle: () => void
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'system',
  resolvedTheme: 'light',
  setTheme: () => {},
  toggle: () => {},
})

export function useTheme() {
  return useContext(ThemeContext)
}

const STORAGE_KEY = 'otium-theme'
const LEGACY_KEY = 'theme'

function readStoredTheme(): Theme {
  if (typeof window === 'undefined') return 'system'
  try {
    const raw = localStorage.getItem(STORAGE_KEY) ?? localStorage.getItem(LEGACY_KEY)
    if (raw === 'light' || raw === 'dark' || raw === 'system') return raw
  } catch { /* localStorage off */ }
  return 'system'
}

function getSystemPrefers(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function applyTheme(t: Theme): 'light' | 'dark' {
  const resolved: 'light' | 'dark' = t === 'system' ? getSystemPrefers() : t
  document.documentElement.classList.toggle('dark', resolved === 'dark')
  return resolved
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('system')
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('light')
  const [mounted, setMounted] = useState(false)

  // Init: read storage, apply, migrate legacy key
  useEffect(() => {
    const stored = readStoredTheme()
    setThemeState(stored)
    setResolvedTheme(applyTheme(stored))
    // One-shot migration: se trovato sotto la chiave legacy, riscrivi su quella nuova
    try {
      if (!localStorage.getItem(STORAGE_KEY) && localStorage.getItem(LEGACY_KEY)) {
        localStorage.setItem(STORAGE_KEY, stored)
        localStorage.removeItem(LEGACY_KEY)
      }
    } catch { /* noop */ }
    setMounted(true)
  }, [])

  // Listener: se theme=system, segui i cambi del sistema in real-time
  useEffect(() => {
    if (theme !== 'system') return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    function onChange() {
      setResolvedTheme(applyTheme('system'))
    }
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [theme])

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t)
    setResolvedTheme(applyTheme(t))
    try { localStorage.setItem(STORAGE_KEY, t) } catch { /* noop */ }
  }, [])

  const toggle = useCallback(() => {
    // Cycle: light → dark → system → light
    const next: Theme = theme === 'light' ? 'dark' : theme === 'dark' ? 'system' : 'light'
    setTheme(next)
  }, [theme, setTheme])

  // Pre-mount: render children senza ancora il context "risolto", evita flash
  if (!mounted) return <>{children}</>

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme, toggle }}>
      {children}
    </ThemeContext.Provider>
  )
}
