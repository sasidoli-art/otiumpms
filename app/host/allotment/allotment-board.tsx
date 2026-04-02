'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Handshake, Plus, X, Loader2, Search, Filter, Trash2, Pencil,
  Building2, Calendar, Users, TrendingUp,
} from 'lucide-react'

// TODO: i18n

type Struttura = { id: string; nome: string }

type Contratto = {
  id: string
  tipo: 'TOUR_OPERATOR' | 'AGENZIA' | 'CORPORATE' | 'GRUPPO'
  nomePartner: string
  contatto: string | null
  email: string | null
  telefono: string | null
  dataInizio: string
  dataFine: string
  stato: 'ATTIVO' | 'SCADUTO' | 'SOSPESO'
  strutturaId: string
  struttura: { id: string; nome: string }
  unitaRiservate: number
  unitaVendute: number
  tariffaNegoziata: number | null
  scontoPercentuale: number | null
  commissionePercentuale: number | null
  releaseGiorni: number
  cancellazioneGratuita: boolean
  note: string | null
}

type KPI = {
  contrattiAttivi: number
  unitaRiservate: number
  unitaVendute: number
  revenuePartner: number
}

const TIPI = ['TOUR_OPERATOR', 'AGENZIA', 'CORPORATE', 'GRUPPO'] as const
const STATI = ['ATTIVO', 'SCADUTO', 'SOSPESO'] as const

const TIPO_LABELS: Record<string, string> = {
  TOUR_OPERATOR: 'Tour Operator',
  AGENZIA: 'Agenzia',
  CORPORATE: 'Corporate',
  GRUPPO: 'Gruppo',
}

const TIPO_COLORI: Record<string, string> = {
  TOUR_OPERATOR: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  AGENZIA: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  CORPORATE: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  GRUPPO: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
}

const STATO_COLORI: Record<string, string> = {
  ATTIVO: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  SCADUTO: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  SOSPESO: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
}

const inp = 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-brand-400 focus:ring-1 focus:ring-brand-400 outline-none dark:bg-slate-800 dark:border-slate-600 dark:text-slate-200'

const EMPTY_FORM: {
  tipo: 'TOUR_OPERATOR' | 'AGENZIA' | 'CORPORATE' | 'GRUPPO'
  nomePartner: string; contatto: string; email: string; telefono: string
  dataInizio: string; dataFine: string
  stato: 'ATTIVO' | 'SCADUTO' | 'SOSPESO'
  strutturaId: string; unitaRiservate: string; unitaVendute: string
  tariffaNegoziata: string; scontoPercentuale: string; commissionePercentuale: string
  releaseGiorni: string; cancellazioneGratuita: boolean; note: string
} = {
  tipo: 'TOUR_OPERATOR',
  nomePartner: '',
  contatto: '',
  email: '',
  telefono: '',
  dataInizio: '',
  dataFine: '',
  stato: 'ATTIVO',
  strutturaId: '',
  unitaRiservate: '',
  unitaVendute: '',
  tariffaNegoziata: '',
  scontoPercentuale: '',
  commissionePercentuale: '',
  releaseGiorni: '7',
  cancellazioneGratuita: true,
  note: '',
}

