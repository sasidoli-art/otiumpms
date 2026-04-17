'use client'

import { useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Minus, X } from 'lucide-react'
import { cn } from '@/lib/utils'

// ─── Types ──────────────────────────────────────────────────────────────────

export interface UnitaRow {
  key: string // unique key for React
  nome: string
  capacita: number
  prezzo: string // string to allow free typing, parsed as float on submit
}

interface Props {
  unita: UnitaRow[]
  onChange: (unita: UnitaRow[]) => void
  tipoStruttura: string
  errors?: Record<string, string>
}

// ─── Helpers ────────────────────────────────────────────────────────────────

let nextKey = 1
function makeKey(): string {
  return `u-${Date.now()}-${nextKey++}`
}

export function emptyUnita(): UnitaRow {
  return { key: makeKey(), nome: '', capacita: 2, prezzo: '' }
}

// ─── Component ──────────────────────────────────────────────────────────────

const MAX_UNITA = 50

export function StepUnita({ unita, onChange, tipoStruttura, errors }: Props) {
  const isAlloggio = tipoStruttura === 'ALLOGGIO'
  const label = isAlloggio ? 'camere' : 'spazi'
  const singular = isAlloggio ? 'camera' : 'spazio'
  const placeholder = isAlloggio ? 'Camera Doppia' : 'Posto VIP'

  const update = useCallback((key: string, field: keyof UnitaRow, value: string | number) => {
    onChange(unita.map(u => u.key === key ? { ...u, [field]: value } : u))
  }, [unita, onChange])

  const remove = useCallback((key: string) => {
    if (unita.length <= 1) return
    onChange(unita.filter(u => u.key !== key))
  }, [unita, onChange])

  const add = useCallback(() => {
    if (unita.length >= MAX_UNITA) return
    onChange([...unita, emptyUnita()])
  }, [unita, onChange])

  const inp = 'border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-colors'

  return (
    <div className="space-y-5">
      {/* Titolo */}
      <div>
        <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
          {isAlloggio ? 'Aggiungi le tue camere' : 'Aggiungi i tuoi spazi'}
        </h2>
        <p className="text-sm text-slate-500 mt-1">
          {isAlloggio
            ? 'Inserisci le camere che vuoi rendere prenotabili. Potrai modificarle in seguito.'
            : 'Inserisci gli spazi o slot disponibili per la prenotazione.'}
        </p>
      </div>

      {errors?.unita && (
        <p className="text-[11px] text-red-500 bg-red-50 dark:bg-red-950/20 px-3 py-2 rounded-lg">
          {errors.unita}
        </p>
      )}

      {/* Lista unità */}
      <div className="space-y-2">
        <AnimatePresence initial={false}>
          {unita.map((u, i) => (
            <motion.div
              key={u.key}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
            >
              <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50">
                {/* Row number */}
                <span className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-[10px] font-bold text-slate-500 shrink-0">
                  {i + 1}
                </span>

                {/* Nome */}
                <input
                  type="text"
                  value={u.nome}
                  onChange={e => update(u.key, 'nome', e.target.value)}
                  placeholder={placeholder}
                  className={cn(inp, 'flex-1 min-w-0')}
                  autoFocus={i === unita.length - 1 && i > 0}
                />

                {/* Capacità stepper */}
                <div className="flex items-center gap-0.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => update(u.key, 'capacita', Math.max(1, u.capacita - 1))}
                    className="w-7 h-7 rounded-lg bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-500 hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
                  >
                    <Minus size={12} />
                  </button>
                  <span className="w-7 text-center text-sm font-semibold text-slate-700 dark:text-slate-300 tabular-nums">
                    {u.capacita}
                  </span>
                  <button
                    type="button"
                    onClick={() => update(u.key, 'capacita', Math.min(20, u.capacita + 1))}
                    className="w-7 h-7 rounded-lg bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-500 hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
                  >
                    <Plus size={12} />
                  </button>
                  <span className="text-[10px] text-slate-400 ml-0.5 hidden sm:inline">ospiti</span>
                </div>

                {/* Prezzo */}
                <div className="relative shrink-0 w-20">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400">€</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={u.prezzo}
                    onChange={e => {
                      const v = e.target.value.replace(/[^0-9.,]/g, '')
                      update(u.key, 'prezzo', v)
                    }}
                    placeholder="80"
                    className={cn(inp, 'w-full pl-7 text-right')}
                  />
                </div>

                {/* Delete */}
                <button
                  type="button"
                  onClick={() => remove(u.key)}
                  disabled={unita.length <= 1}
                  className={cn(
                    'w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors',
                    unita.length <= 1
                      ? 'text-slate-200 dark:text-slate-700 cursor-not-allowed'
                      : 'text-slate-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-950/30',
                  )}
                >
                  <X size={14} />
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Add button */}
      {unita.length < MAX_UNITA && (
        <div>
          <button
            type="button"
            onClick={add}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-600 text-sm font-medium text-slate-500 hover:border-blue-400 hover:text-blue-600 dark:hover:border-blue-500 dark:hover:text-blue-400 transition-colors w-full justify-center"
          >
            <Plus size={16} />
            Aggiungi {singular}
          </button>
          {unita.length === 1 && unita[0].nome.length > 0 && (
            <p className="text-[11px] text-slate-400 text-center mt-2">
              Hai altre {label}? Aggiungile ora, potrai modificarle dopo.
            </p>
          )}
        </div>
      )}

      {unita.length >= MAX_UNITA && (
        <p className="text-[11px] text-slate-400 text-center">
          Limite di {MAX_UNITA} {label} raggiunto. Contattaci per un piano superiore.
        </p>
      )}
    </div>
  )
}
