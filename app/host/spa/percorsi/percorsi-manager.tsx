'use client'

import { useEffect, useState } from 'react'
import { Plus, Edit2, Trash2, Star, Clock, Euro, ChevronDown, ChevronUp, GripVertical, X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { useTranslations } from 'next-intl'
import { cn, formatValuta } from '@/lib/utils'

interface Trattamento {
  id: string
  nome: string
  durata: number
  categoria: string
  colore: string
}

interface Passaggio {
  trattamentoId: string
  ordine: number
  durata: number
  note: string
}

interface Percorso {
  id: string
  nome: string
  descrizione: string | null
  prezzo: number
  durataMinuti: number
  attivo: boolean
  colore: string
  passaggi: Array<{
    id: string
    ordine: number
    durata: number
    note: string | null
    trattamento: { id: string; nome: string; durata: number; colore: string }
  }>
}

const COLORS = ['#f59e0b', '#8b5cf6', '#ec4899', '#6366f1', '#ef4444', '#f97316', '#22c55e', '#14b8a6', '#06b6d4', '#3b82f6']

export default function PercorsiManager() {
  const t = useTranslations('spa.paths')
  const tc = useTranslations('common')
  const [percorsi, setPercorsi] = useState<Percorso[]>([])
  const [trattamenti, setTrattamenti] = useState<Trattamento[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [modal, setModal] = useState<'create' | Percorso | null>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ nome: '', descrizione: '', prezzo: '', colore: '#f59e0b', attivo: true })
  const [passaggi, setPassaggi] = useState<Passaggio[]>([])

  const load = async () => {
    setLoading(true)
    const [rpRes, trRes] = await Promise.all([
      fetch('/api/host/spa/percorsi'),
      fetch('/api/host/spa/trattamenti'),
    ])
    const rpData = await rpRes.json()
    const trData = await trRes.json()
    setPercorsi(Array.isArray(rpData) ? rpData : [])
    setTrattamenti(Array.isArray(trData) ? trData : [])
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const openCreate = () => {
    setForm({ nome: '', descrizione: '', prezzo: '', colore: '#f59e0b', attivo: true })
    setPassaggi([])
    setModal('create')
  }
  const openEdit = (p: Percorso) => {
    setForm({ nome: p.nome, descrizione: p.descrizione ?? '', prezzo: String(p.prezzo), colore: p.colore, attivo: p.attivo })
    setPassaggi(p.passaggi.map(pp => ({ trattamentoId: pp.trattamento.id, ordine: pp.ordine, durata: pp.durata, note: pp.note ?? '' })))
    setModal(p)
  }

  const addPassaggio = () => {
    if (trattamenti.length === 0) return
    const t = trattamenti[0]
    setPassaggi(prev => [...prev, { trattamentoId: t.id, ordine: prev.length, durata: t.durata, note: '' }])
  }
  const removePassaggio = (i: number) => setPassaggi(prev => prev.filter((_, idx) => idx !== i).map((p, idx) => ({ ...p, ordine: idx })))
  const updatePassaggio = (i: number, field: keyof Passaggio, val: string) => {
    setPassaggi(prev => prev.map((p, idx) => {
      if (idx !== i) return p
      if (field === 'trattamentoId') {
        const t = trattamenti.find(t => t.id === val)
        return { ...p, trattamentoId: val, durata: t?.durata ?? p.durata }
      }
      return { ...p, [field]: field === 'durata' || field === 'ordine' ? Number(val) : val }
    }))
  }

  const durataTotale = passaggi.reduce((s, p) => s + p.durata, 0)

  const save = async () => {
    setSaving(true)
    const payload = { ...form, prezzo: Number(form.prezzo), passaggi }
    let res
    if (modal === 'create') {
      res = await fetch('/api/host/spa/percorsi', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    } else {
      res = await fetch(`/api/host/spa/percorsi/${(modal as Percorso).id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    }
    if (res.ok) { setModal(null); load() }
    setSaving(false)
  }

  const remove = async (id: string) => {
    if (!confirm('Eliminare questo percorso?')) return
    await fetch(`/api/host/spa/percorsi/${id}`, { method: 'DELETE' })
    load()
  }

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-rose-100 flex items-center justify-center">
            <Star className="w-5 h-5 text-rose-600" />
          </div>
          <h1 className="text-xl font-bold text-gray-900">{t('title')}</h1>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
          <Plus className="w-4 h-4" /> Nuovo percorso
        </button>
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-400">Caricamento...</div>
      ) : percorsi.length === 0 ? (
        <div className="text-center py-16 text-gray-400">Nessun percorso ancora. Creane uno combinando più trattamenti!</div>
      ) : (
        <div className="space-y-3">
          {percorsi.map(p => (
            <div key={p.id} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="flex items-center gap-4 p-4">
                <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: p.colore }} />
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-gray-900 flex items-center gap-2">
                    {p.nome}
                    {!p.attivo && <Badge className="bg-gray-100 text-gray-500 text-xs">Disattivo</Badge>}
                  </div>
                  {p.descrizione && <div className="text-xs text-gray-400 truncate mt-0.5">{p.descrizione}</div>}
                </div>
                <div className="flex items-center gap-4 text-sm shrink-0">
                  <span className="flex items-center gap-1 text-gray-600"><Clock className="w-3.5 h-3.5" />{p.durataMinuti} min</span>
                  <span className="flex items-center gap-1 font-semibold text-gray-900"><Euro className="w-3.5 h-3.5" />{formatValuta(p.prezzo)}</span>
                  <span className="text-xs text-gray-400">{p.passaggi.length} step</span>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => openEdit(p)} className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100"><Edit2 className="w-3.5 h-3.5" /></button>
                  <button onClick={() => remove(p.id)} className="p-1.5 rounded-lg text-red-500 hover:bg-red-50"><Trash2 className="w-3.5 h-3.5" /></button>
                  <button onClick={() => setExpanded(expanded === p.id ? null : p.id)} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100">
                    {expanded === p.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              {expanded === p.id && p.passaggi.length > 0 && (
                <div className="border-t border-gray-100 px-4 py-3 bg-gray-50">
                  <div className="space-y-2">
                    {p.passaggi.map((pp, i) => (
                      <div key={pp.id} className="flex items-center gap-3 text-sm">
                        <span className="w-5 h-5 rounded-full bg-white border border-gray-200 flex items-center justify-center text-xs font-bold text-gray-500 shrink-0">{i + 1}</span>
                        <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: pp.trattamento.colore }} />
                        <span className="font-medium text-gray-800">{pp.trattamento.nome}</span>
                        <span className="text-gray-400 flex items-center gap-1"><Clock className="w-3 h-3" />{pp.durata} min</span>
                        {pp.note && <span className="text-gray-400 text-xs">· {pp.note}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {modal !== null && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold text-gray-900">{modal === 'create' ? 'Nuovo percorso' : 'Modifica percorso'}</h2>
            <Field label="Nome *" value={form.nome} onChange={v => setForm(f => ({ ...f, nome: v }))} />
            <Field label="Descrizione" value={form.descrizione} onChange={v => setForm(f => ({ ...f, descrizione: v }))} />
            <Field label="Prezzo (€) *" value={form.prezzo} onChange={v => setForm(f => ({ ...f, prezzo: v }))} type="number" />
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

            {/* Steps builder */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-medium text-gray-500">
                  Trattamenti inclusi {durataTotale > 0 && <span className="text-gray-400">({durataTotale} min totali)</span>}
                </label>
                <button onClick={addPassaggio} disabled={trattamenti.length === 0}
                  className="flex items-center gap-1 text-xs text-brand-600 hover:text-brand-700 font-medium disabled:opacity-40">
                  <Plus className="w-3 h-3" /> Aggiungi step
                </button>
              </div>
              {passaggi.length === 0 ? (
                <div className="text-xs text-gray-400 text-center py-4 bg-gray-50 rounded-lg">Nessun trattamento aggiunto</div>
              ) : (
                <div className="space-y-2">
                  {passaggi.map((pp, i) => (
                    <div key={i} className="flex items-center gap-2 bg-gray-50 rounded-lg p-2">
                      <GripVertical className="w-4 h-4 text-gray-300 shrink-0" />
                      <span className="text-xs font-bold text-gray-400 w-4 shrink-0">{i + 1}</span>
                      <select value={pp.trattamentoId}
                        onChange={e => updatePassaggio(i, 'trattamentoId', e.target.value)}
                        className="flex-1 text-xs border border-gray-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-brand-500">
                        {trattamenti.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
                      </select>
                      <input type="number" value={pp.durata} onChange={e => updatePassaggio(i, 'durata', e.target.value)}
                        className="w-16 text-xs border border-gray-200 rounded px-2 py-1 text-center focus:outline-none focus:ring-1 focus:ring-brand-500" placeholder="min" />
                      <span className="text-xs text-gray-400">min</span>
                      <button onClick={() => removePassaggio(i)} className="text-red-400 hover:text-red-600 shrink-0">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <input type="checkbox" id="attivo_p" checked={form.attivo} onChange={e => setForm(f => ({ ...f, attivo: e.target.checked }))} className="rounded" />
              <label htmlFor="attivo_p" className="text-sm text-gray-700">Percorso attivo</label>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setModal(null)} className="flex-1 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50">Annulla</button>
              <button onClick={save} disabled={saving || !form.nome || !form.prezzo}
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
