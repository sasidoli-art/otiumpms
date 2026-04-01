'use client'

import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { useTranslations } from 'next-intl'
import { it } from 'date-fns/locale'
import {
  Bell, Plus, X, Loader2, CheckCircle2, Clock, AlertTriangle,
  ChevronDown, ChevronUp, Trash2, User,
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
  noteRisoluzione: string | null
  createdAt: string
}

const REPARTI = [
  { value: 'RECEPTION', label: 'Reception', color: 'bg-blue-100 text-blue-700' },
  { value: 'HOUSEKEEPING', label: 'Housekeeping', color: 'bg-green-100 text-green-700' },
  { value: 'MANUTENZIONE', label: 'Manutenzione', color: 'bg-orange-100 text-orange-700' },
  { value: 'SPA', label: 'SPA', color: 'bg-purple-100 text-purple-700' },
  { value: 'RISTORANTE', label: 'Ristorante', color: 'bg-amber-100 text-amber-700' },
  { value: 'DIREZIONE', label: 'Direzione', color: 'bg-gray-100 text-gray-700' },
  { value: 'ALTRO', label: 'Altro', color: 'bg-gray-100 text-gray-500' },
]

const PRIORITA = {
  URGENTE: { label: 'Urgente', cls: 'text-red-600 bg-red-50' },
  ALTA: { label: 'Alta', cls: 'text-orange-600 bg-orange-50' },
  NORMALE: { label: 'Normale', cls: 'text-blue-600 bg-blue-50' },
  BASSA: { label: 'Bassa', cls: 'text-gray-500 bg-gray-50' },
}

const TRIGGER_LABELS: Record<string, string> = {
  CHECKIN: 'Al check-in',
  CHECKOUT: 'Al check-out',
  ARRIVO_GIORNO: 'Giorno arrivo',
}

const inp = 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-brand-400 focus:ring-1 focus:ring-brand-400 outline-none'

