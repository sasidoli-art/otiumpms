'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { format } from 'date-fns'
import { it } from 'date-fns/locale'
import Link from 'next/link'
import {
  Bell, Plus, X, Loader2, CheckCircle2, Clock, AlertTriangle,
  Filter, RefreshCw, User, Search, ChevronDown,
} from 'lucide-react'

type Trace = {
  id: string
  titolo: string
  descrizione: string | null
  reparto: string
  priorita: string
  stato: string
  dataScadenza: string | null
  oraScadenza: string | null
  assegnatoA: string | null
  creatoDa: string | null
  triggerEvento: string | null
  completatoAt: string | null
  completatoDa: string | null
  createdAt: string
  prenotazione: {
    id: string
    guestNome: string
    guestCognome: string
    dataArrivo: string
    stato: string
    unita: { nome: string } | null
  } | null
}

type Kpi = { aperti: number; inCorso: number; completati: number; scadutiOggi: number }

const REPARTI = [
  { value: 'RECEPTION', label: 'Reception', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  { value: 'HOUSEKEEPING', label: 'Housekeeping', color: 'bg-green-100 text-green-700 border-green-200' },
  { value: 'MANUTENZIONE', label: 'Manutenzione', color: 'bg-orange-100 text-orange-700 border-orange-200' },
  { value: 'SPA', label: 'SPA', color: 'bg-purple-100 text-purple-700 border-purple-200' },
  { value: 'RISTORANTE', label: 'Ristorante', color: 'bg-amber-100 text-amber-700 border-amber-200' },
  { value: 'DIREZIONE', label: 'Direzione', color: 'bg-gray-100 text-gray-700 border-gray-200' },
  { value: 'ALTRO', label: 'Altro', color: 'bg-gray-50 text-gray-500 border-gray-200' },
]

const PRIORITA: Record<string, { label: string; cls: string }> = {
  URGENTE: { label: 'Urgente', cls: 'text-red-600 bg-red-50 border-red-200' },
  ALTA: { label: 'Alta', cls: 'text-orange-600 bg-orange-50 border-orange-200' },
  NORMALE: { label: 'Normale', cls: 'text-blue-600 bg-blue-50 border-blue-200' },
  BASSA: { label: 'Bassa', cls: 'text-gray-500 bg-gray-50 border-gray-200' },
}

const TRIGGER_LABELS: Record<string, string> = {
  CHECKIN: 'Al check-in',
  CHECKOUT: 'Al check-out',
  ARRIVO_GIORNO: 'Giorno arrivo',
}

const inp = 'px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:border-brand-400 focus:ring-1 focus:ring-brand-400 outline-none'

export default function PromemoriaBoard() {
  const [traces, setTraces] = useState<Trace[]>([])
  const [kpi, setKpi] = useState<Kpi>({ aperti: 0, inCorso: 0, completati: 0, scadutiOggi: 0 })
  const [loading, setLoading] = useState(true)
  const [filtroStato, setFiltroStato] = useState('APERTO')
  const [filtroReparto, setFiltroReparto] = useState('')
  const [q, setQ] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [errore, setErrore] = useState<string | null>(null)

  const [form, setForm] = useState({
    titolo: '', descrizione: '', reparto: 'RECEPTION', priorita: 'NORMALE',
    dataScadenza: '', oraScadenza: '', assegnatoA: '', triggerEvento: '',
  })

  const carica = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (filtroStato) params.set('stato', filtroStato)
    if (filtroReparto) params.set('reparto', filtroReparto)
    const res = await fetch(`/api/host/traces?${params}`)
    if (res.ok) {
      const data = await res.json()
      setTraces(data.traces)
      setKpi(data.kpi)
    }
    setLoading(false)
  }, [filtroStato, filtroReparto])

  useEffect(() => { carica() }, [carica])

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!form.titolo.trim()) return
    setSaving(true); setErrore(null)
    const res = await fetch('/api/host/traces', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, triggerEvento: form.triggerEvento || null }),
    })
    if (res.ok) {
      setForm({ titolo: '', descrizione: '', reparto: 'RECEPTION', priorita: 'NORMALE', dataScadenza: '', oraScadenza: '', assegnatoA: '', triggerEvento: '' })
      setShowForm(false)
      carica()
    } else {
      const j = await res.json().catch(() => ({}))
      setErrore(j.error || 'Errore')
    }
    setSaving(false)
  }

  async function updateStato(id: string, stato: string) {
    await fetch(`/api/host/traces/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stato }),
    })
    carica()
  }

  const filtrate = traces.filter(t => {
    if (q && !t.titolo.toLowerCase().includes(q.toLowerCase()) && !t.descrizione?.toLowerCase().includes(q.toLowerCase())) return false
    return true
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="page-title-box">
        <div>
          <h1 className="page-title">Promemoria Operativi</h1>
          <p className="text-sm text-gray-500">Task e promemoria per lo staff, collegabili alle prenotazioni</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Nuovo promemoria
        </button>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Aperti', val: kpi.aperti, color: 'text-blue-600', bg: 'bg-blue-50', stato: 'APERTO' },
          { label: 'In corso', val: kpi.inCorso, color: 'text-amber-600', bg: 'bg-amber-50', stato: 'IN_CORSO' },
          { label: 'Scaduti oggi', val: kpi.scadutiOggi, color: 'text-red-600', bg: 'bg-red-50', stato: '' },
          { label: 'Completati', val: kpi.completati, color: 'text-green-600', bg: 'bg-green-50', stato: 'COMPLETATO' },
        ].map(k => (
          <button
            key={k.label}
            onClick={() => k.stato && setFiltroStato(filtroStato === k.stato ? '' : k.stato)}
            className={`card flex flex-col items-center py-3 transition-all ${filtroStato === k.stato ? 'ring-2 ring-brand-500' : ''} ${k.stato ? 'cursor-pointer hover:shadow-md' : 'cursor-default'}`}
          >
            <span className={`text-2xl font-extrabold ${k.color}`}>{k.val}</span>
            <span className="text-xs text-gray-500 mt-0.5">{k.label}</span>
          </button>
        ))}
      </div>

      {/* Errore */}
      {errore && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
          <AlertTriangle className="w-4 h-4" /> {errore}
          <button onClick={() => setErrore(null)} className="ml-auto"><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* Form nuovo */}
      {showForm && (
        <form onSubmit={handleAdd} className="card border-brand-200 bg-brand-50/20 space-y-3">
          <h3 className="text-sm font-semibold text-gray-900">Nuovo promemoria</h3>
          <input type="text" value={form.titolo} onChange={e => setForm(f => ({ ...f, titolo: e.target.value }))} placeholder="Titolo..." className={`w-full ${inp}`} required />
          <textarea rows={2} value={form.descrizione} onChange={e => setForm(f => ({ ...f, descrizione: e.target.value }))} placeholder="Dettagli..." className={`w-full ${inp}`} />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <select value={form.reparto} onChange={e => setForm(f => ({ ...f, reparto: e.target.value }))} className={inp}>
              {REPARTI.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
            <select value={form.priorita} onChange={e => setForm(f => ({ ...f, priorita: e.target.value }))} className={inp}>
              {['URGENTE', 'ALTA', 'NORMALE', 'BASSA'].map(p => <option key={p} value={p}>{p}</option>)}
            </select>
            <input type="date" value={form.dataScadenza} onChange={e => setForm(f => ({ ...f, dataScadenza: e.target.value }))} className={inp} />
            <input type="text" value={form.assegnatoA} onChange={e => setForm(f => ({ ...f, assegnatoA: e.target.value }))} placeholder="Assegnato a" className={inp} />
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2 text-sm">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              {saving ? 'Salvo...' : 'Aggiungi'}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="btn-secondary text-sm">Annulla</button>
          </div>
        </form>
      )}

      {/* Filtri */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" value={q} onChange={e => setQ(e.target.value)} placeholder="Cerca promemoria..." className={`w-full pl-9 ${inp}`} />
        </div>
        <select value={filtroReparto} onChange={e => setFiltroReparto(e.target.value)} className={inp}>
          <option value="">Tutti i reparti</option>
          {REPARTI.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
        </select>
        <button onClick={carica} className="p-2 rounded-lg border border-gray-200 text-gray-400 hover:text-gray-600 hover:bg-gray-50">
          <RefreshCw className="w-4 h-4" />
        </button>
        <span className="text-xs text-gray-400 ml-auto">{filtrate.length} risultati</span>
      </div>

      {/* Lista */}
      {loading ? (
        <div className="card py-12 flex items-center justify-center text-gray-400"><Loader2 className="w-6 h-6 animate-spin mr-2" /> Caricamento...</div>
      ) : filtrate.length === 0 ? (
        <div className="card py-12 flex flex-col items-center gap-2 text-gray-300">
          <Bell className="w-10 h-10 opacity-30" />
          <p className="text-sm">Nessun promemoria</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtrate.map(t => {
            const rep = REPARTI.find(r => r.value === t.reparto)
            const prio = PRIORITA[t.priorita] || PRIORITA.NORMALE
            const scaduto = t.dataScadenza && new Date(t.dataScadenza) < new Date() && t.stato !== 'COMPLETATO' && t.stato !== 'ANNULLATO'

            return (
              <div key={t.id} className={`card border-l-4 flex items-start gap-3 ${scaduto ? 'border-l-red-400 bg-red-50/30' : t.priorita === 'URGENTE' ? 'border-l-red-400' : t.priorita === 'ALTA' ? 'border-l-orange-400' : 'border-l-brand-400'}`}>
                {/* Checkbox completamento */}
                <button
                  onClick={() => updateStato(t.id, t.stato === 'COMPLETATO' ? 'APERTO' : 'COMPLETATO')}
                  className={`mt-0.5 shrink-0 ${t.stato === 'COMPLETATO' ? 'text-green-500' : 'text-gray-300 hover:text-green-500'}`}
                >
                  <CheckCircle2 className="w-5 h-5" />
                </button>

                {/* Contenuto */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${prio.cls}`}>{prio.label}</span>
                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${rep?.color}`}>{rep?.label}</span>
                    {t.triggerEvento && <span className="text-[10px] text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded">{TRIGGER_LABELS[t.triggerEvento]}</span>}
                    {scaduto && <span className="text-[10px] text-red-600 bg-red-100 px-1.5 py-0.5 rounded font-semibold flex items-center gap-0.5"><AlertTriangle className="w-3 h-3" /> Scaduto</span>}
                  </div>
                  <p className={`text-sm font-medium ${t.stato === 'COMPLETATO' ? 'text-gray-400 line-through' : 'text-gray-900'}`}>{t.titolo}</p>
                  {t.descrizione && <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{t.descrizione}</p>}
                  <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-400 flex-wrap">
                    {t.prenotazione && (
                      <Link href={`/host/prenotazioni/${t.prenotazione.id}`} className="text-brand-600 hover:underline font-medium">
                        {t.prenotazione.guestNome} {t.prenotazione.guestCognome}
                        {t.prenotazione.unita && ` · ${t.prenotazione.unita.nome}`}
                      </Link>
                    )}
                    {t.assegnatoA && <span className="flex items-center gap-1"><User className="w-3 h-3" /> {t.assegnatoA}</span>}
                    {t.dataScadenza && <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {format(new Date(t.dataScadenza), 'd MMM', { locale: it })}{t.oraScadenza ? ` ${t.oraScadenza}` : ''}</span>}
                    <span>{format(new Date(t.createdAt), 'd MMM HH:mm', { locale: it })}</span>
                  </div>
                </div>

                {/* Azioni rapide */}
                <div className="flex items-center gap-1 shrink-0">
                  {t.stato !== 'COMPLETATO' && t.stato !== 'IN_CORSO' && (
                    <button onClick={() => updateStato(t.id, 'IN_CORSO')} className="text-[10px] text-blue-600 hover:text-blue-800 px-2 py-1 rounded border border-blue-200 hover:bg-blue-50">In corso</button>
                  )}
                  {t.stato !== 'COMPLETATO' && (
                    <button onClick={() => updateStato(t.id, 'COMPLETATO')} className="text-[10px] text-green-600 hover:text-green-800 px-2 py-1 rounded border border-green-200 hover:bg-green-50">Fatto</button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
