'use client'

import { useState, useEffect } from 'react'
import { Plus, Trash2, Loader2, Settings, X } from 'lucide-react'

type Dotazione = { id: string; articolo: string; quantitaPerOspite: number; quantitaFissa: number; categoria: string; unita: { nome: string } | null }

const CATEGORIE = ['BIANCHERIA', 'BAGNO', 'ACCESSORI']
const inp = 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm dark:bg-slate-800 dark:border-slate-600 dark:text-slate-200'

export default function ConfigDotazione() {
  const [dotazioni, setDotazioni] = useState<Dotazione[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ articolo: '', quantitaPerOspite: '1', quantitaFissa: '0', categoria: 'BIANCHERIA' })

  useEffect(() => {
    fetch('/api/host/biancheria/dotazione')
      .then(r => r.ok ? r.json() : [])
      .then(d => setDotazioni(Array.isArray(d) ? d : []))
      .finally(() => setLoading(false))
  }, [])

  async function add(e: React.FormEvent) {
    e.preventDefault()
    if (!form.articolo.trim()) return
    setSaving(true)
    const res = await fetch('/api/host/biancheria/dotazione', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, quantitaPerOspite: parseInt(form.quantitaPerOspite) || 1, quantitaFissa: parseInt(form.quantitaFissa) || 0 }),
    })
    if (res.ok) {
      const d = await res.json()
      setDotazioni(prev => [...prev, d])
      setForm({ articolo: '', quantitaPerOspite: '1', quantitaFissa: '0', categoria: 'BIANCHERIA' })
      setShowForm(false)
    }
    setSaving(false)
  }

  if (loading) return null

  return (
    <div className="card mt-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold flex items-center gap-2"><Settings className="w-4 h-4 text-gray-500" /> Dotazione standard per camera</h3>
        {!showForm && <button onClick={() => setShowForm(true)} className="text-xs text-brand-600 flex items-center gap-1"><Plus className="w-3.5 h-3.5" /> Aggiungi</button>}
      </div>

      {dotazioni.length === 0 && !showForm && (
        <p className="text-xs text-gray-400 italic">Nessuna dotazione configurata. Verrà usata quella di default.</p>
      )}

      {dotazioni.map(d => (
        <div key={d.id} className="flex items-center gap-2 py-1.5 border-b border-gray-50 dark:border-slate-800 text-xs">
          <span className="text-[10px] bg-gray-100 dark:bg-slate-700 px-1.5 py-0.5 rounded">{d.categoria}</span>
          <span className="flex-1 font-medium">{d.articolo}</span>
          <span className="text-gray-400">{d.quantitaPerOspite}/ospite + {d.quantitaFissa} fissi</span>
        </div>
      ))}

      {showForm && (
        <form onSubmit={add} className="mt-3 p-3 bg-gray-50 dark:bg-slate-800 rounded-lg space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <input type="text" value={form.articolo} onChange={e => setForm(f => ({ ...f, articolo: e.target.value }))} placeholder="Articolo..." className={inp} required />
            <select value={form.categoria} onChange={e => setForm(f => ({ ...f, categoria: e.target.value }))} className={inp}>
              {CATEGORIE.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input type="number" value={form.quantitaPerOspite} onChange={e => setForm(f => ({ ...f, quantitaPerOspite: e.target.value }))} className={inp} min={0} />
            <input type="number" value={form.quantitaFissa} onChange={e => setForm(f => ({ ...f, quantitaFissa: e.target.value }))} className={inp} min={0} />
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={saving} className="btn-primary text-xs">{saving ? 'Salvo...' : 'Aggiungi'}</button>
            <button type="button" onClick={() => setShowForm(false)} className="btn-secondary text-xs">Annulla</button>
          </div>
        </form>
      )}
    </div>
  )
}
