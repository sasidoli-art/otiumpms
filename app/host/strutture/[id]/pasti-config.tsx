'use client'

import { useState, useEffect } from 'react'
import { Coffee, Sun, Moon, Loader2, Check } from 'lucide-react'

type ConfigPasto = { id: string; tipoPasto: string; disponibile: boolean; orarioInizio: string | null; orarioFine: string | null; prezzo: number; prezzoRidotto: number | null; luogo: string | null; note: string | null }

const PASTI = [
  { tipo: 'COLAZIONE', label: 'Colazione', icon: Coffee, color: 'text-amber-500' },
  { tipo: 'PRANZO', label: 'Pranzo', icon: Sun, color: 'text-orange-500' },
  { tipo: 'CENA', label: 'Cena', icon: Moon, color: 'text-indigo-500' },
]

const inp = 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm dark:bg-slate-800 dark:border-slate-600 dark:text-slate-200'

export default function PastiConfig({ strutturaId }: { strutturaId: string }) {
  const [config, setConfig] = useState<ConfigPasto[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [successo, setSuccesso] = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/host/strutture/${strutturaId}/pasti`)
      .then(r => r.ok ? r.json() : [])
      .then(d => setConfig(Array.isArray(d) ? d : []))
      .finally(() => setLoading(false))
  }, [strutturaId])

  function getConf(tipo: string): Partial<ConfigPasto> {
    return config.find(c => c.tipoPasto === tipo) || { tipoPasto: tipo, disponibile: false, orarioInizio: '', orarioFine: '', prezzo: 0, luogo: '', note: '' }
  }

  async function salva(tipo: string, data: Record<string, unknown>) {
    setSaving(tipo); setSuccesso(null)
    const res = await fetch(`/api/host/strutture/${strutturaId}/pasti`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tipoPasto: tipo, ...data }),
    })
    if (res.ok) {
      const updated = await res.json()
      setConfig(prev => {
        const idx = prev.findIndex(c => c.tipoPasto === tipo)
        if (idx >= 0) { prev[idx] = updated; return [...prev] }
        return [...prev, updated]
      })
      setSuccesso(tipo)
      setTimeout(() => setSuccesso(null), 1500)
    }
    setSaving(null)
  }

  if (loading) return null

  return (
    <div className="card">
      <h2 className="text-base font-semibold mb-4">Configurazione pasti</h2>
      <div className="space-y-4">
        {PASTI.map(p => {
          const conf = getConf(p.tipo)
          const Icon = p.icon
          return (
            <PastoRow key={p.tipo} tipo={p.tipo} label={p.label} Icon={Icon} color={p.color}
              conf={conf} saving={saving === p.tipo} successo={successo === p.tipo}
              onSave={(data) => salva(p.tipo, data)} />
          )
        })}
      </div>
    </div>
  )
}

function PastoRow({ tipo, label, Icon, color, conf, saving, successo, onSave }: {
  tipo: string; label: string; Icon: any; color: string; conf: Partial<ConfigPasto>
  saving: boolean; successo: boolean; onSave: (data: Record<string, unknown>) => void
}) {
  const [disponibile, setDisponibile] = useState(conf.disponibile ?? false)
  const [orarioInizio, setOrarioInizio] = useState(conf.orarioInizio || '')
  const [orarioFine, setOrarioFine] = useState(conf.orarioFine || '')
  const [prezzo, setPrezzo] = useState(String(conf.prezzo || ''))
  const [luogo, setLuogo] = useState(conf.luogo || '')

  const inp2 = 'px-2 py-1.5 border border-gray-200 rounded text-xs dark:bg-slate-800 dark:border-slate-600 dark:text-slate-200'

  return (
    <div className={`p-3 rounded-lg border ${disponibile ? 'border-gray-200 dark:border-slate-600' : 'border-dashed border-gray-200 dark:border-slate-700 opacity-60'}`}>
      <div className="flex items-center gap-3 mb-2">
        <label className="flex items-center gap-2 cursor-pointer flex-1">
          <input type="checkbox" checked={disponibile} onChange={e => setDisponibile(e.target.checked)} className="accent-brand-500 w-4 h-4" />
          <Icon className={`w-4 h-4 ${color}`} />
          <span className="text-sm font-semibold">{label}</span>
        </label>
        <button onClick={() => onSave({ disponibile, orarioInizio: orarioInizio || null, orarioFine: orarioFine || null, prezzo: parseFloat(prezzo) || 0, luogo: luogo || null })}
          disabled={saving}
          className={`text-xs px-2.5 py-1 rounded flex items-center gap-1 ${successo ? 'bg-green-100 text-green-700' : 'bg-brand-50 text-brand-700 hover:bg-brand-100'}`}>
          {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : successo ? <Check className="w-3 h-3" /> : null}
          {successo ? 'Salvato' : 'Salva'}
        </button>
      </div>
      {disponibile && (
        <div className="grid grid-cols-4 gap-2">
          <input type="time" value={orarioInizio} onChange={e => setOrarioInizio(e.target.value)} className={inp2} placeholder="Dalle" />
          <input type="time" value={orarioFine} onChange={e => setOrarioFine(e.target.value)} className={inp2} placeholder="Alle" />
          <input type="number" step="0.01" value={prezzo} onChange={e => setPrezzo(e.target.value)} className={inp2} placeholder="€ prezzo" />
          <input type="text" value={luogo} onChange={e => setLuogo(e.target.value)} className={inp2} placeholder="Luogo" />
        </div>
      )}
    </div>
  )
}
