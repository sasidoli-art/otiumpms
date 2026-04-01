'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { format } from 'date-fns'
import { it } from 'date-fns/locale'
import {
  Globe, Plus, X, Loader2, RefreshCw, CheckCircle2, AlertTriangle,
  Trash2, ExternalLink, Wifi, WifiOff,
} from 'lucide-react'

type Canale = {
  id: string
  nome: string
  urlIcal: string
  attivo: boolean
  colore: string
  ultimoSync: string | null
  ultimoSyncOk: boolean
  ultimoSyncError: string | null
  eventiImportati: number
  struttura: { nome: string }
  unita: { nome: string } | null
  _count: { prenotazioniImportate: number }
  createdAt: string
}

const inp = 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-brand-400 focus:ring-1 focus:ring-brand-400 outline-none dark:bg-slate-800 dark:border-slate-600 dark:text-slate-200'

const OTA_PRESETS = [
  { nome: 'Booking.com', colore: '#003580', placeholder: 'https://admin.booking.com/hotel/hoteladmin/ical.html?t=...' },
  { nome: 'Airbnb', colore: '#ff5a5f', placeholder: 'https://www.airbnb.com/calendar/ical/XXXXX.ics?s=...' },
  { nome: 'VRBO / HomeAway', colore: '#1a6ee0', placeholder: 'https://www.vrbo.com/icalendar/...' },
  { nome: 'Google Calendar', colore: '#4285f4', placeholder: 'https://calendar.google.com/calendar/ical/.../basic.ics' },
  { nome: 'Altro', colore: '#6b7280', placeholder: 'https://...' },
]

