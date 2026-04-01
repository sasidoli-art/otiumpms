'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import {
  Boxes, Plus, X, Loader2, AlertTriangle, Package, ArrowDown, ArrowUp,
  Search, Filter, Trash2, RotateCcw,
} from 'lucide-react'

type Movimento = { id: string; tipo: string; quantita: number; motivo: string | null; operatore: string | null; createdAt: string }

type Articolo = {
  id: string; nome: string; categoria: string; unita: string
  quantita: number; scorteMinime: number; scorteOttimali: number | null
  costoUnitario: number | null; fornitore: string | null; codiceArticolo: string | null
  ubicazione: string | null; note: string | null; movimenti: Movimento[]
}

const CATEGORIE = ['BIANCHERIA', 'PULIZIA', 'MINIBAR', 'AMENITIES', 'CANCELLERIA', 'MANUTENZIONE', 'ALTRO']
const CAT_COLORI: Record<string, string> = {
  BIANCHERIA: 'bg-blue-100 text-blue-700', PULIZIA: 'bg-green-100 text-green-700',
  MINIBAR: 'bg-amber-100 text-amber-700', AMENITIES: 'bg-purple-100 text-purple-700',
  CANCELLERIA: 'bg-gray-100 text-gray-600', MANUTENZIONE: 'bg-orange-100 text-orange-700',
  ALTRO: 'bg-gray-50 text-gray-500',
}

const inp = 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-brand-400 focus:ring-1 focus:ring-brand-400 outline-none dark:bg-slate-800 dark:border-slate-600 dark:text-slate-200'

