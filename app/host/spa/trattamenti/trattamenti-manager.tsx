'use client'

import { useEffect, useState } from 'react'
import { Plus, Edit2, Trash2, Sparkles, Clock, Euro, Globe } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn, formatValuta } from '@/lib/utils'

interface Trattamento {
  id: string
  nome: string
  categoria: string
  durata: number
  prezzo: number
  descrizione: string | null
  colore: string
  attivo: boolean
  prenotabileOnline: boolean
}

const CATEGORIE = ['MASSAGGIO', 'VISO', 'CORPO', 'RITUALI', 'BAGNI', 'COPPIA', 'ALTRO'] as const
const CAT_LABEL: Record<string, string> = {
  MASSAGGIO: 'Massaggio', VISO: 'Viso', CORPO: 'Corpo',
  RITUALI: 'Rituali', BAGNI: 'Bagni & Idro', COPPIA: 'Di Coppia', ALTRO: 'Altro',
}
const CAT_COLOR: Record<string, string> = {
  MASSAGGIO: 'bg-violet-100 text-violet-700',
  VISO: 'bg-pink-100 text-pink-700',
  CORPO: 'bg-teal-100 text-teal-700',
  RITUALI: 'bg-amber-100 text-amber-700',
  BAGNI: 'bg-sky-100 text-sky-700',
  COPPIA: 'bg-rose-100 text-rose-700',
  ALTRO: 'bg-gray-100 text-gray-700',
}
const COLORS = ['#06b6d4', '#8b5cf6', '#ec4899', '#6366f1', '#ef4444', '#f97316', '#eab308', '#22c55e', '#14b8a6', '#3b82f6']