export default function AllotmentBoard() {
  const [contratti, setContratti] = useState<Contratto[]>([])
  const [kpi, setKpi] = useState<KPI>({ contrattiAttivi: 0, unitaRiservate: 0, unitaVendute: 0, revenuePartner: 0 })
  const [strutture, setStrutture] = useState<Struttura[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [errore, setErrore] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [filtroTipo, setFiltroTipo] = useState('')
  const [filtroStato, setFiltroStato] = useState('')
  const [q, setQ] = useState('')
  const [form, setForm] = useState(EMPTY_FORM)

  const carica = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (filtroTipo) params.set('tipo', filtroTipo)
    if (filtroStato) params.set('stato', filtroStato)
    const qs = params.toString() ? `?${params.toString()}` : ''
    const res = await fetch(`/api/host/allotment${qs}`)
    if (res.ok) {
      const d = await res.json()
      setContratti(d.contratti)
      setKpi(d.kpi)
    }
    setLoading(false)
  }, [filtroTipo, filtroStato])

  useEffect(() => { carica() }, [carica])

  // Load strutture for the form
  useEffect(() => {
    fetch('/api/host/strutture')
      .then(r => r.json())
      .then(data => {
        const list = Array.isArray(data) ? data : data.strutture ?? []
        setStrutture(list.map((s: { id: string; nome: string }) => ({ id: s.id, nome: s.nome })))
      })
      .catch(() => {})
  }, [])

  function openCreate() {
    setEditId(null)
    setForm(EMPTY_FORM)
    setShowForm(true)
    setErrore(null)
  }

  function openEdit(c: Contratto) {
    setEditId(c.id)
    setForm({
      tipo: c.tipo,
      nomePartner: c.nomePartner,
      contatto: c.contatto || '',
      email: c.email || '',
      telefono: c.telefono || '',
      dataInizio: c.dataInizio.split('T')[0],
      dataFine: c.dataFine.split('T')[0],
      stato: c.stato,
      strutturaId: c.strutturaId,
      unitaRiservate: String(c.unitaRiservate),
      unitaVendute: String(c.unitaVendute),
      tariffaNegoziata: c.tariffaNegoziata != null ? String(c.tariffaNegoziata) : '',
      scontoPercentuale: c.scontoPercentuale != null ? String(c.scontoPercentuale) : '',
      commissionePercentuale: c.commissionePercentuale != null ? String(c.commissionePercentuale) : '',
      releaseGiorni: String(c.releaseGiorni),
      cancellazioneGratuita: c.cancellazioneGratuita,
      note: c.note || '',
    })
    setShowForm(true)
    setErrore(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.nomePartner.trim() || !form.strutturaId || !form.dataInizio || !form.dataFine) return
    setSaving(true)
    setErrore(null)

    const body = {
      ...form,
      unitaRiservate: parseInt(form.unitaRiservate) || 1,
      unitaVendute: parseInt(form.unitaVendute) || 0,
      tariffaNegoziata: form.tariffaNegoziata ? parseFloat(form.tariffaNegoziata) : null,
      scontoPercentuale: form.scontoPercentuale ? parseFloat(form.scontoPercentuale) : null,
      commissionePercentuale: form.commissionePercentuale ? parseFloat(form.commissionePercentuale) : null,
      releaseGiorni: parseInt(form.releaseGiorni) || 7,
    }

    const url = editId ? `/api/host/allotment/${editId}` : '/api/host/allotment'
    const method = editId ? 'PATCH' : 'POST'

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    if (res.ok) {
      setShowForm(false)
      setEditId(null)
      setForm(EMPTY_FORM)
      carica()
    } else {
      const j = await res.json().catch(() => ({}))
      setErrore(j.error || 'Errore nel salvataggio')
    }
    setSaving(false)
  }

  async function handleDelete(id: string) {
    if (!confirm('Eliminare questo contratto?')) return
    await fetch(`/api/host/allotment/${id}`, { method: 'DELETE' })
    carica()
  }

  const filtrati = q
    ? contratti.filter(c =>
        c.nomePartner.toLowerCase().includes(q.toLowerCase()) ||
        c.struttura.nome.toLowerCase().includes(q.toLowerCase())
      )
    : contratti

  const fmt = (n: number) => new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(n)
  const fmtDate = (s: string) => new Date(s).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' })

  return (
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
            <Handshake className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Contratti &amp; Allotment</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Gestisci accordi con tour operator, agenzie e gruppi</p>
          </div>
        </div>
        <button
          onClick={openCreate}
          className="inline-flex items-center gap-2 px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-lg text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" /> Nuovo contratto
        </button>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Contratti attivi', value: kpi.contrattiAttivi, icon: Handshake, color: 'text-indigo-600' },
          { label: 'Unita riservate', value: kpi.unitaRiservate, icon: Building2, color: 'text-blue-600' },
          { label: 'Unita vendute', value: kpi.unitaVendute, icon: Users, color: 'text-green-600' },
          { label: 'Revenue partner', value: fmt(kpi.revenuePartner), icon: TrendingUp, color: 'text-amber-600' },
        ].map((k, i) => (
          <div key={i} className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-4">
            <div className="flex items-center gap-2 mb-1">
              <k.icon className={`w-4 h-4 ${k.color}`} />
              <span className="text-xs text-gray-500 dark:text-gray-400">{k.label}</span>
            </div>
            <p className="text-xl font-bold text-gray-900 dark:text-white">{k.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
          <input
            className={`${inp} pl-9`}
            placeholder="Cerca partner o struttura..."
            value={q}
            onChange={e => setQ(e.target.value)}
          />
        </div>
        <select className={`${inp} w-auto`} value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)}>
          <option value="">Tutti i tipi</option>
          {TIPI.map(t => <option key={t} value={t}>{TIPO_LABELS[t]}</option>)}
        </select>
        <select className={`${inp} w-auto`} value={filtroStato} onChange={e => setFiltroStato(e.target.value)}>
          <option value="">Tutti gli stati</option>
          {STATI.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      ) : filtrati.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Handshake className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>Nessun contratto trovato</p>
        </div>
      ) : (
        <div className="overflow-x-auto bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-slate-700 text-left text-xs text-gray-500 dark:text-gray-400 uppercase">
                <th className="px-4 py-3">Partner</th>
                <th className="px-4 py-3">Tipo</th>
                <th className="px-4 py-3">Struttura</th>
                <th className="px-4 py-3">Periodo</th>
                <th className="px-4 py-3">Allotment</th>
                <th className="px-4 py-3">Tariffa</th>
                <th className="px-4 py-3">Comm. %</th>
                <th className="px-4 py-3">Stato</th>
                <th className="px-4 py-3 text-right">Azioni</th>
              </tr>
            </thead>
            <tbody>
              {filtrati.map(c => {
                const pct = c.unitaRiservate > 0 ? Math.round((c.unitaVendute / c.unitaRiservate) * 100) : 0
                return (
                  <tr key={c.id} className="border-b border-gray-50 dark:border-slate-700/50 hover:bg-gray-50 dark:hover:bg-slate-700/30">
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{c.nomePartner}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${TIPO_COLORI[c.tipo]}`}>
                        {TIPO_LABELS[c.tipo]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{c.struttura.nome}</td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400 whitespace-nowrap">
                      {fmtDate(c.dataInizio)} - {fmtDate(c.dataFine)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-2 bg-gray-100 dark:bg-slate-600 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-brand-500 rounded-full transition-all"
                            style={{ width: `${Math.min(pct, 100)}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                          {c.unitaVendute}/{c.unitaRiservate}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300">
                      {c.tariffaNegoziata != null ? fmt(c.tariffaNegoziata) : '-'}
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300">
                      {c.commissionePercentuale != null ? `${c.commissionePercentuale}%` : '-'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${STATO_COLORI[c.stato]}`}>
                        {c.stato}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => openEdit(c)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-slate-600 rounded-lg mr-1" title="Modifica">
                        <Pencil className="w-4 h-4 text-gray-500" />
                      </button>
                      <button onClick={() => handleDelete(c.id)} className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg" title="Elimina">
                        <Trash2 className="w-4 h-4 text-red-400" />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-slate-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {editId ? 'Modifica contratto' : 'Nuovo contratto'}
              </h2>
              <button onClick={() => { setShowForm(false); setEditId(null) }} className="p-1 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Partner */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Nome partner *</label>
                  <input className={inp} value={form.nomePartner} onChange={e => setForm(f => ({ ...f, nomePartner: e.target.value }))} required />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Tipo *</label>
                  <select className={inp} value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo: e.target.value as typeof form.tipo }))}>
                    {TIPI.map(t => <option key={t} value={t}>{TIPO_LABELS[t]}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Contatto</label>
                  <input className={inp} value={form.contatto} onChange={e => setForm(f => ({ ...f, contatto: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Email</label>
                  <input className={inp} type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Telefono</label>
                  <input className={inp} value={form.telefono} onChange={e => setForm(f => ({ ...f, telefono: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Struttura *</label>
                  <select className={inp} value={form.strutturaId} onChange={e => setForm(f => ({ ...f, strutturaId: e.target.value }))} required>
                    <option value="">Seleziona...</option>
                    {strutture.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
                  </select>
                </div>

                {/* Dates */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Data inizio *</label>
                  <input className={inp} type="date" value={form.dataInizio} onChange={e => setForm(f => ({ ...f, dataInizio: e.target.value }))} required />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Data fine *</label>
                  <input className={inp} type="date" value={form.dataFine} onChange={e => setForm(f => ({ ...f, dataFine: e.target.value }))} required />
                </div>

                {/* Allotment */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Unita riservate *</label>
                  <input className={inp} type="number" min="1" value={form.unitaRiservate} onChange={e => setForm(f => ({ ...f, unitaRiservate: e.target.value }))} required />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Unita vendute</label>
                  <input className={inp} type="number" min="0" value={form.unitaVendute} onChange={e => setForm(f => ({ ...f, unitaVendute: e.target.value }))} />
                </div>

                {/* Pricing */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Tariffa negoziata</label>
                  <input className={inp} type="number" step="0.01" min="0" value={form.tariffaNegoziata} onChange={e => setForm(f => ({ ...f, tariffaNegoziata: e.target.value }))} placeholder="EUR" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Sconto %</label>
                  <input className={inp} type="number" step="0.1" min="0" max="100" value={form.scontoPercentuale} onChange={e => setForm(f => ({ ...f, scontoPercentuale: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Commissione %</label>
                  <input className={inp} type="number" step="0.1" min="0" max="100" value={form.commissionePercentuale} onChange={e => setForm(f => ({ ...f, commissionePercentuale: e.target.value }))} />
                </div>

                {/* Policy */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Release (giorni)</label>
                  <input className={inp} type="number" min="0" value={form.releaseGiorni} onChange={e => setForm(f => ({ ...f, releaseGiorni: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Stato</label>
                  <select className={inp} value={form.stato} onChange={e => setForm(f => ({ ...f, stato: e.target.value as typeof form.stato }))}>
                    {STATI.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="flex items-center gap-2 sm:col-span-2">
                  <input
                    type="checkbox"
                    id="cancGratuita"
                    checked={form.cancellazioneGratuita}
                    onChange={e => setForm(f => ({ ...f, cancellazioneGratuita: e.target.checked }))}
                    className="w-4 h-4 rounded border-gray-300 text-brand-500 focus:ring-brand-400"
                  />
                  <label htmlFor="cancGratuita" className="text-sm text-gray-700 dark:text-gray-300">
                    Cancellazione gratuita consentita
                  </label>
                </div>
              </div>

              {/* Note */}
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Note</label>
                <textarea className={`${inp} h-20 resize-none`} value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} />
              </div>

              {errore && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                  <p className="text-sm text-red-700 dark:text-red-300">{errore}</p>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => { setShowForm(false); setEditId(null) }} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg">
                  Annulla
                </button>
                <button type="submit" disabled={saving} className="inline-flex items-center gap-2 px-5 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-lg text-sm font-medium disabled:opacity-50">
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  {editId ? 'Salva modifiche' : 'Crea contratto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
