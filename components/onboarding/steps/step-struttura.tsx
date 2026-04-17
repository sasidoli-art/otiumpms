'use client'

import { Building2, MapPin, Compass, CalendarDays, Check } from 'lucide-react'
import { cn } from '@/lib/utils'

// ─── Types ──────────────────────────────────────────────────────────────────

export interface StrutturaData {
  nome: string
  tipo: 'ALLOGGIO' | 'VENUE' | 'ESPERIENZA' | 'EVENTO'
  indirizzo: string
  citta: string
  regione: string
}

interface Props {
  data: StrutturaData
  onChange: (data: StrutturaData) => void
  errors?: Record<string, string>
}

// ─── Type cards ─────────────────────────────────────────────────────────────

const TIPI = [
  {
    value: 'ALLOGGIO' as const,
    label: 'Hotel / B&B',
    desc: 'Camere, appartamenti, agriturismi',
    icon: Building2,
    color: 'border-blue-400 bg-blue-50 dark:bg-blue-950/30',
    iconColor: 'text-blue-600',
  },
  {
    value: 'VENUE' as const,
    label: 'Venue / Location',
    desc: 'Sale ricevimenti, spazi per eventi',
    icon: MapPin,
    color: 'border-amber-400 bg-amber-50 dark:bg-amber-950/30',
    iconColor: 'text-amber-600',
  },
  {
    value: 'ESPERIENZA' as const,
    label: 'Esperienza',
    desc: 'Tour, degustazioni, attività',
    icon: Compass,
    color: 'border-emerald-400 bg-emerald-50 dark:bg-emerald-950/30',
    iconColor: 'text-emerald-600',
  },
  {
    value: 'EVENTO' as const,
    label: 'Evento',
    desc: 'Festival, concerti, mostre',
    icon: CalendarDays,
    color: 'border-violet-400 bg-violet-50 dark:bg-violet-950/30',
    iconColor: 'text-violet-600',
  },
] as const

// ─── Component ──────────────────────────────────────────────────────────────

export function StepStruttura({ data, onChange, errors }: Props) {
  function set<K extends keyof StrutturaData>(key: K, value: StrutturaData[K]) {
    onChange({ ...data, [key]: value })
  }

  const inp = 'w-full border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-colors'
  const label = 'block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5'
  const err = 'text-[11px] text-red-500 mt-1'

  return (
    <div className="space-y-6">
      {/* Titolo */}
      <div>
        <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">La tua struttura</h2>
        <p className="text-sm text-slate-500 mt-1">Come si chiama e che tipo di attività gestisci?</p>
      </div>

      {/* Nome */}
      <div>
        <label className={label}>Nome struttura *</label>
        <input
          type="text"
          value={data.nome}
          onChange={e => set('nome', e.target.value)}
          placeholder='es. "Villa Margherita", "B&B Il Girasole"'
          className={cn(inp, errors?.nome && 'border-red-400')}
          autoFocus
        />
        {errors?.nome && <p className={err}>{errors.nome}</p>}
      </div>

      {/* Tipo */}
      <div>
        <label className={label}>Tipo di struttura *</label>
        <div className="grid grid-cols-2 gap-3">
          {TIPI.map(tipo => {
            const Icon = tipo.icon
            const selected = data.tipo === tipo.value
            return (
              <button
                key={tipo.value}
                type="button"
                onClick={() => set('tipo', tipo.value)}
                className={cn(
                  'relative flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all duration-200 text-center',
                  selected
                    ? cn(tipo.color, 'shadow-sm scale-[1.02]')
                    : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600',
                )}
              >
                {selected && (
                  <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center">
                    <Check size={12} className="text-white" />
                  </div>
                )}
                <Icon size={28} className={selected ? tipo.iconColor : 'text-slate-400'} />
                <div>
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{tipo.label}</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">{tipo.desc}</p>
                </div>
              </button>
            )
          })}
        </div>
        {errors?.tipo && <p className={err}>{errors.tipo}</p>}
      </div>

      {/* Indirizzo */}
      <div>
        <label className={label}>Indirizzo</label>
        <input
          type="text"
          value={data.indirizzo}
          onChange={e => set('indirizzo', e.target.value)}
          placeholder="Via Roma 1"
          className={inp}
        />
      </div>

      {/* Città + Regione */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={label}>Città</label>
          <input
            type="text"
            value={data.citta}
            onChange={e => set('citta', e.target.value)}
            placeholder="Roma"
            className={inp}
          />
        </div>
        <div>
          <label className={label}>Regione</label>
          <input
            type="text"
            value={data.regione}
            onChange={e => set('regione', e.target.value)}
            placeholder="Lazio"
            className={inp}
          />
        </div>
      </div>
    </div>
  )
}