export default function TrattamentiManager() {
  const [trattamenti, setTrattamenti] = useState<Trattamento[]>([])
  const [loading, setLoading] = useState(true)
  const [tabCat, setTabCat] = useState<string>('TUTTI')
  const [modal, setModal] = useState<'create' | Trattamento | null>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ nome: '', categoria: 'MASSAGGIO', durata: '60', prezzo: '', descrizione: '', colore: '#06b6d4', attivo: true, prenotabileOnline: false })

  const load = async () => {
    setLoading(true)
    const res = await fetch('/api/host/spa/trattamenti')
    const data = await res.json()
    setTrattamenti(Array.isArray(data) ? data : [])
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const openCreate = () => {
    setForm({ nome: '', categoria: 'MASSAGGIO', durata: '60', prezzo: '', descrizione: '', colore: '#06b6d4', attivo: true, prenotabileOnline: false })
    setModal('create')
  }
  const openEdit = (t: Trattamento) => {
    setForm({ nome: t.nome, categoria: t.categoria, durata: String(t.durata), prezzo: String(t.prezzo), descrizione: t.descrizione ?? '', colore: t.colore, attivo: t.attivo, prenotabileOnline: t.prenotabileOnline })
    setModal(t)
  }

  const save = async () => {
    setSaving(true)
    const payload = { ...form, durata: Number(form.durata), prezzo: Number(form.prezzo) }
    let res
    if (modal === 'create') {
      res = await fetch('/api/host/spa/trattamenti', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    } else {
      res = await fetch(`/api/host/spa/trattamenti/${(modal as Trattamento).id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    }
    if (res.ok) { setModal(null); load() }
    setSaving(false)
  }

  const remove = async (id: string) => {
    if (!confirm('Eliminare questo trattamento?')) return
    await fetch(`/api/host/spa/trattamenti/${id}`, { method: 'DELETE' })
    load()
  }

  const filtered = tabCat === 'TUTTI' ? trattamenti : trattamenti.filter(t => t.categoria === tabCat)

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-amber-600" />
          </div>
          <h1 className="text-xl font-bold text-gray-900">Catalogo Trattamenti</h1>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
          <Plus className="w-4 h-4" /> Aggiungi
        </button>
      </div>

      {/* Category tabs */}
      <div className="flex gap-2 flex-wrap">
        {['TUTTI', ...CATEGORIE].map(cat => (
          <button key={cat} onClick={() => setTabCat(cat)}
            className={cn('px-3 py-1.5 rounded-full text-xs font-medium border transition-colors',
              tabCat === cat ? 'bg-brand-600 text-white border-brand-600' : 'bg-white text-gray-600 border-gray-200 hover:border-brand-300')}>
            {cat === 'TUTTI' ? 'Tutti' : CAT_LABEL[cat]}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-400">Caricamento...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">Nessun trattamento in questa categoria.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(t => (
            <div key={t.id} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="h-1.5" style={{ backgroundColor: t.colore }} />
              <div className="p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="font-semibold text-gray-900 text-sm leading-snug">{t.nome}</div>
                  <div className="flex items-center gap-1 shrink-0">
                    {t.prenotabileOnline && (
                      <span className="flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full bg-indigo-100 text-indigo-700 font-medium">
                        <Globe className="w-2.5 h-2.5" /> Online
                      </span>
                    )}
                    <Badge className={CAT_COLOR[t.categoria]}>{CAT_LABEL[t.categoria]}</Badge>
                  </div>
                </div>
                {t.descrizione && <div className="text-xs text-gray-400 line-clamp-2">{t.descrizione}</div>}
                <div className="flex items-center gap-4 text-sm">
                  <span className="flex items-center gap-1 text-gray-600"><Clock className="w-3.5 h-3.5" />{t.durata} min</span>
                  <span className="flex items-center gap-1 font-semibold text-gray-900"><Euro className="w-3.5 h-3.5" />{formatValuta(t.prezzo)}</span>
                </div>
                <div className="flex gap-2 pt-1">
                  <button onClick={() => openEdit(t)} className="flex-1 flex items-center justify-center gap-1 text-xs text-gray-600 border border-gray-200 rounded-lg py-1.5 hover:bg-gray-50">
                    <Edit2 className="w-3 h-3" /> Modifica
                  </button>
                  <button onClick={() => remove(t.id)} className="flex-1 flex items-center justify-center gap-1 text-xs text-red-600 border border-red-100 rounded-lg py-1.5 hover:bg-red-50">
                    <Trash2 className="w-3 h-3" /> Elimina
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {modal !== null && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold text-gray-900">{modal === 'create' ? 'Nuovo trattamento' : 'Modifica trattamento'}</h2>
            <Field label="Nome *" value={form.nome} onChange={v => setForm(f => ({ ...f, nome: v }))} />
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Categoria</label>
              <select value={form.categoria} onChange={e => setForm(f => ({ ...f, categoria: e.target.value }))}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500">
                {CATEGORIE.map(c => <option key={c} value={c}>{CAT_LABEL[c]}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Durata (min) *" value={form.durata} onChange={v => setForm(f => ({ ...f, durata: v }))} type="number" />
              <Field label="Prezzo (€) *" value={form.prezzo} onChange={v => setForm(f => ({ ...f, prezzo: v }))} type="number" />
            </div>
            <Field label="Descrizione" value={form.descrizione} onChange={v => setForm(f => ({ ...f, descrizione: v }))} />
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Colore</label>
              <div className="flex flex-wrap gap-2">
                {COLORS.map(c => (
                  <button key={c} onClick={() => setForm(f => ({ ...f, colore: c }))}
                    className={cn('w-7 h-7 rounded-full border-2', form.colore === c ? 'border-gray-800 scale-110' : 'border-transparent')}
                    style={{ backgroundColor: c }} />
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="attivo_t" checked={form.attivo} onChange={e => setForm(f => ({ ...f, attivo: e.target.checked }))} className="rounded" />
              <label htmlFor="attivo_t" className="text-sm text-gray-700">Trattamento attivo</label>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="online_t" checked={form.prenotabileOnline} onChange={e => setForm(f => ({ ...f, prenotabileOnline: e.target.checked }))} className="rounded" />
              <label htmlFor="online_t" className="text-sm text-gray-700 flex items-center gap-1">
                <Globe className="w-3.5 h-3.5 text-indigo-500" /> Prenotabile online (booking engine)
              </label>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setModal(null)} className="flex-1 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50">Annulla</button>
              <button onClick={save} disabled={saving || !form.nome || !form.durata || !form.prezzo}
                className="flex-1 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium disabled:opacity-50">
                {saving ? 'Salvataggio...' : 'Salva'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Field({ label, value, onChange, type = 'text' }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <div>
      <label className="text-xs font-medium text-gray-500 mb-1 block">{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)}
        className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500" />
    </div>
  )
}
