'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { it } from 'date-fns/locale'
import { useTranslations } from 'next-intl'
import {
  Plus, X, Loader2, Pin, Archive, Trash2, Bell,
  CheckSquare, AlertTriangle as Urgent, FileText,
  Eye, EyeOff, Send, Clock, Users, ChevronDown
} from 'lucide-react'

// ─── Tipi ─────────────────────────────────────────────────────────────────────

type Comunicazione = {
  id: string
  tipo: string
  titolo: string
  testo: string | null
  autore: string
  destinatari: string[]
  fissato: boolean
  archiviato: boolean
  letti: string[]
  dataScadenza: string | null
  createdAt: string
}

// ─── Config ────────────────────────────────────────────────────────────────────

const TIPI: Record<string, { label: string; bg: string; text: string; border: string; icon: React.ReactNode }> = {
  AVVISO:   { label: 'Avviso',  bg: 'bg-blue-50',   text: 'text-blue-700',   border: 'border-blue-200',   icon: <Bell className="w-4 h-4 text-blue-500" /> },
  TASK:     { label: 'Task',    bg: 'bg-brand-50',   text: 'text-brand-700',  border: 'border-brand-200',  icon: <CheckSquare className="w-4 h-4 text-brand-500" /> },
  NOTA:     { label: 'Nota',    bg: 'bg-yellow-50',  text: 'text-yellow-700', border: 'border-yellow-200', icon: <FileText className="w-4 h-4 text-yellow-500" /> },
  URGENTE:  { label: 'Urgente', bg: 'bg-red-50',     text: 'text-red-700',    border: 'border-red-200',    icon: <Urgent className="w-4 h-4 text-red-500" /> },
}

// ─── Componente ───────────────────────────────────────────────────────────────