export default function CanaliBoard() {
  const [canali, setCanali] = useState<Canale[]>([])
  const [strutture, setStrutture] = useState<{ id: string; nome: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [syncing, setSyncing] = useState<string | null>(null)
  const [errore, setErrore] = useState<string | null>(null)

  const [form, setForm] = useState({
    strutturaId: '', nome: 'Booking.com', urlIcal: '', colore: '#003580',
  })

  async function carica() {
    setLoading(true)
    const [cRes, sRes] = await Promise.all([
      fetch('/api/host/canali'),
      fetch('/api/host/strutture'),
    ])
    if (cRes.ok) setCanali(await cRes.json())
    if (sRes.ok) {
      const data = await sRes.json()
      if (Array.isArray(data)) setStrutture(data.map((s: { id: string; nome: string }) => ({ id: s.id, nome: s.nome })))
    }
    setLoading(false)
  }

  useEffect(() => { carica() }, [])

  function selectPreset(nome: string) {
    const preset = OTA_PRESETS.find(p => p.nome === nome)
    if (preset) setForm(f => ({ ...f, nome: preset.nome, colore: preset.colore }))
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!form.strutturaId || !form.urlIcal.trim()) { setErrore('Struttura e URL obbligatori'); return }
    setSaving(true); setErrore(null)
    const res = await fetch('/api/host/canali', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form),
    })
    if (res.ok) {
      setForm({ strutturaId: '', nome: 'Booking.com', urlIcal: '', colore: '#003580' })
      setShowForm(false); carica()
    } else { const j = await res.json().catch(() => ({})); setErrore(j.error || 'Errore') }
    setSaving(false)
  }

  async function syncCanale(id: string) {
    setSyncing(id); setErrore(null)
    const res = await fetch(`/api/host/canali/${id}/sync`, { method: 'POST' })
    if (!res.ok) { const j = await res.json().catch(() => ({})); setErrore(j.error || 'Sync fallito') }
    setSyncing(null); carica()
  }

  async function deleteCanale(id: string) {
    await fetch(`/api/host/canali/${id}`, { method: 'DELETE' })
    carica()
  }

  async function toggleAttivo(id: string, attivo: boolean) {
    await fetch(`/api/host/canali/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ attivo }),
    })
    carica()
  }

  return (
    <div className="space-y-6">
      <div className="page-title-box">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <Globe className="w-6 h-6 text-brand-500" /> Channel Manager
          </h1>
          <p className="text-sm text-gray-500">Sincronizza prenotazioni da Booking.com, Airbnb e altri canali</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Aggiungi canale
        </button>
      </div>

      {/* Info */}
      <div className="card bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800 text-sm text-blue-800 dark:text-blue-300 space-y-1">
        <p className="font-semibold">Come funziona</p>
        <p className="text-xs">1. Copia l'URL del feed iCal dal portale dell'OTA (Booking, Airbnb, ecc.)</p>
        <p className="text-xs">2. Incollalo qui — il sistema importa automaticamente le date occupate</p>
        <p className="text-xs">3. Per esportare le tue prenotazioni verso gli OTA, usa l'URL iCal dalla pagina Strutture</p>
      </div>

      {errore && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
          <AlertTriangle className="w-4 h-4" /> {errore}
          <button onClick={() => setErrore(null)} className="ml-auto"><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* Form nuovo canale */}
      {showForm && (
        <form onSubmit={handleAdd} className="card border-brand-200 space-y-3">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-slate-100">Nuovo canale</h3>
          <div className="flex flex-wrap gap-2">
            {OTA_PRESETS.map(p => (
              <button key={p.nome} type="button" onClick={() => selectPreset(p.nome)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${form.nome === p.nome ? 'text-white' : 'border-gray-200 text-gray-600 hover:bg-gray-50 dark:border-slate-600 dark:text-slate-300'}`}
                style={form.nome === p.nome ? { backgroundColor: p.colore, borderColor: p.colore } : undefined}
              >{p.nome}</button>
            ))}
          </div>
          <select value={form.strutturaId} onChange={e => setForm(f => ({ ...f, strutturaId: e.target.value }))} className={inp} required>
            <option value="">Seleziona struttura...</option>
            {strutture.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
          </select>
          <input type="url" value={form.urlIcal} onChange={e => setForm(f => ({ ...f, urlIcal: e.target.value }))}
            placeholder={OTA_PRESETS.find(p => p.nome === form.nome)?.placeholder || 'URL feed iCal...'}
            className={inp} required />
          <div className="flex gap-2">
            <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2 text-sm">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Aggiungi
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="btn-secondary text-sm">Annulla</button>
          </div>
        </form>
      )}

      {/* Lista canali */}
      {loading ? (
        <div className="card py-12 flex items-center justify-center text-gray-400"><Loader2 className="w-6 h-6 animate-spin" /></div>
      ) : canali.length === 0 ? (
        <div className="card py-12 flex flex-col items-center gap-2 text-gray-300">
          <Globe className="w-10 h-10 opacity-30" />
          <p className="text-sm">Nessun canale collegato</p>
          <button onClick={() => setShowForm(true)} className="text-sm text-brand-500 hover:underline">Collega il primo canale</button>
        </div>
      ) : (
        <div className="space-y-3">
          {canali.map(c => (
            <div key={c.id} className="card flex items-center gap-4">
              {/* Pallino colore */}
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: c.colore + '20' }}>
                <Globe className="w-5 h-5" style={{ color: c.colore }} />
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold text-gray-900 dark:text-slate-100">{c.nome}</span>
                  <span className="text-xs text-gray-400 bg-gray-100 dark:bg-slate-700 px-2 py-0.5 rounded">{c.struttura.nome}{c.unita ? ` · ${c.unita.nome}` : ''}</span>
                  {c.attivo ? (
                    <span className="text-[10px] text-green-600 bg-green-50 dark:bg-green-900/30 px-1.5 py-0.5 rounded flex items-center gap-1"><Wifi className="w-3 h-3" /> Attivo</span>
                  ) : (
                    <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded flex items-center gap-1"><WifiOff className="w-3 h-3" /> Disattivo</span>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                  {c.ultimoSync && (
                    <span className="flex items-center gap-1">
                      {c.ultimoSyncOk ? <CheckCircle2 className="w-3 h-3 text-green-500" /> : <AlertTriangle className="w-3 h-3 text-red-500" />}
                      Sync: {format(new Date(c.ultimoSync), 'd MMM HH:mm', { locale: it })}
                    </span>
                  )}
                  <span>{c._count.prenotazioniImportate} eventi importati</span>
                </div>
                {c.ultimoSyncError && <p className="text-[10px] text-red-500 mt-0.5">{c.ultimoSyncError}</p>}
              </div>

              {/* Azioni */}
              <div className="flex items-center gap-1.5 shrink-0">
                <button onClick={() => syncCanale(c.id)} disabled={syncing === c.id}
                  className="p-2 rounded-lg border border-gray-200 dark:border-slate-600 text-gray-400 hover:text-brand-500 hover:border-brand-300 transition-colors"
                  title="Sincronizza ora">
                  {syncing === c.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                </button>
                <button onClick={() => toggleAttivo(c.id, !c.attivo)}
                  className={`p-2 rounded-lg border transition-colors ${c.attivo ? 'border-green-200 text-green-500 hover:bg-green-50' : 'border-gray-200 text-gray-300 hover:text-green-500'}`}
                  title={c.attivo ? 'Disattiva' : 'Attiva'}>
                  {c.attivo ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
                </button>
                <button onClick={() => deleteCanale(c.id)}
                  className="p-2 rounded-lg border border-gray-200 dark:border-slate-600 text-gray-300 hover:text-red-500 hover:border-red-200 transition-colors"
                  title="Elimina">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
