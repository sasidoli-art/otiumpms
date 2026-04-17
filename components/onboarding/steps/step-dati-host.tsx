'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { cn } from '@/lib/utils'

// ─── Types ──────────────────────────────────────────────────────────────────

export interface DatiHostData {
  nomeAzienda: string
  partitaIva: string
  telefono: string
  email: string
  // Fatturazione (opzionale)
  fattDiversa: boolean
  fattNomeAzienda: string
  fattPartitaIva: string
  fattIndirizzo: string
  fattCitta: string
  fattCap: string
  fattProvincia: string
}

interface Props {
  data: DatiHostData
  onChange: (data: DatiHostData) => void
  errors?: Record<string, string>
}

// ─── Component ──────────────────────────────────────────────────────────────

export function StepDatiHost({ data, onChange, errors }: Props) {
  const [fattOpen, setFattOpen] = useState(data.fattDiversa)

  function set<K extends keyof DatiHostData>(key: K, value: DatiHostData[K]) {
    onChange({ ...data, [key]: value })
  }

  function toggleFatt() {
    const next = !fattOpen
    setFattOpen(next)
    set('fattDiversa', next)
  }

  const inp = 'w-full border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-colors'
  const label = 'block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5'
  const err = 'text-[11px] text-red-500 mt-1'

  return (
    <div className="space-y-6">
      {/* Titolo */}
      <div>
        <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">I tuoi dati</h2>
        <p className="text-sm text-slate-500 mt-1">
          Informazioni di contatto e azienda. Solo l&apos;essenziale per iniziare.
        </p>
      </div>

      {/* Nome azienda */}
      <div>
        <label className={label}>Nome azienda *</label>
        <input
          type="text"
          value={data.nomeAzienda}
          onChange={e => set('nomeAzienda', e.target.value)}
          placeholder="La mia azienda S.r.l."
          className={cn(inp, errors?.nomeAzienda && 'border-red-400')}
        />
        {errors?.nomeAzienda && <p className={err}>{errors.nomeAzienda}</p>}
      </div>

      {/* Partita IVA */}
      <div>
        <label className={label}>
          Partita IVA
          <span className="text-slate-400 font-normal ml-1">(opzionale)</span>
        </label>
        <input
          type="text"
          value={data.partitaIva}
          onChange={e => set('partitaIva', e.target.value.replace(/[^0-9A-Za-z]/g, '').slice(0, 16))}
          placeholder="IT12345678901"
          className={inp}
          maxLength={16}
        />
        <p className="text-[10px] text-slate-400 mt-1">Necessaria per la fatturazione elettronica</p>
      </div>

      {/* Telefono + Email */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={label}>Telefono struttura</label>
          <input
            type="tel"
            value={data.telefono}
            onChange={e => set('telefono', e.target.value)}
            placeholder="+39 0123 456789"
            className={inp}
          />
        </div>
        <div>
          <label className={label}>Email di contatto *</label>
          <input
            type="email"
            value={data.email}
            onChange={e => set('email', e.target.value)}
            placeholder="info@miastruttura.it"
            className={cn(inp, errors?.email && 'border-red-400')}
          />
          {errors?.email && <p className={err}>{errors.email}</p>}
        </div>
      </div>

      {/* ═══ Dati fatturazione toggle ═══ */}
      <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
        <button
          type="button"
          onClick={toggleFatt}
          className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className={cn(
              'w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors',
              fattOpen ? 'bg-blue-600 border-blue-600' : 'border-slate-300 dark:border-slate-600',
            )}>
              {fattOpen && (
                <svg viewBox="0 0 12 12" className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M2 6l3 3 5-5" />
                </svg>
              )}
            </div>
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Dati fatturazione diversi dall&apos;azienda
            </span>
          </div>
          {fattOpen ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
        </button>

        {fattOpen && (
          <div className="px-4 pb-4 pt-2 space-y-3 border-t border-slate-100 dark:border-slate-800">
            <div>
              <label className={label}>Ragione sociale</label>
              <input
                type="text"
                value={data.fattNomeAzienda}
                onChange={e => set('fattNomeAzienda', e.target.value)}
                placeholder="Ragione sociale fattura"
                className={inp}
              />
            </div>
            <div>
              <label className={label}>P.IVA fatturazione</label>
              <input
                type="text"
                value={data.fattPartitaIva}
                onChange={e => set('fattPartitaIva', e.target.value.replace(/[^0-9A-Za-z]/g, '').slice(0, 16))}
                placeholder="IT12345678901"
                className={inp}
                maxLength={16}
              />
            </div>
            <div>
              <label className={label}>Indirizzo</label>
              <input
                type="text"
                value={data.fattIndirizzo}
                onChange={e => set('fattIndirizzo', e.target.value)}
                placeholder="Via della Fatturazione 1"
                className={inp}
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className={label}>Città</label>
                <input
                  type="text"
                  value={data.fattCitta}
                  onChange={e => set('fattCitta', e.target.value)}
                  placeholder="Roma"
                  className={inp}
                />
              </div>
              <div>
                <label className={label}>CAP</label>
                <input
                  type="text"
                  value={data.fattCap}
                  onChange={e => set('fattCap', e.target.value.replace(/\D/g, '').slice(0, 5))}
                  placeholder="00100"
                  className={inp}
                  maxLength={5}
                />
              </div>
              <div>
                <label className={label}>Provincia</label>
                <input
                  type="text"
                  value={data.fattProvincia}
                  onChange={e => set('fattProvincia', e.target.value.toUpperCase().slice(0, 2))}
                  placeholder="RM"
                  className={inp}
                  maxLength={2}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
