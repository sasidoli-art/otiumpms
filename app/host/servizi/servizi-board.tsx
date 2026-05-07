'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import {
  ShoppingBag, Plus, X, Loader2, Search, Trash2, Pencil,
  Package, Tag, Check, Coffee, Wine, Sparkles, Car, UtensilsCrossed,
} from 'lucide-react'
import { CATEGORIE_SERVIZIO, ALIQUOTE_IVA } from '@/lib/iva'

type Servizio = {
  id: string; nome: string; descrizione: string | null; categoria: string; sottocategoria: string | null
  prezzo: number; aliquotaIva: number; unitaMisura: string; attivo: boolean; prenotabileOnline: boolean
  ricorrente: boolean; orarioInizio: string | null; orarioFine: string | null; luogo: string | null
  struttura: { nome: string } | null
}

type Pacchetto = {
  id: string; nome: string; descrizione: string | null; prezzo: number; prezzoOriginale: number | null
  attivo: boolean; prenotabileOnline: boolean
  struttura: { nome: string } | null
  voci: { quantita: number; incluso: boolean; servizio: { nome: string; prezzo: number; aliquotaIva: number; categoria: string } }[]
}

const CAT_ICONS: Record<string, React.ReactNode> = {
  ALLOGGIO: <Coffee className="w-4 h-4" />, RISTORAZIONE: <UtensilsCrossed className="w-4 h-4" />,
  BEVANDE: <Wine className="w-4 h-4" />, SPA: <Sparkles className="w-4 h-4" />,
  SERVIZI: <Car className="w-4 h-4" />, PRODOTTI: <ShoppingBag className="w-4 h-4" />,
  DEGUSTAZIONE: <Wine className="w-4 h-4" />, ALTRO: <Tag className="w-4 h-4" />,
}

const inp = 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-brand-400 focus:ring-1 focus:ring-brand-400 outline-none dark:bg-slate-800 dark:border-slate-600 dark:text-slate-200'

