'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { it } from 'date-fns/locale'
import {
  Plus, Wrench, Zap, Droplets, DoorOpen, Armchair, Star,
  CheckCircle2, Clock, AlertTriangle, Loader2, X, Filter,
  ChevronDown, Trash2, Pencil, RefreshCw, Search
} from 'lucide-react'
import { useTranslations } from 'next-intl'

// ─── Tipi ─────────────────────────────────────────────────────────────────────

type Struttura = { id: string; nome: string }

type Segnalazione = {
  id: string
  titolo: string
  descrizione: string | null
  categoria: string
  stato: string
  priorita: string
  assegnatoA: string | null
  costoStimato: number | null
  costoReale: number | null
  note: string | null
  dataScadenza: string | null
  dataRisoluzione: string | null
  immagineUrl: string | null
  createdAt: string
  struttura: { id: string; nome: string } | null
  unita: { id: string; nome: string } | null
}

// ─── Config ────────────────────────────────────────────────────────────────────

const STATI: Record<string, { label: string; bg: string; text: string; border: string; icon: React.ReactNode }> = {
  APERTA:           { label: 'Aperta',            bg: 'bg-red-50',    text: 'text-red-700',    border: 'border-red-200',   icon: <AlertTriangle className="w-4 h-4 text-red-500" /> },
  IN_LAVORAZIONE:   { label: 'In lavorazione',    bg: 'bg-blue-50',   text: 'text-blue-700',   border: 'border-blue-200',  icon: <Wrench className="w-4 h-4 text-blue-500" /> },
  IN_ATTESA_PARTI:  { label: 'Attesa ricambi',    bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200',icon: <Clock className="w-4 h-4 text-yellow-500" /> },
  RISOLTA:          { label: 'Risolta',            bg: 'bg-green-50',  text: 'text-green-700',  border: 'border-green-200', icon: <CheckCircle2 className="w-4 h-4 text-green-500" /> },
  ANNULLATA:        { label: 'Annullata',          bg: 'bg-gray-100',  text: 'text-gray-500',   border: 'border-gray-200',  icon: <X className="w-4 h-4 text-gray-400" /> },
}

const PRIORITA: Record<string, { label: string; cls: string }> = {
  URGENTE: { label: 'Urgente', cls: 'text-red-600 bg-red-50 border-red-200' },
  ALTA:    { label: 'Alta',    cls: 'text-orange-600 bg-orange-50 border-orange-200' },
  NORMALE: { label: 'Normale', cls: 'text-blue-600 bg-blue-50 border-blue-200' },
  BASSA:   { label: 'Bassa',   cls: 'text-gray-500 bg-gray-50 border-gray-200' },
}

const CATEGORIE = [
  { val: 'IDRAULICA',       label: 'Idraulica',           icon: <Droplets className="w-4 h-4" /> },
  { val: 'ELETTRICA',       label: 'Elettrica',           icon: <Zap className="w-4 h-4" /> },
  { val: 'SERRATURA',       label: 'Serratura/Accessi',   icon: <DoorOpen className="w-4 h-4" /> },
  { val: 'ARREDO',          label: 'Arredo/Struttura',    icon: <Armchair className="w-4 h-4" /> },
  { val: 'PULIZIA_STRAORD', label: 'Pulizia straord.',    icon: <Star className="w-4 h-4" /> },
  { val: 'ALTRO',           label: 'Altro',               icon: <Wrench className="w-4 h-4" /> },
]

// ─── Componente ───────────────────────────────────────────────────────────────

export default function ManutenzioneBoard({
  strutture,
  segnalazioniIniziali,
}: {
  strutture: Struttura[]
  segnalazioniIniziali: Segnalazione[]
}) {
  const t = useTranslations('host.maintenance')
  const tc = useTranslations('common')
  const [segnalazioni, setSegnalazioni] = useState<Segnalazione[]>(segnalazioniIniziali)
  const [filtroStato, setFiltroStato] = useState('all')
  const [filtroStruttura, setFiltroStruttura] = useState('all')
  const [q, setQ] = useState('')
  const [modalAperto, setModalAperto] = useState(false)
  const [detailId, setDetailId] = useState<string | null>(null)
  const [errore, setErrore] = useState<string | null>(null)

  const filtrate = segnalazioni.filter(s => {
    if (filtroStato !== 'all' && s.stato !== filtroStato) return false
    if (filtroStruttura !== 'all' && s.struttura?.id !== filtroStruttura) return false
    if (q && !s.titolo.toLowerCase().includes(q.toLowerCase()) && !s.descrizione?.toLowerCase().includes(q.toLowerCase())) return false
    return true
  })

  // KPI
  const aperte = segnalazioni.filter(s => s.stato === 'APERTA').length
  const inLav = segnalazioni.filter(s => s.stato === 'IN_LAVORAZIONE').length
  const risolte = segnalazioni.filter(s => s.stato === 'RISOLTA').length
  const urgenti = segnalazioni.filter(s => s.priorita === 'URGENTE' && s.stato !== 'RISOLTA' && s.stato !== 'ANNULLATA').length

  async function aggiornaStato(id: string, nuovoStato: string) {
    setErrore(null)
    try {
      const res = await fetch(`/api/host/manutenzione/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stato: nuovoStato }),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        setErrore(j.error || `Errore aggiornamento stato (${res.status})`)
        return
      }
      const ag = await res.json()
      setSegnalazioni(prev => prev.map(s => s.id === id ? {
        ...s, stato: ag.stato,
        dataRisoluzione: ag.dataRisoluzione?.toString() ?? null,
      } : s))
    } catch (err) { console.error(err) 
      setErrore('Errore di rete. Controlla la connessione e riprova.')
    }
  }

  async function elimina(id: string) {
    setErrore(null)
    try {
      const res = await fetch(`/api/host/manutenzione/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        setErrore(j.error || `Errore eliminazione (${res.status})`)
        return
      }
      setSegnalazioni(prev => prev.filter(s => s.id !== id))
    } catch (err) { console.error(err) 
      setErrore('Errore di rete. Controlla la connessione e riprova.')
    }
  }

  function onCreata(seg: Segnalazione) {
    setSegnalazioni(prev => [seg, ...prev])
    setModalAperto(false)
  }

  const detailSeg = segnalazioni.find(s => s.id === detailId) ?? null

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="page-title-box">
        <div>
          <h1 className="page-title">{t('title')}</h1>
          <p className="text-sm text-gray-500">{t('subtitle')}</p>
        </div>
        <button onClick={() => setModalAperto(true)} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> {t('newReport')}
        </button>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Aperte', val: aperte, color: 'text-red-600', bg: 'bg-red-50', stato: 'APERTA' },
          { label: 'In lavorazione', val: inLav, color: 'text-blue-600', bg: 'bg-blue-50', stato: 'IN_LAVORAZIONE' },
          { label: 'Urgenti', val: urgenti, color: 'text-orange-600', bg: 'bg-orange-50', stato: null },
          { label: 'Risolte', val: risolte, color: 'text-green-600', bg: 'bg-green-50', stato: 'RISOLTA' },
        ].map(k => (
          <button
            key={k.label}
            onClick={() => k.stato && setFiltroStato(filtroStato === k.stato ? 'all' : k.stato)}
            className={`card flex flex-col items-center py-3 transition-all ${
              filtroStato === k.stato ? 'ring-2 ring-brand-500' : ''
            } ${k.stato ? 'cursor-pointer hover:shadow-md' : 'cursor-default'}`}
          >
            <span className={`text-2xl font-extrabold ${k.color}`}>{k.val}</span>
            <span className="text-xs text-gray-500 mt-0.5">{k.label}</span>
          </button>
        ))}
      </div>

      {/* Errore */}
      {errore && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span className="flex-1">{errore}</span>
          <button onClick={() => setErrore(null)} className="p-0.5 hover:bg-red-100 rounded">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Filtri */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" value={q} onChange={e => setQ(e.target.value)} placeholder="Cerca segnalazione…" className="input pl-9" />
        </div>
        {strutture.length > 1 && (
          <select value={filtroStruttura} onChange={e => setFiltroStruttura(e.target.value)} className="input text-sm py-1.5 w-auto">
            <option value="all">Tutte le strutture</option>
            {strutture.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
          </select>
        )}
        <select value={filtroStato} onChange={e => setFiltroStato(e.target.value)} className="input text-sm py-1.5 w-auto">
          <option value="all">Tutti gli stati</option>
          {Object.entries(STATI).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        {(filtroStato !== 'all' || filtroStruttura !== 'all' || q) && (
          <button onClick={() => { setFiltroStato('all'); setFiltroStruttura('all'); setQ('') }} className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1">
            <X className="w-3.5 h-3.5" /> Reset
          </button>
        )}
        <span className="ml-auto text-xs text-gray-400">{filtrate.length} segnalazioni</span>
      </div>

      {/* Lista */}
      {filtrate.length === 0 ? (
        <div className="card py-14 flex flex-col items-center gap-2 text-gray-300">
          <Wrench className="w-10 h-10 opacity-30" />
          <p className="text-sm">Nessuna segnalazione</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtrate.map(s => (
            <SegnalazioneCard
              key={s.id}
              seg={s}
              onAggiorna={aggiornaStato}
              onElimina={elimina}
              onDettaglio={() => setDetailId(s.id)}
            />
          ))}
        </div>
      )}

      {/* Modal nuova segnalazione */}
      {modalAperto && (
        <NuovaSegnalazioneModal
          strutture={strutture}
          onClose={() => setModalAperto(false)}
          onCreata={onCreata}
        />
      )}

      {/* Panel dettaglio */}
      {detailSeg && (
        <DettaglioPanel
          seg={detailSeg}
          onClose={() => setDetailId(null)}
          onAggiornata={(ag) => {
            setSegnalazioni(prev => prev.map(s => s.id === ag.id ? ag : s))
            setDetailId(null)
          }}
        />
      )}
    </div>
  )
}

