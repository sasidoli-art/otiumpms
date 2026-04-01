'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { format } from 'date-fns'
import { it } from 'date-fns/locale'
import {
  Search, Plus, X, Loader2, Package, CheckCircle2, Clock,
  MapPin, User, Filter, Trash2, Send,
} from 'lucide-react'

type Oggetto = {
  id: string
  descrizione: string
  categoria: string
  luogoRitrovamento: string | null
  dataRitrovamento: string
  trovatoDa: string | null
  proprietarioNome: string | null
  proprietarioEmail: string | null
  proprietarioTelefono: string | null
  stato: string
  luogoCustodia: string | null
  noteRestituzione: string | null
  note: string | null
  createdAt: string
  prenotazione: { id: string; guestNome: string; guestCognome: string } | null
}

const STATI = {
  IN_CUSTODIA: { label: 'In custodia', color: 'bg-blue-100 text-blue-700', icon: Clock },
  RESTITUITO: { label: 'Restituito', color: 'bg-green-100 text-green-700', icon: CheckCircle2 },
  SPEDITO: { label: 'Spedito', color: 'bg-purple-100 text-purple-700', icon: Send },
  NON_RECLAMATO: { label: 'Non reclamato', color: 'bg-gray-100 text-gray-500', icon: Package },
  SMALTITO: { label: 'Smaltito', color: 'bg-red-100 text-red-500', icon: Trash2 },
}

const CATEGORIE = ['ABBIGLIAMENTO', 'ELETTRONICA', 'DOCUMENTI', 'GIOIELLI', 'BAGAGLIO', 'ALTRO']

const inp = 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-brand-400 focus:ring-1 focus:ring-brand-400 outline-none'