export default function ServiziBoard() {
  const t = useTranslations('host.services')
  const _tc = useTranslations('common')
  const [tab, setTab] = useState<'servizi' | 'pacchetti'>('servizi')
  const [servizi, setServizi] = useState<Servizio[]>([])
  const [pacchetti, setPacchetti] = useState<Pacchetto[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [showPacForm, setShowPacForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [filtroCat, setFiltroCat] = useState('')
  const [q, setQ] = useState('')
  const [errore, setErrore] = useState<string | null>(null)

  const [form, setForm] = useState({
    nome: '', descrizione: '', categoria: 'ALTRO', sottocategoria: '',
    prezzo: '', aliquotaIva: '22', unitaMisura: 'a persona', attivo: true,
    prenotabileOnline: false, ricorrente: false, orarioInizio: '', orarioFine: '', luogo: '',
  })

  const [pacForm, setPacForm] = useState({
    nome: '', descrizione: '', prezzo: '', prezzoOriginale: '', vociIds: [] as string[],
  })

  async function carica() {
    setLoading(true)
    const [sRes, pRes] = await Promise.all([
      fetch('/api/host/servizi'), fetch('/api/host/servizi/pacchetti'),
    ])
    if (sRes.ok) setServizi(await sRes.json())
    if (pRes.ok) setPacchetti(await pRes.json())
    setLoading(false)
  }

  useEffect(() => { carica() }, [])

  async function addServizio(e: React.FormEvent) {
    e.preventDefault()
    if (!form.nome.trim()) return
    setSaving(true); setErrore(null)
    const res = await fetch('/api/host/servizi', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, prezzo: parseFloat(form.prezzo) || 0, aliquotaIva: parseFloat(form.aliquotaIva) }),
    })
    if (res.ok) {
      setForm({ nome: '', descrizione: '', categoria: 'ALTRO', sottocategoria: '', prezzo: '', aliquotaIva: '22', unitaMisura: 'a persona', attivo: true, prenotabileOnline: false, ricorrente: false, orarioInizio: '', orarioFine: '', luogo: '' })
      setShowForm(false); carica()
    } else { const j = await res.json().catch(() => ({})); setErrore(j.error || 'Errore') }
    setSaving(false)
  }

  async function addPacchetto(e: React.FormEvent) {
    e.preventDefault()
    if (!pacForm.nome.trim()) return
    setSaving(true); setErrore(null)
    const res = await fetch('/api/host/servizi/pacchetti', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nome: pacForm.nome, descrizione: pacForm.descrizione || null,
        prezzo: parseFloat(pacForm.prezzo) || 0,
        prezzoOriginale: pacForm.prezzoOriginale ? parseFloat(pacForm.prezzoOriginale) : null,
        voci: pacForm.vociIds.map(id => ({ servizioId: id, quantita: 1, incluso: true })),
      }),
    })
    if (res.ok) { setPacForm({ nome: '', descrizione: '', prezzo: '', prezzoOriginale: '', vociIds: [] }); setShowPacForm(false); carica() }
    else { const j = await res.json().catch(() => ({})); setErrore(j.error || 'Errore') }
    setSaving(false)
  }

  async function deleteServizio(id: string) { await fetch(`/api/host/servizi/${id}`, { method: 'DELETE' }); carica() }
  async function deletePacchetto(id: string) { await fetch(`/api/host/servizi/pacchetti/${id}`, { method: 'DELETE' }); carica() }

  function toggleVoce(id: string) {
    setPacForm(f => ({ ...f, vociIds: f.vociIds.includes(id) ? f.vociIds.filter(v => v !== id) : [...f.vociIds, id] }))
  }

  const filtrati = servizi.filter(s => {
    if (filtroCat && s.categoria !== filtroCat) return false
    if (q && !s.nome.toLowerCase().includes(q.toLowerCase())) return false
    return true
  })

  const ivaSuggerita = CATEGORIE_SERVIZIO.find(c => c.id === form.categoria)?.ivaSuggerita

  return (
    <div className="space-y-6">
      <div className="page-title-box">
        <div>
          <h1 className="page-title flex items-center gap-2"><ShoppingBag className="w-6 h-6 text-brand-500" /> {t('title')}</h1>
          <p className="text-sm text-gray-500">Prodotti, servizi e pacchetti con IVA per fatturazione</p>
        </div>
        <div className="flex gap-2">
          {tab === 'servizi' && <button onClick={() => setShowForm(!showForm)} className="btn-primary flex items-center gap-2"><Plus className="w-4 h-4" /> Nuovo servizio</button>}
          {tab === 'pacchetti' && <button onClick={() => setShowPacForm(!showPacForm)} className="btn-primary flex items-center gap-2"><Package className="w-4 h-4" /> Nuovo pacchetto</button>}
        </div>
      </div>

      {/* Tab */}
      <div className="flex gap-2">
        <button onClick={() => setTab('servizi')} className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${tab === 'servizi' ? 'bg-brand-500 text-white' : 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300'}`}>
          Servizi ({servizi.length})
        </button>
        <button onClick={() => setTab('pacchetti')} className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${tab === 'pacchetti' ? 'bg-brand-500 text-white' : 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300'}`}>
          Pacchetti ({pacchetti.length})
        </button>
      </div>

      {errore && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
          {errore} <button onClick={() => setErrore(null)} className="ml-auto"><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* TAB SERVIZI */}
      {tab === 'servizi' && (
        <>
          {showForm && (
            <form onSubmit={addServizio} className="card border-brand-200 space-y-3">
              <h3 className="text-sm font-semibold">Nuovo servizio/prodotto</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                <input type="text" value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} placeholder="Nome..." className={inp} required />
                <select value={form.categoria} onChange={e => { setForm(f => ({ ...f, categoria: e.target.value, aliquotaIva: String(CATEGORIE_SERVIZIO.find(c => c.id === e.target.value)?.ivaSuggerita ?? 22) })) }} className={inp}>
                  {CATEGORIE_SERVIZIO.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                </select>
                <input type="text" value={form.sottocategoria} onChange={e => setForm(f => ({ ...f, sottocategoria: e.target.value }))} placeholder="Sottocategoria..." className={inp} />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[10px] text-gray-500 block mb-0.5">Prezzo €</label>
                  <input type="number" step="0.01" value={form.prezzo} onChange={e => setForm(f => ({ ...f, prezzo: e.target.value }))} className={inp} />
                </div>
                <div>
                  <label className="text-[10px] text-gray-500 block mb-0.5">IVA %{ivaSuggerita !== undefined ? ` (suggerita: ${ivaSuggerita}%)` : ''}</label>
                  <select value={form.aliquotaIva} onChange={e => setForm(f => ({ ...f, aliquotaIva: e.target.value }))} className={inp}>
                    {ALIQUOTE_IVA.map(a => <option key={a.valore} value={a.valore}>{a.label} — {a.descrizione}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-gray-500 block mb-0.5">Unità</label>
                  <select value={form.unitaMisura} onChange={e => setForm(f => ({ ...f, unitaMisura: e.target.value }))} className={inp}>
                    {['a persona', 'a camera', 'a notte', 'forfait', 'a consumo', 'a bottiglia', 'a kg'].map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
              </div>
              <input type="text" value={form.descrizione} onChange={e => setForm(f => ({ ...f, descrizione: e.target.value }))} placeholder="Descrizione (opzionale)" className={inp} />
              <div className="flex items-center gap-4 text-xs">
                <label className="flex items-center gap-1.5 cursor-pointer"><input type="checkbox" checked={form.ricorrente} onChange={e => setForm(f => ({ ...f, ricorrente: e.target.checked }))} className="accent-brand-500" /> Ricorrente (per notte)</label>
                <label className="flex items-center gap-1.5 cursor-pointer"><input type="checkbox" checked={form.prenotabileOnline} onChange={e => setForm(f => ({ ...f, prenotabileOnline: e.target.checked }))} className="accent-brand-500" /> Prenotabile online</label>
              </div>
              <div className="flex gap-2">
                <button type="submit" disabled={saving} className="btn-primary text-sm flex items-center gap-2">
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
              <input type="text" value={q} onChange={e => setQ(e.target.value)} placeholder="Cerca..." className={`pl-9 ${inp}`} />
            </div>
            <select value={filtroCat} onChange={e => setFiltroCat(e.target.value)} className={`w-auto ${inp}`}>
              <option value="">Tutte le categorie</option>
              {CATEGORIE_SERVIZIO.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
            <span className="text-xs text-gray-400">{filtrati.length} servizi</span>
          </div>

          {/* Lista */}
          {loading ? (
            <div className="card py-12 flex items-center justify-center text-gray-400"><Loader2 className="w-6 h-6 animate-spin" /></div>
          ) : filtrati.length === 0 ? (
            <div className="card py-12 flex flex-col items-center gap-2 text-gray-300">
              <ShoppingBag className="w-10 h-10 opacity-30" /><p className="text-sm">Nessun servizio</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {filtrati.map(s => (
                <div key={s.id} className={`card flex flex-col ${!s.attivo ? 'opacity-50' : ''}`}>
                  <div className="flex items-start gap-2 mb-2">
                    <div className="p-1.5 rounded-lg bg-gray-100 dark:bg-slate-700 shrink-0">
                      {CAT_ICONS[s.categoria] || <Tag className="w-4 h-4" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 dark:text-slate-100 truncate">{s.nome}</p>
                      <p className="text-[10px] text-gray-400">{CATEGORIE_SERVIZIO.find(c => c.id === s.categoria)?.label}{s.sottocategoria ? ` · ${s.sottocategoria}` : ''}</p>
                    </div>
                    <button onClick={() => deleteServizio(s.id)} className="p-1 text-gray-300 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                  <div className="flex items-end justify-between mt-auto">
                    <div>
                      <p className="text-lg font-extrabold text-brand-600">€{s.prezzo.toFixed(2)}</p>
                      <p className="text-[10px] text-gray-400">{s.unitaMisura} · IVA {s.aliquotaIva}%{s.ricorrente ? ' · ricorrente' : ''}</p>
                    </div>
                    <div className="flex gap-1">
                      {s.prenotabileOnline && <span className="text-[9px] bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-1.5 py-0.5 rounded">Online</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* TAB PACCHETTI */}
      {tab === 'pacchetti' && (
        <>
          {showPacForm && (
            <form onSubmit={addPacchetto} className="card border-brand-200 space-y-3">
              <h3 className="text-sm font-semibold">Nuovo pacchetto</h3>
              <input type="text" value={pacForm.nome} onChange={e => setPacForm(f => ({ ...f, nome: e.target.value }))} placeholder="Nome pacchetto..." className={inp} required />
              <input type="text" value={pacForm.descrizione} onChange={e => setPacForm(f => ({ ...f, descrizione: e.target.value }))} placeholder="Descrizione..." className={inp} />
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-gray-500 block mb-0.5">Prezzo pacchetto €</label>
                  <input type="number" step="0.01" value={pacForm.prezzo} onChange={e => setPacForm(f => ({ ...f, prezzo: e.target.value }))} className={inp} required />
                </div>
                <div>
                  <label className="text-[10px] text-gray-500 block mb-0.5">Prezzo pieno € (opzionale, per mostrare sconto)</label>
                  <input type="number" step="0.01" value={pacForm.prezzoOriginale} onChange={e => setPacForm(f => ({ ...f, prezzoOriginale: e.target.value }))} className={inp} />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 dark:text-slate-400 block mb-2">Seleziona servizi inclusi nel pacchetto:</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-48 overflow-y-auto">
                  {servizi.filter(s => s.attivo).map(s => (
                    <label key={s.id} className={`flex items-center gap-2 px-2.5 py-2 rounded-lg border cursor-pointer text-xs transition-all ${
                      pacForm.vociIds.includes(s.id) ? 'border-brand-400 bg-brand-50 dark:bg-brand-900/20' : 'border-gray-200 dark:border-slate-600'
                    }`}>
                      <input type="checkbox" checked={pacForm.vociIds.includes(s.id)} onChange={() => toggleVoce(s.id)} className="accent-brand-500" />
                      <span className="truncate">{s.nome}</span>
                      <span className="ml-auto text-gray-400 shrink-0">€{s.prezzo.toFixed(0)}</span>
                    </label>
                  ))}
                </div>
                {pacForm.vociIds.length > 0 && (
                  <p className="text-xs text-gray-400 mt-2">
                    {pacForm.vociIds.length} servizi · Valore: €{servizi.filter(s => pacForm.vociIds.includes(s.id)).reduce((t, s) => t + s.prezzo, 0).toFixed(2)}
                    {pacForm.prezzo && parseFloat(pacForm.prezzo) > 0 && (
                      <span className="text-green-600 font-medium"> · Risparmio: €{(servizi.filter(s => pacForm.vociIds.includes(s.id)).reduce((t, s) => t + s.prezzo, 0) - parseFloat(pacForm.prezzo)).toFixed(2)}</span>
                    )}
                  </p>
                )}
              </div>
              <div className="flex gap-2">
                <button type="submit" disabled={saving} className="btn-primary text-sm flex items-center gap-2">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Package className="w-4 h-4" />} Crea pacchetto
                </button>
                <button type="button" onClick={() => setShowPacForm(false)} className="btn-secondary text-sm">Annulla</button>
              </div>
            </form>
          )}

          {loading ? (
            <div className="card py-12 flex items-center justify-center text-gray-400"><Loader2 className="w-6 h-6 animate-spin" /></div>
          ) : pacchetti.length === 0 ? (
            <div className="card py-12 flex flex-col items-center gap-2 text-gray-300">
              <Package className="w-10 h-10 opacity-30" /><p className="text-sm">Nessun pacchetto</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pacchetti.map(p => (
                <div key={p.id} className="card">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Package className="w-4 h-4 text-brand-500" />
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-slate-100">{p.nome}</h3>
                      </div>
                      {p.descrizione && <p className="text-xs text-gray-500 mb-2">{p.descrizione}</p>}
                      <div className="flex flex-wrap gap-1.5">
                        {p.voci.map((v, i) => (
                          <span key={i} className="text-[10px] bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-300 px-2 py-0.5 rounded">
                            {v.quantita > 1 ? `${v.quantita}× ` : ''}{v.servizio.nome} (IVA {v.servizio.aliquotaIva}%)
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      {p.prezzoOriginale && (
                        <p className="text-xs text-gray-400 line-through">€{p.prezzoOriginale.toFixed(2)}</p>
                      )}
                      <p className="text-xl font-extrabold text-brand-600">€{p.prezzo.toFixed(2)}</p>
                      <button onClick={() => deletePacchetto(p.id)} className="text-[10px] text-red-400 hover:text-red-600 mt-1">Elimina</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