// ─── Card segnalazione ────────────────────────────────────────────────────────

function SegnalazioneCard({
  seg: s,
  onAggiorna,
  onElimina,
  onDettaglio,
}: {
  seg: Segnalazione
  onAggiorna: (id: string, stato: string) => void
  onElimina: (id: string) => void
  onDettaglio: () => void
}) {
  const [dropdown, setDropdown] = useState(false)
  const [confirmDel, setConfirmDel] = useState(false)
  const stato = STATI[s.stato] ?? STATI.APERTA
  const prio = PRIORITA[s.priorita] ?? PRIORITA.NORMALE
  const cat = CATEGORIE.find(c => c.val === s.categoria)
  const scaduta = s.dataScadenza && new Date(s.dataScadenza) < new Date() && s.stato !== 'RISOLTA'

  return (
    <div className={`card border-l-4 ${stato.border} flex flex-col sm:flex-row gap-3`}>
      {/* Ikon categoria */}
      <div className={`p-2.5 rounded-xl ${stato.bg} shrink-0 self-start`}>
        <span className={stato.text}>{cat?.icon ?? <Wrench className="w-4 h-4" />}</span>
      </div>

      {/* Contenuto */}
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-start gap-2 mb-1">
          <h3 className="font-semibold text-gray-900 flex-1">{s.titolo}</h3>
          <span className={`text-[11px] font-semibold px-2 py-0.5 rounded border ${prio.cls}`}>{prio.label}</span>
          <span className={`text-[11px] font-semibold px-2 py-0.5 rounded ${stato.bg} ${stato.text}`}>{stato.label}</span>
        </div>
        {s.descrizione && <p className="text-sm text-gray-500 line-clamp-2">{s.descrizione}</p>}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs text-gray-400">
          {s.struttura && <span className="font-medium text-gray-600">{s.struttura.nome}{s.unita ? ` › ${s.unita.nome}` : ''}</span>}
          {s.assegnatoA && <span>→ {s.assegnatoA}</span>}
          {s.dataScadenza && (
            <span className={scaduta ? 'text-red-500 font-semibold flex items-center gap-1' : ''}>
              {scaduta && <AlertTriangle className="w-3 h-3" />}
              Entro {format(new Date(s.dataScadenza), 'd MMM', { locale: it })}
            </span>
          )}
          {s.dataRisoluzione && <span className="text-green-600">Risolta {format(new Date(s.dataRisoluzione), 'd MMM', { locale: it })}</span>}
          <span className="ml-auto">{format(new Date(s.createdAt), 'd MMM yyyy', { locale: it })}</span>
        </div>
      </div>

      {/* Azioni */}
      <div className="flex items-center gap-2 shrink-0">
        <button onClick={onDettaglio} className="text-xs text-gray-400 hover:text-brand-500 px-2 py-1 rounded border border-gray-200 hover:border-brand-300">
          Dettaglio
        </button>
        {/* Dropdown stato */}
        <div className="relative">
          <button onClick={() => setDropdown(!dropdown)} className="p-1.5 rounded-lg border border-gray-200 text-gray-400 hover:text-brand-500 hover:border-brand-300 transition-colors">
            <RefreshCw className="w-4 h-4" />
          </button>
          {dropdown && (
            <div className="absolute right-0 top-full mt-1 w-42 bg-white rounded-xl shadow-xl border border-gray-100 z-20 overflow-hidden">
              {Object.entries(STATI).filter(([k]) => k !== s.stato).map(([k, v]) => (
                <button key={k} onClick={() => { onAggiorna(s.id, k); setDropdown(false) }} className={`w-full flex items-center gap-2 px-3 py-2 text-xs text-left hover:bg-gray-50`}>
                  {v.icon} <span className={v.text}>{v.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        {/* Elimina */}
        {!confirmDel ? (
          <button onClick={() => setConfirmDel(true)} className="p-1.5 rounded-lg border border-gray-200 text-gray-300 hover:text-red-400 hover:border-red-200 transition-colors">
            <Trash2 className="w-4 h-4" />
          </button>
        ) : (
          <div className="flex gap-1">
            <button onClick={() => onElimina(s.id)} className="p-1.5 rounded-lg bg-red-500 text-white text-xs">Sì</button>
            <button onClick={() => setConfirmDel(false)} className="p-1.5 rounded-lg border border-gray-200 text-gray-600 text-xs">No</button>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Modal nuova segnalazione ─────────────────────────────────────────────────

function NuovaSegnalazioneModal({
  strutture,
  onClose,
  onCreata,
}: {
  strutture: Struttura[]
  onClose: () => void
  onCreata: (s: Segnalazione) => void
}) {
  const [form, setForm] = useState({
    titolo: '', categoria: 'ALTRO', descrizione: '', priorita: 'NORMALE',
    strutturaId: '', assegnatoA: '', costoStimato: '', note: '', dataScadenza: '',
  })
  const [immagini, setImmagini] = useState<string[]>(['', '', '', ''])
  const [loading, setLoading] = useState(false)
  const [errore, setErrore] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.titolo) { setErrore('Il titolo è obbligatorio'); return }
    setLoading(true); setErrore('')
    const immaginiValide = immagini.map((u) => u.trim()).filter((u) => u.length > 0)
    const res = await fetch('/api/host/manutenzione', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        strutturaId: form.strutturaId || null,
        immagini: immaginiValide.length > 0 ? immaginiValide : undefined,
      }),
    })
    if (!res.ok) { const j = await res.json(); setErrore(j.error || 'Errore'); setLoading(false); return }
    const seg = await res.json()
    onCreata({
      ...seg,
      dataScadenza: seg.dataScadenza?.toString() ?? null,
      dataRisoluzione: null,
      createdAt: seg.createdAt?.toString(),
      updatedAt: seg.updatedAt?.toString(),
    })
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-gray-100 sticky top-0 bg-white">
          <h3 className="text-base font-bold text-gray-900">Nuova segnalazione</h3>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-100 text-gray-400"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {errore && <p className="text-sm text-red-600">{errore}</p>}
          <div>
            <label className="label">Titolo *</label>
            <input type="text" value={form.titolo} onChange={e => setForm(f => ({ ...f, titolo: e.target.value }))} className="input" placeholder="es. Perdita acqua bagno camera 3" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Categoria *</label>
              <select value={form.categoria} onChange={e => setForm(f => ({ ...f, categoria: e.target.value }))} className="input">
                {CATEGORIE.map(c => <option key={c.val} value={c.val}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Priorità</label>
              <select value={form.priorita} onChange={e => setForm(f => ({ ...f, priorita: e.target.value }))} className="input">
                {['URGENTE', 'ALTA', 'NORMALE', 'BASSA'].map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="label">Descrizione</label>
            <textarea rows={3} value={form.descrizione} onChange={e => setForm(f => ({ ...f, descrizione: e.target.value }))} className="input" placeholder="Descrivi il problema…" />
          </div>
          {strutture.length > 0 && (
            <div>
              <label className="label">Struttura</label>
              <select value={form.strutturaId} onChange={e => setForm(f => ({ ...f, strutturaId: e.target.value }))} className="input">
                <option value="">— Nessuna struttura —</option>
                {strutture.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
              </select>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Assegnato a</label>
              <input type="text" value={form.assegnatoA} onChange={e => setForm(f => ({ ...f, assegnatoA: e.target.value }))} className="input" placeholder="Tecnico / fornitore" />
            </div>
            <div>
              <label className="label">Costo stimato (€)</label>
              <input type="number" step="0.01" value={form.costoStimato} onChange={e => setForm(f => ({ ...f, costoStimato: e.target.value }))} className="input" placeholder="0.00" />
            </div>
          </div>
          <div>
            <label className="label">Data scadenza / intervento</label>
            <input type="date" value={form.dataScadenza} onChange={e => setForm(f => ({ ...f, dataScadenza: e.target.value }))} className="input" />
          </div>
          <div>
            <label className="label">Note</label>
            <textarea rows={2} value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} className="input" />
          </div>
          <div>
            <label className="label">Foto (URL — max 4)</label>
            <p className="text-xs text-gray-500 mb-2">Incolla fino a 4 URL di immagini. Carica prima su un servizio esterno (es. imgur) o sul filesystem della struttura.</p>
            <div className="space-y-1.5">
              {immagini.map((url, idx) => (
                <input
                  key={idx}
                  type="url"
                  value={url}
                  onChange={(e) => setImmagini((arr) => {
                    const copy = [...arr]
                    copy[idx] = e.target.value
                    return copy
                  })}
                  placeholder={`Foto ${idx + 1} (https://...)`}
                  className="input text-xs"
                />
              ))}
            </div>
            {immagini.filter((u) => u.trim().length > 0).length > 0 && (
              <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                {immagini.filter((u) => u.trim().length > 0).map((url, idx) => (
                  <img key={idx} src={url} alt="" className="w-14 h-14 rounded object-cover border border-gray-200" />
                ))}
              </div>
            )}
          </div>
          <div className="flex gap-3 pt-1">
            <button type="submit" disabled={loading} className="flex-1 btn-primary flex items-center justify-center gap-2">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              {loading ? 'Salvo…' : 'Crea segnalazione'}
            </button>
            <button type="button" onClick={onClose} className="btn-secondary">Annulla</button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Panel dettaglio / modifica ────────────────────────────────────────────────

function DettaglioPanel({
  seg,
  onClose,
  onAggiornata,
}: {
  seg: Segnalazione
  onClose: () => void
  onAggiornata: (s: Segnalazione) => void
}) {
  const [form, setForm] = useState({
    assegnatoA: seg.assegnatoA ?? '',
    costoReale: seg.costoReale?.toString() ?? '',
    note: seg.note ?? '',
    stato: seg.stato,
  })
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const stato = STATI[seg.stato] ?? STATI.APERTA
  const prio = PRIORITA[seg.priorita] ?? PRIORITA.NORMALE
  const cat = CATEGORIE.find(c => c.val === seg.categoria)

  async function handleSave() {
    setSaving(true)
    setSaveError(null)
    try {
      const res = await fetch(`/api/host/manutenzione/${seg.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, costoReale: form.costoReale ? parseFloat(form.costoReale) : null }),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        setSaveError(j.error || `Errore salvataggio (${res.status})`)
        setSaving(false)
        return
      }
      const ag = await res.json()
      onAggiornata({
        ...seg, ...ag,
        dataScadenza: ag.dataScadenza?.toString() ?? null,
        dataRisoluzione: ag.dataRisoluzione?.toString() ?? null,
        createdAt: ag.createdAt?.toString() ?? seg.createdAt,
      })
    } catch (err) { console.error(err) 
      setSaveError('Errore di rete. Controlla la connessione e riprova.')
    }
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-gray-100 sticky top-0 bg-white">
          <div className="flex items-center gap-2">
            <span className={stato.text}>{cat?.icon ?? <Wrench className="w-4 h-4" />}</span>
            <h3 className="text-base font-bold text-gray-900 truncate">{seg.titolo}</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-100 text-gray-400"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-5 space-y-4">
          {/* Info read-only */}
          <div className="flex flex-wrap gap-2">
            <span className={`text-xs font-semibold px-2 py-1 rounded border ${prio.cls}`}>{prio.label}</span>
            <span className={`text-xs font-semibold px-2 py-1 rounded ${stato.bg} ${stato.text}`}>{stato.label}</span>
            {seg.struttura && <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">{seg.struttura.nome}{seg.unita ? ` › ${seg.unita.nome}` : ''}</span>}
          </div>
          {seg.descrizione && <p className="text-sm text-gray-600 whitespace-pre-wrap">{seg.descrizione}</p>}

          {/* Modifica stato */}
          <div>
            <label className="label">Stato</label>
            <select value={form.stato} onChange={e => setForm(f => ({ ...f, stato: e.target.value }))} className="input">
              {Object.entries(STATI).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Assegnato a</label>
            <input type="text" value={form.assegnatoA} onChange={e => setForm(f => ({ ...f, assegnatoA: e.target.value }))} className="input" placeholder="Tecnico / fornitore" />
          </div>
          <div>
            <label className="label">Costo reale (€)</label>
            <input type="number" step="0.01" value={form.costoReale} onChange={e => setForm(f => ({ ...f, costoReale: e.target.value }))} className="input" placeholder="0.00" />
            {seg.costoStimato && <p className="text-xs text-gray-400 mt-0.5">Stimato: €{seg.costoStimato.toFixed(2)}</p>}
          </div>
          <div>
            <label className="label">Note aggiornamento</label>
            <textarea rows={3} value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} className="input" />
          </div>

          {saveError && (
            <p className="text-sm text-red-600 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" /> {saveError}
            </p>
          )}

          <div className="flex gap-3 pt-1">
            <button onClick={handleSave} disabled={saving} className="flex-1 btn-primary flex items-center justify-center gap-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              {saving ? 'Salvo…' : 'Salva aggiornamento'}
            </button>
            <button onClick={onClose} className="btn-secondary">Chiudi</button>
          </div>
        </div>
      </div>
    </div>
  )
}