export default function MagazzinoBoard() {
  const [articoli, setArticoli] = useState<Articolo[]>([])
  const [kpi, setKpi] = useState({ totaleArticoli: 0, sottoScortaCount: 0, valoreStimato: 0 })
  const [loading, setLoading] = useState(true)
  const [filtroCat, setFiltroCat] = useState('')
  const [q, setQ] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [movimentoId, setMovimentoId] = useState<string | null>(null)
  const [movForm, setMovForm] = useState({ tipo: 'SCARICO', quantita: '', motivo: '' })
  const [errore, setErrore] = useState<string | null>(null)

  const [form, setForm] = useState({
    nome: '', categoria: 'ALTRO', unita: 'pz', quantita: '', scorteMinime: '',
    costoUnitario: '', fornitore: '', ubicazione: '',
  })

  async function carica() {
    setLoading(true)
    const params = filtroCat ? `?categoria=${filtroCat}` : ''
    const res = await fetch(`/api/host/magazzino${params}`)
    if (res.ok) { const d = await res.json(); setArticoli(d.articoli); setKpi(d.kpi) }
    setLoading(false)
  }

  useEffect(() => { carica() }, [filtroCat])

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!form.nome.trim()) return
    setSaving(true); setErrore(null)
    const res = await fetch('/api/host/magazzino', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        quantita: form.quantita ? parseInt(form.quantita) : 0,
        scorteMinime: form.scorteMinime ? parseInt(form.scorteMinime) : 0,
        costoUnitario: form.costoUnitario ? parseFloat(form.costoUnitario) : null,
      }),
    })
    if (res.ok) {
      setForm({ nome: '', categoria: 'ALTRO', unita: 'pz', quantita: '', scorteMinime: '', costoUnitario: '', fornitore: '', ubicazione: '' })
      setShowForm(false); carica()
    } else { const j = await res.json().catch(() => ({})); setErrore(j.error || 'Errore') }
    setSaving(false)
  }

  async function handleMovimento(e: React.FormEvent) {
    e.preventDefault()
    if (!movimentoId || !movForm.quantita) return
    setSaving(true)
    const res = await fetch(`/api/host/magazzino/${movimentoId}/movimento`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...movForm, quantita: parseInt(movForm.quantita) }),
    })
    if (res.ok) { setMovimentoId(null); setMovForm({ tipo: 'SCARICO', quantita: '', motivo: '' }); carica() }
    else { const j = await res.json().catch(() => ({})); setErrore(j.error || 'Errore') }
    setSaving(false)
  }

  async function deleteArt(id: string) {
    await fetch(`/api/host/magazzino/${id}`, { method: 'DELETE' }); carica()
  }

  const filtrati = articoli.filter(a => {
    if (q && !a.nome.toLowerCase().includes(q.toLowerCase()) && !a.fornitore?.toLowerCase().includes(q.toLowerCase())) return false
    return true
  })

  return (
    <div className="space-y-6">
      <div className="page-title-box">
        <div>
          <h1 className="page-title flex items-center gap-2"><Boxes className="w-6 h-6 text-brand-500" /> Magazzino</h1>
          <p className="text-sm text-gray-500">Inventario articoli, scorte e movimenti</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Nuovo articolo
        </button>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card py-3 flex flex-col items-center">
          <span className="text-2xl font-extrabold text-brand-600">{kpi.totaleArticoli}</span>
          <span className="text-xs text-gray-500">Articoli</span>
        </div>
        <div className="card py-3 flex flex-col items-center">
          <span className={`text-2xl font-extrabold ${kpi.sottoScortaCount > 0 ? 'text-red-600' : 'text-green-600'}`}>{kpi.sottoScortaCount}</span>
          <span className="text-xs text-gray-500">Sotto scorta</span>
        </div>
        <div className="card py-3 flex flex-col items-center">
          <span className="text-2xl font-extrabold text-gray-600">€{Math.round(kpi.valoreStimato).toLocaleString('it-IT')}</span>
          <span className="text-xs text-gray-500">Valore stimato</span>
        </div>
      </div>

      {errore && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
          <AlertTriangle className="w-4 h-4" /> {errore}
          <button onClick={() => setErrore(null)} className="ml-auto"><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* Form nuovo articolo */}
      {showForm && (
        <form onSubmit={handleAdd} className="card border-brand-200 space-y-3">
          <h3 className="text-sm font-semibold">Nuovo articolo</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            <input type="text" value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} placeholder="Nome articolo..." className={inp} required />
            <select value={form.categoria} onChange={e => setForm(f => ({ ...f, categoria: e.target.value }))} className={inp}>
              {CATEGORIE.map(c => <option key={c} value={c}>{c.charAt(0) + c.slice(1).toLowerCase()}</option>)}
            </select>
            <select value={form.unita} onChange={e => setForm(f => ({ ...f, unita: e.target.value }))} className={inp}>
              {['pz', 'kg', 'lt', 'rotoli', 'conf', 'set'].map(u => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <input type="number" value={form.quantita} onChange={e => setForm(f => ({ ...f, quantita: e.target.value }))} placeholder="Qtà iniziale" className={inp} />
            <input type="number" value={form.scorteMinime} onChange={e => setForm(f => ({ ...f, scorteMinime: e.target.value }))} placeholder="Scorta minima" className={inp} />
            <input type="number" step="0.01" value={form.costoUnitario} onChange={e => setForm(f => ({ ...f, costoUnitario: e.target.value }))} placeholder="€ costo unit." className={inp} />
            <input type="text" value={form.fornitore} onChange={e => setForm(f => ({ ...f, fornitore: e.target.value }))} placeholder="Fornitore" className={inp} />
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2 text-sm">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Aggiungi
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="btn-secondary text-sm">Annulla</button>
          </div>
        </form>
      )}

      {/* Filtri */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[150px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" value={q} onChange={e => setQ(e.target.value)} placeholder="Cerca articolo..." className={`pl-9 ${inp}`} />
        </div>
        <select value={filtroCat} onChange={e => setFiltroCat(e.target.value)} className={`w-auto ${inp}`}>
          <option value="">Tutte le categorie</option>
          {CATEGORIE.map(c => <option key={c} value={c}>{c.charAt(0) + c.slice(1).toLowerCase()}</option>)}
        </select>
        <span className="text-xs text-gray-400">{filtrati.length} articoli</span>
      </div>

      {/* Lista */}
      {loading ? (
        <div className="card py-12 flex items-center justify-center text-gray-400"><Loader2 className="w-6 h-6 animate-spin" /></div>
      ) : filtrati.length === 0 ? (
        <div className="card py-12 flex flex-col items-center gap-2 text-gray-300">
          <Package className="w-10 h-10 opacity-30" /><p className="text-sm">Nessun articolo</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtrati.map(a => {
            const sottoScorta = a.scorteMinime > 0 && a.quantita <= a.scorteMinime
            return (
              <div key={a.id} className={`card flex items-center gap-3 ${sottoScorta ? 'border-l-4 border-l-red-400' : ''}`}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-0.5">
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${CAT_COLORI[a.categoria] || CAT_COLORI.ALTRO}`}>{a.categoria}</span>
                    {sottoScorta && <span className="text-[10px] font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded flex items-center gap-0.5"><AlertTriangle className="w-3 h-3" /> Sotto scorta</span>}
                  </div>
                  <p className="text-sm font-medium text-gray-900 dark:text-slate-100">{a.nome}</p>
                  <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                    {a.fornitore && <span>{a.fornitore}</span>}
                    {a.ubicazione && <span>{a.ubicazione}</span>}
                    {a.costoUnitario && <span>€{a.costoUnitario.toFixed(2)}/{a.unita}</span>}
                  </div>
                </div>

                {/* Giacenza */}
                <div className="text-center shrink-0 w-20">
                  <p className={`text-xl font-extrabold ${sottoScorta ? 'text-red-600' : 'text-gray-900 dark:text-slate-100'}`}>{a.quantita}</p>
                  <p className="text-[10px] text-gray-400">{a.unita}{a.scorteMinime > 0 ? ` (min ${a.scorteMinime})` : ''}</p>
                </div>

                {/* Azioni */}
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => { setMovimentoId(a.id); setMovForm({ tipo: 'CARICO', quantita: '', motivo: '' }) }}
                    className="p-1.5 rounded border border-green-200 text-green-600 hover:bg-green-50" title="Carico">
                    <ArrowDown className="w-4 h-4" />
                  </button>
                  <button onClick={() => { setMovimentoId(a.id); setMovForm({ tipo: 'SCARICO', quantita: '', motivo: '' }) }}
                    className="p-1.5 rounded border border-orange-200 text-orange-600 hover:bg-orange-50" title="Scarico">
                    <ArrowUp className="w-4 h-4" />
                  </button>
                  <button onClick={() => deleteArt(a.id)}
                    className="p-1.5 rounded border border-gray-200 text-gray-300 hover:text-red-500 hover:border-red-200" title="Elimina">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal movimento */}
      {movimentoId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <form onSubmit={handleMovimento} className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-sm p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold">{movForm.tipo === 'CARICO' ? 'Carico merce' : 'Scarico merce'}</h3>
              <button type="button" onClick={() => setMovimentoId(null)} className="p-1 hover:bg-gray-100 dark:hover:bg-slate-700 rounded"><X className="w-5 h-5" /></button>
            </div>
            <select value={movForm.tipo} onChange={e => setMovForm(f => ({ ...f, tipo: e.target.value }))} className={inp}>
              <option value="CARICO">Carico (rifornimento)</option>
              <option value="SCARICO">Scarico (consumo)</option>
              <option value="CONSUMO">Consumo (camera)</option>
              <option value="RETTIFICA">Rettifica inventario</option>
            </select>
            <input type="number" value={movForm.quantita} onChange={e => setMovForm(f => ({ ...f, quantita: e.target.value }))} placeholder="Quantità" className={inp} required min={1} />
            <input type="text" value={movForm.motivo} onChange={e => setMovForm(f => ({ ...f, motivo: e.target.value }))} placeholder="Motivo (opzionale)" className={inp} />
            <div className="flex gap-2">
              <button type="submit" disabled={saving} className="flex-1 btn-primary flex items-center justify-center gap-2">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
                Registra
              </button>
              <button type="button" onClick={() => setMovimentoId(null)} className="btn-secondary">Annulla</button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