export default function StaffBoard({
  comunicazioniIniziali,
  totaleArchiviate,
}: {
  comunicazioniIniziali: Comunicazione[]
  totaleArchiviate: number
}) {
  const t = useTranslations('host.staff')
  const _tc = useTranslations('common')
  const [comunicazioni, setComunicazioni] = useState<Comunicazione[]>(comunicazioniIniziali)
  const [archiviate, setArchiviate] = useState<Comunicazione[]>([])
  const [mostraArchivio, setMostraArchivio] = useState(false)
  const [loadingArchivio, setLoadingArchivio] = useState(false)
  const [filtroTipo, setFiltroTipo] = useState('all')
  const [modalAperto, setModalAperto] = useState(false)
  const [lettoModal, setLettoModal] = useState<string | null>(null)
  const [nomeLettura, setNomeLettura] = useState('')
  const [errore, setErrore] = useState<string | null>(null)

  const filtrate = comunicazioni.filter(c =>
    filtroTipo === 'all' ? true : c.tipo === filtroTipo
  )
  const fissate = filtrate.filter(c => c.fissato)
  const normali = filtrate.filter(c => !c.fissato)

  async function togglePin(id: string, fissato: boolean) {
    setErrore(null)
    try {
      const res = await fetch(`/api/host/staff/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fissato: !fissato }),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        setErrore(j.error || `Errore aggiornamento pin (${res.status})`)
        return
      }
      setComunicazioni(p => p.map(c => c.id === id ? { ...c, fissato: !c.fissato } : c))
    } catch (err) { console.error(err) 
      setErrore('Errore di rete. Controlla la connessione e riprova.')
    }
  }

  async function archivia(id: string) {
    setErrore(null)
    try {
      const res = await fetch(`/api/host/staff/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ archiviato: true }),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        setErrore(j.error || `Errore archiviazione (${res.status})`)
        return
      }
      setComunicazioni(p => p.filter(c => c.id !== id))
    } catch (err) { console.error(err) 
      setErrore('Errore di rete. Controlla la connessione e riprova.')
    }
  }

  async function elimina(id: string) {
    setErrore(null)
    try {
      const res = await fetch(`/api/host/staff/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        setErrore(j.error || `Errore eliminazione (${res.status})`)
        return
      }
      setComunicazioni(p => p.filter(c => c.id !== id))
      setArchiviate(p => p.filter(c => c.id !== id))
    } catch (err) { console.error(err) 
      setErrore('Errore di rete. Controlla la connessione e riprova.')
    }
  }

  async function confermLettura(id: string) {
    if (!nomeLettura.trim()) return
    setErrore(null)
    const com = comunicazioni.find(c => c.id === id)
    if (!com) return
    const nuoviLetti = [...new Set([...com.letti, nomeLettura.trim()])]
    try {
      const res = await fetch(`/api/host/staff/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ letti: nuoviLetti }),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        setErrore(j.error || `Errore conferma lettura (${res.status})`)
        return
      }
      setComunicazioni(p => p.map(c => c.id === id ? { ...c, letti: nuoviLetti } : c))
      setLettoModal(null); setNomeLettura('')
    } catch (err) { console.error(err) 
      setErrore('Errore di rete. Controlla la connessione e riprova.')
    }
  }

  async function caricaArchivio() {
    setLoadingArchivio(true)
    setErrore(null)
    try {
      const res = await fetch('/api/host/staff?archiviato=true')
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        setErrore(j.error || `Errore caricamento archivio (${res.status})`)
        setLoadingArchivio(false)
        return
      }
      const data = await res.json()
      setArchiviate(data)
      setMostraArchivio(true)
    } catch (err) { console.error(err) 
      setErrore('Errore di rete. Controlla la connessione e riprova.')
    }
    setLoadingArchivio(false)
  }

  function onCreata(com: Comunicazione) {
    setComunicazioni(p => com.fissato ? [com, ...p] : [...p.filter(c => c.fissato), com, ...p.filter(c => !c.fissato)])
    setModalAperto(false)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="page-title-box">
        <div>
          <h1 className="page-title">{t('title')}</h1>
          <p className="text-sm text-gray-500">Avvisi, task e comunicazioni per il team</p>
        </div>
        <button onClick={() => setModalAperto(true)} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Nuovo messaggio
        </button>
      </div>

      {/* Filtro tipo */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setFiltroTipo('all')}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${filtroTipo === 'all' ? 'bg-brand-500 text-white border-brand-500' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
        >
          Tutti ({comunicazioni.length})
        </button>
        {Object.entries(TIPI).map(([k, v]) => {
          const n = comunicazioni.filter(c => c.tipo === k).length
          return (
            <button
              key={k}
              onClick={() => setFiltroTipo(filtroTipo === k ? 'all' : k)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                filtroTipo === k ? `${v.bg} ${v.text} ${v.border}` : 'border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {v.icon} {v.label} {n > 0 && <span className="text-xs opacity-70">({n})</span>}
            </button>
          )
        })}
      </div>

      {/* Errore */}
      {errore && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
          <Urgent className="w-4 h-4 shrink-0" />
          <span className="flex-1">{errore}</span>
          <button onClick={() => setErrore(null)} className="p-0.5 hover:bg-red-100 rounded">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Messaggi fissati */}
      {fissate.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide flex items-center gap-1.5">
            <Pin className="w-3.5 h-3.5" /> Fissati
          </h2>
          {fissate.map(c => (
            <ComunicazioneCard
              key={c.id}
              com={c}
              onPin={() => togglePin(c.id, c.fissato)}
              onArchivia={() => archivia(c.id)}
              onElimina={() => elimina(c.id)}
              onLetto={() => setLettoModal(c.id)}
            />
          ))}
        </div>
      )}

      {/* Messaggi normali */}
      {normali.length === 0 && fissate.length === 0 ? (
        <div className="card py-14 flex flex-col items-center gap-2 text-gray-300">
          <Bell className="w-10 h-10 opacity-30" />
          <p className="text-sm">Nessuna comunicazione</p>
          <button onClick={() => setModalAperto(true)} className="text-sm text-brand-500 hover:underline mt-1">
            Scrivi il primo messaggio
          </button>
        </div>
      ) : (
        normali.length > 0 && (
          <div className="space-y-3">
            {fissate.length > 0 && (
              <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Bacheca</h2>
            )}
            {normali.map(c => (
              <ComunicazioneCard
                key={c.id}
                com={c}
                onPin={() => togglePin(c.id, c.fissato)}
                onArchivia={() => archivia(c.id)}
                onElimina={() => elimina(c.id)}
                onLetto={() => setLettoModal(c.id)}
              />
            ))}
          </div>
        )
      )}

      {/* Archivio */}
      <div>
        {!mostraArchivio ? (
          <button
            onClick={caricaArchivio}
            disabled={loadingArchivio || totaleArchiviate === 0}
            className="flex items-center gap-2 text-sm text-gray-400 hover:text-gray-600 disabled:opacity-40"
          >
            {loadingArchivio ? <Loader2 className="w-4 h-4 animate-spin" /> : <Archive className="w-4 h-4" />}
            Archivio ({totaleArchiviate})
          </button>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide flex items-center gap-1.5">
                <Archive className="w-3.5 h-3.5" /> Archivio
              </h2>
              <button onClick={() => setMostraArchivio(false)} className="text-xs text-gray-400 hover:text-gray-600">Nascondi</button>
            </div>
            {archiviate.map(c => (
              <ComunicazioneCard
                key={c.id}
                com={c}
                archiviata
                onPin={() => {}}
                onArchivia={() => {}}
                onElimina={() => elimina(c.id)}
                onLetto={() => {}}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modal nuovo messaggio */}
      {modalAperto && (
        <NuovoMessaggioModal onClose={() => setModalAperto(false)} onCreato={onCreata} />
      )}

      {/* Modal conferma lettura */}
      {lettoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6">
            <h3 className="text-base font-bold text-gray-900 mb-3">Conferma lettura</h3>
            <p className="text-sm text-gray-500 mb-4">Inserisci il tuo nome per confermare di aver letto.</p>
            <input
              type="text"
              value={nomeLettura}
              onChange={e => setNomeLettura(e.target.value)}
              className="input mb-4"
              placeholder="Il tuo nome"
              autoFocus
              onKeyDown={e => e.key === 'Enter' && confermLettura(lettoModal)}
            />
            <div className="flex gap-3">
              <button onClick={() => confermLettura(lettoModal)} className="flex-1 btn-primary flex items-center justify-center gap-2">
                <Eye className="w-4 h-4" /> Conferma
              </button>
              <button onClick={() => { setLettoModal(null); setNomeLettura('') }} className="btn-secondary">Annulla</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Card comunicazione ────────────────────────────────────────────────────────

function ComunicazioneCard({
  com: c,
  archiviata = false,
  onPin,
  onArchivia,
  onElimina,
  onLetto,
}: {
  com: Comunicazione
  archiviata?: boolean
  onPin: () => void
  onArchivia: () => void
  onElimina: () => void
  onLetto: () => void
}) {
  const [confirmDel, setConfirmDel] = useState(false)
  const [espanso, setEspanso] = useState(false)
  const tipo = TIPI[c.tipo] ?? TIPI.AVVISO
  const scaduta = c.dataScadenza && new Date(c.dataScadenza) < new Date()

  return (
    <div className={`card border-l-4 ${tipo.border} ${archiviata ? 'opacity-60' : ''}`}>
      <div className="flex items-start gap-3">
        {/* Icona tipo */}
        <div className={`p-2 rounded-lg ${tipo.bg} shrink-0 mt-0.5`}>
          {tipo.icon}
        </div>

        {/* Contenuto */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-0.5">
                {c.fissato && <Pin className="w-3.5 h-3.5 text-brand-500 shrink-0" />}
                <h3 className={`font-semibold text-gray-900 ${c.tipo === 'URGENTE' ? 'text-red-700' : ''}`}>
                  {c.titolo}
                </h3>
                <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${tipo.bg} ${tipo.text}`}>
                  {tipo.label}
                </span>
              </div>
              <div className="flex items-center gap-3 text-xs text-gray-400">
                <span className="font-medium text-gray-600">{c.autore}</span>
                <span>{format(new Date(c.createdAt), 'd MMM HH:mm', { locale: it })}</span>
                {c.destinatari.length > 0 && (
                  <span className="flex items-center gap-1">
                    <Users className="w-3 h-3" /> {c.destinatari.join(', ')}
                  </span>
                )}
                {c.dataScadenza && (
                  <span className={`flex items-center gap-1 ${scaduta ? 'text-red-500 font-semibold' : ''}`}>
                    <Clock className="w-3 h-3" /> {format(new Date(c.dataScadenza), 'd MMM', { locale: it })}
                  </span>
                )}
              </div>
            </div>

            {/* Azioni */}
            {!archiviata && (
              <div className="flex items-center gap-1 shrink-0">
                <button onClick={onLetto} className="p-1.5 rounded-lg text-gray-300 hover:text-green-500 hover:bg-green-50 transition-colors" title="Segna come letto">
                  <Eye className="w-4 h-4" />
                </button>
                <button onClick={onPin} className={`p-1.5 rounded-lg transition-colors ${c.fissato ? 'text-brand-500 bg-brand-50' : 'text-gray-300 hover:text-brand-500 hover:bg-brand-50'}`} title={c.fissato ? 'Togli pin' : 'Fissa in cima'}>
                  <Pin className="w-4 h-4" />
                </button>
                <button onClick={onArchivia} className="p-1.5 rounded-lg text-gray-300 hover:text-gray-500 hover:bg-gray-100 transition-colors" title="Archivia">
                  <Archive className="w-4 h-4" />
                </button>
                {!confirmDel ? (
                  <button onClick={() => setConfirmDel(true)} className="p-1.5 rounded-lg text-gray-300 hover:text-red-400 hover:bg-red-50 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                ) : (
                  <div className="flex gap-1">
                    <button onClick={onElimina} className="px-2 py-1 rounded-lg bg-red-500 text-white text-xs">Elimina</button>
                    <button onClick={() => setConfirmDel(false)} className="px-2 py-1 rounded-lg border border-gray-200 text-xs">No</button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Testo espandibile */}
          {c.testo && (
            <div className="mt-2">
              <p className={`text-sm text-gray-600 whitespace-pre-wrap ${!espanso && c.testo.length > 150 ? 'line-clamp-2' : ''}`}>
                {c.testo}
              </p>
              {c.testo.length > 150 && (
                <button onClick={() => setEspanso(!espanso)} className="text-xs text-brand-500 hover:underline mt-0.5">
                  {espanso ? 'Mostra meno' : 'Mostra tutto'}
                </button>
              )}
            </div>
          )}

          {/* Chi ha letto */}
          {c.letti.length > 0 && (
            <div className="mt-2 flex items-center gap-1.5 flex-wrap">
              <Eye className="w-3 h-3 text-gray-400" />
              {c.letti.map(n => (
                <span key={n} className="text-[10px] bg-green-50 text-green-700 px-1.5 py-0.5 rounded-full">{n}</span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Modal nuovo messaggio ─────────────────────────────────────────────────────

function NuovoMessaggioModal({
  onClose,
  onCreato,
}: {
  onClose: () => void
  onCreato: (c: Comunicazione) => void
}) {
  const [form, setForm] = useState({
    tipo: 'AVVISO', titolo: '', testo: '', autore: '',
    destinatari: '', fissato: false, dataScadenza: '',
  })
  const [loading, setLoading] = useState(false)
  const [errore, setErrore] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.titolo || !form.autore) { setErrore('Titolo e autore obbligatori'); return }
    setLoading(true); setErrore('')
    const res = await fetch('/api/host/staff', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        destinatari: form.destinatari ? form.destinatari.split(',').map(d => d.trim()).filter(Boolean) : [],
        dataScadenza: form.dataScadenza || null,
      }),
    })
    if (!res.ok) { const j = await res.json(); setErrore(j.error || 'Errore'); setLoading(false); return }
    const com = await res.json()
    onCreato({ ...com, dataScadenza: com.dataScadenza?.toString() ?? null })
    setLoading(false)
  }

  const tipoInfo = TIPI[form.tipo] ?? TIPI.AVVISO

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className={`flex items-center justify-between p-5 border-b sticky top-0 bg-white`}>
          <div className="flex items-center gap-2">
            {tipoInfo.icon}
            <h3 className="text-base font-bold text-gray-900">Nuovo messaggio staff</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-100 text-gray-400"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {errore && <p className="text-sm text-red-600">{errore}</p>}

          {/* Tipo */}
          <div className="grid grid-cols-4 gap-2">
            {Object.entries(TIPI).map(([k, v]) => (
              <button
                key={k}
                type="button"
                onClick={() => setForm(f => ({ ...f, tipo: k }))}
                className={`flex flex-col items-center gap-1 px-2 py-2.5 rounded-xl border text-xs font-medium transition-colors ${
                  form.tipo === k ? `${v.bg} ${v.text} ${v.border}` : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                }`}
              >
                {v.icon}{v.label}
              </button>
            ))}
          </div>

          <div>
            <label className="label">Titolo *</label>
            <input type="text" value={form.titolo} onChange={e => setForm(f => ({ ...f, titolo: e.target.value }))} className="input" placeholder="Oggetto del messaggio" autoFocus />
          </div>
          <div>
            <label className="label">Messaggio</label>
            <textarea rows={4} value={form.testo} onChange={e => setForm(f => ({ ...f, testo: e.target.value }))} className="input" placeholder="Testo…" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Da (autore) *</label>
              <input type="text" value={form.autore} onChange={e => setForm(f => ({ ...f, autore: e.target.value }))} className="input" placeholder="Il tuo nome" />
            </div>
            <div>
              <label className="label">A (destinatari)</label>
              <input type="text" value={form.destinatari} onChange={e => setForm(f => ({ ...f, destinatari: e.target.value }))} className="input" placeholder="Mario, Lucia (o vuoto = tutti)" />
            </div>
          </div>
          <div>
            <label className="label">Scadenza</label>
            <input type="date" value={form.dataScadenza} onChange={e => setForm(f => ({ ...f, dataScadenza: e.target.value }))} className="input" />
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="pin" checked={form.fissato} onChange={e => setForm(f => ({ ...f, fissato: e.target.checked }))} className="w-4 h-4 accent-brand-500" />
            <label htmlFor="pin" className="text-sm font-medium text-gray-700 flex items-center gap-1">
              <Pin className="w-4 h-4 text-brand-500" /> Fissa in cima alla bacheca
            </label>
          </div>
          <div className="flex gap-3 pt-1">
            <button type="submit" disabled={loading} className="flex-1 btn-primary flex items-center justify-center gap-2">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {loading ? 'Pubblicando…' : 'Pubblica'}
            </button>
            <button type="button" onClick={onClose} className="btn-secondary">Annulla</button>
          </div>
        </form>
      </div>
    </div>
  )
}