export default function OggettiSmarritiBoard() {
  const [oggetti, setOggetti] = useState<Oggetto[]>([])
  const [kpi, setKpi] = useState({ inCustodia: 0, restituiti: 0, totale: 0 })
  const [loading, setLoading] = useState(true)
  const [filtroStato, setFiltroStato] = useState('')
  const [q, setQ] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [errore, setErrore] = useState<string | null>(null)

  const [form, setForm] = useState({
    descrizione: '', categoria: 'ALTRO', luogoRitrovamento: '', trovatoDa: '',
    proprietarioNome: '', proprietarioEmail: '', proprietarioTelefono: '', luogoCustodia: '', note: '',
  })

  async function carica() {
    setLoading(true)
    const params = filtroStato ? `?stato=${filtroStato}` : ''
    const res = await fetch(`/api/host/oggetti-smarriti${params}`)
    if (res.ok) { const d = await res.json(); setOggetti(d.oggetti); setKpi(d.kpi) }
    setLoading(false)
  }

  useEffect(() => { carica() }, [filtroStato])

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!form.descrizione.trim()) return
    setSaving(true); setErrore(null)
    const res = await fetch('/api/host/oggetti-smarriti', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form),
    })
    if (res.ok) {
      setForm({ descrizione: '', categoria: 'ALTRO', luogoRitrovamento: '', trovatoDa: '', proprietarioNome: '', proprietarioEmail: '', proprietarioTelefono: '', luogoCustodia: '', note: '' })
      setShowForm(false); carica()
    } else { const j = await res.json().catch(() => ({})); setErrore(j.error || 'Errore') }
    setSaving(false)
  }

  async function updateStato(id: string, stato: string) {
    await fetch(`/api/host/oggetti-smarriti/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ stato }),
    })
    carica()
  }

  const filtrati = oggetti.filter(o => {
    if (q && !o.descrizione.toLowerCase().includes(q.toLowerCase()) && !o.proprietarioNome?.toLowerCase().includes(q.toLowerCase())) return false
    return true
  })

  return (
    <div className="space-y-6">
      <div className="page-title-box">
        <div>
          <h1 className="page-title">Oggetti Smarriti</h1>
          <p className="text-sm text-gray-500">Registro oggetti trovati e smarriti</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Registra oggetto
        </button>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-3 gap-4">
        <button onClick={() => setFiltroStato(filtroStato === 'IN_CUSTODIA' ? '' : 'IN_CUSTODIA')} className={`card py-3 flex flex-col items-center cursor-pointer hover:shadow-md transition-all ${filtroStato === 'IN_CUSTODIA' ? 'ring-2 ring-brand-500' : ''}`}>
          <span className="text-2xl font-extrabold text-blue-600">{kpi.inCustodia}</span>
          <span className="text-xs text-gray-500">In custodia</span>
        </button>
        <button onClick={() => setFiltroStato(filtroStato === 'RESTITUITO' ? '' : 'RESTITUITO')} className={`card py-3 flex flex-col items-center cursor-pointer hover:shadow-md transition-all ${filtroStato === 'RESTITUITO' ? 'ring-2 ring-brand-500' : ''}`}>
          <span className="text-2xl font-extrabold text-green-600">{kpi.restituiti}</span>
          <span className="text-xs text-gray-500">Restituiti</span>
        </button>
        <div className="card py-3 flex flex-col items-center">
          <span className="text-2xl font-extrabold text-gray-600">{kpi.totale}</span>
          <span className="text-xs text-gray-500">Totale</span>
        </div>
      </div>

      {errore && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
          {errore} <button onClick={() => setErrore(null)} className="ml-auto"><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* Form nuovo */}
      {showForm && (
        <form onSubmit={handleAdd} className="card border-brand-200 bg-brand-50/20 space-y-3">
          <h3 className="text-sm font-semibold text-gray-900">Registra oggetto trovato</h3>
          <input type="text" value={form.descrizione} onChange={e => setForm(f => ({ ...f, descrizione: e.target.value }))} placeholder="Descrizione oggetto..." className={inp} required />
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            <select value={form.categoria} onChange={e => setForm(f => ({ ...f, categoria: e.target.value }))} className={inp}>
              {CATEGORIE.map(c => <option key={c} value={c}>{c.charAt(0) + c.slice(1).toLowerCase()}</option>)}
            </select>
            <input type="text" value={form.luogoRitrovamento} onChange={e => setForm(f => ({ ...f, luogoRitrovamento: e.target.value }))} placeholder="Luogo (Camera 204...)" className={inp} />
            <input type="text" value={form.trovatoDa} onChange={e => setForm(f => ({ ...f, trovatoDa: e.target.value }))} placeholder="Trovato da" className={inp} />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <input type="text" value={form.proprietarioNome} onChange={e => setForm(f => ({ ...f, proprietarioNome: e.target.value }))} placeholder="Proprietario (se noto)" className={inp} />
            <input type="email" value={form.proprietarioEmail} onChange={e => setForm(f => ({ ...f, proprietarioEmail: e.target.value }))} placeholder="Email" className={inp} />
            <input type="text" value={form.luogoCustodia} onChange={e => setForm(f => ({ ...f, luogoCustodia: e.target.value }))} placeholder="Custodito in..." className={inp} />
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2 text-sm">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Registra
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="btn-secondary text-sm">Annulla</button>
          </div>
        </form>
      )}

      {/* Filtri */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" value={q} onChange={e => setQ(e.target.value)} placeholder="Cerca..." className={`pl-9 ${inp}`} />
        </div>
        <span className="text-xs text-gray-400">{filtrati.length} oggetti</span>
      </div>

      {/* Lista */}
      {loading ? (
        <div className="card py-12 flex items-center justify-center text-gray-400"><Loader2 className="w-6 h-6 animate-spin" /></div>
      ) : filtrati.length === 0 ? (
        <div className="card py-12 flex flex-col items-center gap-2 text-gray-300">
          <Package className="w-10 h-10 opacity-30" />
          <p className="text-sm">Nessun oggetto registrato</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtrati.map(o => {
            const st = STATI[o.stato as keyof typeof STATI] || STATI.IN_CUSTODIA
            const StIcon = st.icon
            return (
              <div key={o.id} className="card border-l-4 border-l-brand-400 flex items-start gap-3">
                <div className={`p-2 rounded-lg shrink-0 ${st.color}`}><StIcon className="w-4 h-4" /></div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${st.color}`}>{st.label}</span>
                    <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">{o.categoria}</span>
                  </div>
                  <p className="text-sm font-medium text-gray-900">{o.descrizione}</p>
                  <div className="flex items-center gap-3 mt-1 text-xs text-gray-400 flex-wrap">
                    {o.luogoRitrovamento && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {o.luogoRitrovamento}</span>}
                    {o.proprietarioNome && <span className="flex items-center gap-1"><User className="w-3 h-3" /> {o.proprietarioNome}</span>}
                    {o.luogoCustodia && <span>Custodia: {o.luogoCustodia}</span>}
                    <span>{format(new Date(o.dataRitrovamento), 'd MMM yyyy', { locale: it })}</span>
                  </div>
                </div>
                {o.stato === 'IN_CUSTODIA' && (
                  <div className="flex gap-1 shrink-0">
                    <button onClick={() => updateStato(o.id, 'RESTITUITO')} className="text-[10px] text-green-600 px-2 py-1 rounded border border-green-200 hover:bg-green-50">Restituito</button>
                    <button onClick={() => updateStato(o.id, 'SPEDITO')} className="text-[10px] text-purple-600 px-2 py-1 rounded border border-purple-200 hover:bg-purple-50">Spedito</button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