export default function TracesSection({ prenotazioneId }: { prenotazioneId: string }) {
  const [traces, setTraces] = useState<Trace[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [errore, setErrore] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState({
    titolo: '', descrizione: '', reparto: 'RECEPTION', priorita: 'NORMALE',
    dataScadenza: '', oraScadenza: '', assegnatoA: '', triggerEvento: '',
  })

  useEffect(() => {
    fetch(`/api/host/traces?prenotazioneId=${prenotazioneId}`)
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(d => setTraces(d.traces))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [prenotazioneId])

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!form.titolo.trim()) { setErrore('Titolo obbligatorio'); return }
    setSaving(true); setErrore(null)
    try {
      const res = await fetch('/api/host/traces', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, prenotazioneId, triggerEvento: form.triggerEvento || null }),
      })
      if (!res.ok) { const j = await res.json().catch(() => ({})); setErrore(j.error || 'Errore'); setSaving(false); return }
      const trace = await res.json()
      setTraces(prev => [trace, ...prev])
      setForm({ titolo: '', descrizione: '', reparto: 'RECEPTION', priorita: 'NORMALE', dataScadenza: '', oraScadenza: '', assegnatoA: '', triggerEvento: '' })
      setShowForm(false)
    } catch { setErrore('Errore di rete') }
    setSaving(false)
  }

  async function updateStato(id: string, stato: string) {
    const res = await fetch(`/api/host/traces/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stato }),
    })
    if (res.ok) {
      const updated = await res.json()
      setTraces(prev => prev.map(t => t.id === id ? updated : t))
    }
  }

  async function deleteTrace(id: string) {
    const res = await fetch(`/api/host/traces/${id}`, { method: 'DELETE' })
    if (res.ok) setTraces(prev => prev.filter(t => t.id !== id))
  }

  const aperti = traces.filter(t => t.stato === 'APERTO' || t.stato === 'IN_CORSO')
  const completati = traces.filter(t => t.stato === 'COMPLETATO' || t.stato === 'ANNULLATO')

  if (loading) return <div className="card py-6 flex items-center justify-center text-gray-400"><Loader2 className="w-5 h-5 animate-spin mr-2" /> Caricamento...</div>

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-brand-500" />
          <h2 className="text-base font-semibold text-gray-900">Promemoria</h2>
          {aperti.length > 0 && (
            <span className="text-xs font-bold text-white bg-brand-500 rounded-full w-5 h-5 flex items-center justify-center">{aperti.length}</span>
          )}
        </div>
        {!showForm && (
          <button onClick={() => setShowForm(true)} className="flex items-center gap-1 text-xs font-medium text-brand-600 border border-brand-200 rounded-lg px-2.5 py-1.5 hover:bg-brand-50">
            <Plus className="w-3.5 h-3.5" /> Nuovo
          </button>
        )}
      </div>

      {errore && (
        <div className="flex items-center gap-2 px-3 py-2 mb-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
          <AlertTriangle className="w-3.5 h-3.5" /> {errore}
          <button onClick={() => setErrore(null)} className="ml-auto"><X className="w-3.5 h-3.5" /></button>
        </div>
      )}

      {/* Form nuovo trace */}
      {showForm && (
        <form onSubmit={handleAdd} className="mb-4 p-3 border border-brand-200 rounded-lg bg-brand-50/30 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-900">Nuovo promemoria</span>
            <button type="button" onClick={() => setShowForm(false)} className="p-1 hover:bg-gray-100 rounded"><X className="w-4 h-4 text-gray-400" /></button>
          </div>
          <input type="text" value={form.titolo} onChange={e => setForm(f => ({ ...f, titolo: e.target.value }))} placeholder="Es: Preparare culla, VIP amenities, allergia noci..." className={inp} required />
          <textarea rows={2} value={form.descrizione} onChange={e => setForm(f => ({ ...f, descrizione: e.target.value }))} placeholder="Dettagli..." className={inp} />
          <div className="grid grid-cols-2 gap-2">
            <select value={form.reparto} onChange={e => setForm(f => ({ ...f, reparto: e.target.value }))} className={inp}>
              {REPARTI.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
            <select value={form.priorita} onChange={e => setForm(f => ({ ...f, priorita: e.target.value }))} className={inp}>
              <option value="URGENTE">Urgente</option>
              <option value="ALTA">Alta</option>
              <option value="NORMALE">Normale</option>
              <option value="BASSA">Bassa</option>
            </select>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <input type="date" value={form.dataScadenza} onChange={e => setForm(f => ({ ...f, dataScadenza: e.target.value }))} className={inp} placeholder="Scadenza" />
            <input type="time" value={form.oraScadenza} onChange={e => setForm(f => ({ ...f, oraScadenza: e.target.value }))} className={inp} />
            <select value={form.triggerEvento} onChange={e => setForm(f => ({ ...f, triggerEvento: e.target.value }))} className={inp}>
              <option value="">Nessun trigger</option>
              <option value="CHECKIN">Al check-in</option>
              <option value="CHECKOUT">Al check-out</option>
              <option value="ARRIVO_GIORNO">Giorno arrivo</option>
            </select>
          </div>
          <input type="text" value={form.assegnatoA} onChange={e => setForm(f => ({ ...f, assegnatoA: e.target.value }))} placeholder="Assegnato a (opzionale)" className={inp} />
          <button type="submit" disabled={saving} className="w-full btn-primary flex items-center justify-center gap-2 py-2 text-sm">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            {saving ? 'Salvo...' : 'Aggiungi promemoria'}
          </button>
        </form>
      )}

      {/* Lista aperti */}
      {aperti.length === 0 && completati.length === 0 && !showForm && (
        <p className="text-sm text-gray-400 italic py-2">Nessun promemoria per questa prenotazione.</p>
      )}

      <div className="space-y-2">
        {aperti.map(t => {
          const rep = REPARTI.find(r => r.value === t.reparto)
          const prio = PRIORITA[t.priorita as keyof typeof PRIORITA] || PRIORITA.NORMALE
          const scaduto = t.dataScadenza && new Date(t.dataScadenza) < new Date() && t.stato !== 'COMPLETATO'

          return (
            <div key={t.id} className={`border rounded-lg overflow-hidden ${scaduto ? 'border-red-300 bg-red-50/30' : 'border-gray-200'}`}>
              <div className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-gray-50" onClick={() => setExpandedId(expandedId === t.id ? null : t.id)}>
                <button onClick={e => { e.stopPropagation(); updateStato(t.id, 'COMPLETATO') }} className="p-0.5 text-gray-300 hover:text-green-500" title="Completa">
                  <CheckCircle2 className="w-4 h-4" />
                </button>
                <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${prio.cls}`}>{prio.label}</span>
                <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${rep?.color || ''}`}>{rep?.label}</span>
                <span className="flex-1 text-sm font-medium text-gray-900 truncate">{t.titolo}</span>
                {t.triggerEvento && <span className="text-[10px] text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded">{TRIGGER_LABELS[t.triggerEvento]}</span>}
                {scaduto && <AlertTriangle className="w-3.5 h-3.5 text-red-500" />}
                {t.dataScadenza && <span className="text-[10px] text-gray-400">{format(new Date(t.dataScadenza), 'd/MM', { locale: it })}</span>}
                {expandedId === t.id ? <ChevronUp className="w-3.5 h-3.5 text-gray-400" /> : <ChevronDown className="w-3.5 h-3.5 text-gray-400" />}
              </div>

              {expandedId === t.id && (
                <div className="px-3 pb-3 border-t border-gray-100 bg-gray-50 text-xs space-y-2 pt-2">
                  {t.descrizione && <p className="text-gray-600">{t.descrizione}</p>}
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-gray-500">
                    {t.assegnatoA && <span className="flex items-center gap-1"><User className="w-3 h-3" /> {t.assegnatoA}</span>}
                    {t.oraScadenza && <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> Entro le {t.oraScadenza}</span>}
                    {t.creatoDa && <span>Creato da: {t.creatoDa}</span>}
                    <span>{format(new Date(t.createdAt), 'd MMM HH:mm', { locale: it })}</span>
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button onClick={() => updateStato(t.id, 'COMPLETATO')} className="text-xs text-green-600 hover:text-green-800 font-medium">Completa</button>
                    <button onClick={() => updateStato(t.id, 'IN_CORSO')} className="text-xs text-blue-600 hover:text-blue-800 font-medium">In corso</button>
                    <button onClick={() => updateStato(t.id, 'ANNULLATO')} className="text-xs text-gray-400 hover:text-gray-600 font-medium">Annulla</button>
                    <button onClick={() => deleteTrace(t.id)} className="text-xs text-red-400 hover:text-red-600 ml-auto flex items-center gap-1"><Trash2 className="w-3 h-3" /> Elimina</button>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Completati (collapsati) */}
      {completati.length > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <p className="text-[10px] font-semibold text-gray-400 uppercase mb-2">Completati ({completati.length})</p>
          {completati.slice(0, 3).map(t => (
            <div key={t.id} className="flex items-center gap-2 text-xs text-gray-400 py-1">
              <CheckCircle2 className="w-3 h-3 text-green-400" />
              <span className="line-through">{t.titolo}</span>
              {t.completatoDa && <span className="ml-auto">da {t.completatoDa}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
