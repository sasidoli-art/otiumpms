'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Building2, ChevronDown, Check, LayoutGrid } from 'lucide-react'

interface StrutturaInfo {
  id: string
  nome: string
}

interface Props {
  strutture: StrutturaInfo[]
  attivaId: string | null
}

/**
 * Selettore di struttura attiva visualizzato nella topbar host.
 * Mostrato solo se l'host gestisce 2+ strutture.
 */
export function StrutturaSwitcher({ strutture, attivaId }: Props) {
  const [open, setOpen] = useState(false)
  const [switching, setSwitching] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const router = useRouter()

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  if (strutture.length < 2) return null

  const attiva = strutture.find(s => s.id === attivaId) ?? null

  async function cambia(strutturaId: string) {
    if (strutturaId === attivaId) {
      setOpen(false)
      return
    }
    setSwitching(true)
    try {
      await fetch('/api/host/struttura-attiva', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ strutturaId }),
      })
      setOpen(false)
      router.refresh()
    } finally {
      setSwitching(false)
    }
  }

  function tutteLeStrutture() {
    setOpen(false)
    router.push('/host/seleziona-struttura')
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(v => !v)}
        disabled={switching}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-600 transition-colors max-w-[240px]"
      >
        <Building2 className="w-4 h-4 text-indigo-500 shrink-0" />
        <span className="text-sm font-semibold text-slate-700 dark:text-slate-200 truncate">
          {attiva?.nome ?? 'Seleziona struttura'}
        </span>
        <ChevronDown size={13} className="text-slate-400 shrink-0" />
      </button>

      {open && (
        <div className="absolute left-0 top-11 w-72 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-600 py-1 z-50">
          <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-700">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Le tue strutture ({strutture.length})
            </p>
          </div>
          <div className="max-h-72 overflow-y-auto">
            {strutture.map(s => (
              <button
                key={s.id}
                onClick={() => cambia(s.id)}
                className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors text-left"
              >
                <Building2 className="w-4 h-4 text-slate-400 shrink-0" />
                <span className="flex-1 truncate">{s.nome}</span>
                {s.id === attivaId && <Check className="w-4 h-4 text-emerald-500 shrink-0" />}
              </button>
            ))}
          </div>
          <button
            onClick={tutteLeStrutture}
            className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-indigo-600 dark:text-indigo-400 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors border-t border-slate-100 dark:border-slate-700"
          >
            <LayoutGrid className="w-4 h-4" />
            Riepilogo generale
          </button>
        </div>
      )}
    </div>
  )
}
