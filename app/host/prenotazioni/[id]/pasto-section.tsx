'use client'

import { useState, useEffect } from 'react'
import { UtensilsCrossed, Loader2, Check, Coffee, Sun, Moon, AlertTriangle } from 'lucide-react'
import { useTranslations } from 'next-intl'

type PianoPastoData = {
  piano: string
  incluso: boolean
  note: string | null
  sovraprezzoGiornaliero: number | null
  pastiExtra: string[]
  pastiEsclusi: string[]
} | null

type ConfigPasto = {
  tipoPasto: string
  disponibile: boolean
  orarioInizio: string | null
  orarioFine: string | null
  prezzo: number
}

type Riepilogo = {
  piano: string
  pastiInclusi: string[]
  notti: number
  ospiti: number
  copertiColazione: number
  copertiPranzo: number
  copertiCena: number
}

const PIANI = [
  { id: 'SOLO_PERNOTTAMENTO', label: 'Solo pernottamento', desc: 'Nessun pasto incluso', icon: '🛏️' },
  { id: 'PERNOTTAMENTO_COLAZIONE', label: 'B&B', desc: 'Colazione inclusa', icon: '☕' },
  { id: 'MEZZA_PENSIONE', label: 'Mezza pensione', desc: 'Colazione + Cena', icon: '🍽️' },
  { id: 'PENSIONE_COMPLETA', label: 'Pensione completa', desc: 'Colazione + Pranzo + Cena', icon: '🍴' },
  { id: 'ALL_INCLUSIVE', label: 'All Inclusive', desc: 'Tutto incluso', icon: '⭐' },
]

const PASTI_ICONS: Record<string, React.ReactNode> = {
  COLAZIONE: <Coffee className="w-3.5 h-3.5 text-amber-500" />,
  PRANZO: <Sun className="w-3.5 h-3.5 text-orange-500" />,
  CENA: <Moon className="w-3.5 h-3.5 text-indigo-500" />,
}

export default function PastoSection({ prenotazioneId }: { prenotazioneId: string }) {
  const [pianoPasto, setPianoPasto] = useState<PianoPastoData>(null)
  const [riepilogo, setRiepilogo] = useState<Riepilogo | null>(null)
  const [configStruttura, setConfigStruttura] = useState<ConfigPasto[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [pianoSelezionato, setPianoSelezionato] = useState('PERNOTTAMENTO_COLAZIONE')
  const [note, setNote] = useState('')
  const [successo, setSuccesso] = useState(false)

  useEffect(() => {
    fetch(`/api/host/prenotazioni/${prenotazioneId}/pasto`)
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d) {
          setPianoPasto(d.pianoPasto)
          setRiepilogo(d.riepilogo)
          setConfigStruttura(d.configStruttura || [])
          if (d.pianoPasto) {
            setPianoSelezionato(d.pianoPasto.piano)
            setNote(d.pianoPasto.note || '')
          }
        }
      })
      .finally(() => setLoading(false))
  }, [prenotazioneId])

  async function salva() {
    setSaving(true); setSuccesso(false)
    const res = await fetch(`/api/host/prenotazioni/${prenotazioneId}/pasto`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ piano: pianoSelezionato, note: note || null }),
    })
    if (res.ok) {
      const d = await res.json()
      setPianoPasto(d)
      setSuccesso(true)
      setTimeout(() => setSuccesso(false), 2000)
      // Refresh riepilogo
      const r2 = await fetch(`/api/host/prenotazioni/${prenotazioneId}/pasto`)
      if (r2.ok) { const d2 = await r2.json(); setRiepilogo(d2.riepilogo) }
    }
    setSaving(false)
  }

  if (loading) return null

  const pianoInfo = PIANI.find(p => p.id === pianoSelezionato)

  return (
    <div className="card">
      <div className="flex items-center gap-2 mb-3">
        <UtensilsCrossed className="w-4 h-4 text-amber-500" />
        <h2 className="text-base font-semibold text-gray-900 dark:text-slate-100">Pacchetto F&amp;B</h2>
        {pianoPasto && (
          <span className="text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-2 py-0.5 rounded-full font-medium">
            {PIANI.find(p => p.id === pianoPasto.piano)?.label || pianoPasto.piano}
          </span>
        )}
      </div>

      {/* Selezione piano */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-3">
        {PIANI.map(p => (
          <button
            key={p.id}
            onClick={() => setPianoSelezionato(p.id)}
            className={`text-left p-2.5 rounded-lg border-2 transition-all text-xs ${
              pianoSelezionato === p.id
                ? 'border-amber-400 bg-amber-50 dark:bg-amber-900/20'
                : 'border-gray-200 dark:border-slate-600 hover:border-gray-300'
            }`}
          >
            <span className="text-base">{p.icon}</span>
            <p className={`font-semibold mt-1 ${pianoSelezionato === p.id ? 'text-amber-700 dark:text-amber-400' : 'text-gray-700 dark:text-slate-300'}`}>{p.label}</p>
            <p className="text-gray-400 text-[10px]">{p.desc}</p>
          </button>
        ))}
      </div>

      {/* Note dietetiche */}
      <div className="mb-3">
        <label className="text-xs font-medium text-gray-500 dark:text-slate-400 block mb-1">Note dietetiche / allergie</label>
        <input
          type="text"
          value={note}
          onChange={e => setNote(e.target.value)}
          placeholder="Es: celiaco, vegano, intolleranza lattosio..."
          className="input text-xs"
        />
      </div>

      {/* Riepilogo coperti */}
      {riepilogo && (
        <div className="flex items-center gap-4 mb-3 text-xs text-gray-500 dark:text-slate-400">
          {riepilogo.pastiInclusi.map(p => (
            <span key={p} className="flex items-center gap-1">
              {PASTI_ICONS[p]}
              {p === 'COLAZIONE' ? `${riepilogo.copertiColazione} col.` : p === 'PRANZO' ? `${riepilogo.copertiPranzo} pranzi` : `${riepilogo.copertiCena} cene`}
            </span>
          ))}
          {riepilogo.pastiInclusi.length === 0 && <span className="italic">Nessun pasto incluso</span>}
          <span className="ml-auto text-gray-400">{riepilogo.notti}n × {riepilogo.ospiti} ospiti</span>
        </div>
      )}

      {/* Orari dalla struttura */}
      {configStruttura.length > 0 && (
        <div className="flex gap-3 mb-3 text-[10px] text-gray-400 dark:text-slate-500">
          {configStruttura.filter(c => c.disponibile).map(c => (
            <span key={c.tipoPasto}>
              {c.tipoPasto}: {c.orarioInizio || '—'}–{c.orarioFine || '—'} {c.prezzo > 0 && `(€${c.prezzo})`}
            </span>
          ))}
        </div>
      )}

      {/* Bottone salva */}
      <button
        onClick={salva}
        disabled={saving}
        className={`w-full py-2 rounded-lg font-semibold text-sm flex items-center justify-center gap-2 transition-colors ${
          successo ? 'bg-green-500 text-white' : 'btn-primary'
        }`}
      >
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : successo ? <Check className="w-4 h-4" /> : <UtensilsCrossed className="w-4 h-4" />}
        {saving ? 'Salvo...' : successo ? 'Salvato!' : pianoSelezionato !== (pianoPasto?.piano || 'PERNOTTAMENTO_COLAZIONE') ? 'Cambia pacchetto' : 'Salva pacchetto F&B'}
      </button>
    </div>
  )
}
