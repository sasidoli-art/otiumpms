'use client'

import { useEffect, useState, useCallback } from 'react'
import { useStruttura } from '@/components/layout/host-layout'
import {
  ScrollText, Wrench, Utensils, MapPin, Phone, Bus, ShoppingBag,
  Plus, Pencil, Trash2, Loader2, ExternalLink, X,
} from 'lucide-react'
import { cn } from '@/lib/utils'

type Categoria = 'REGOLE_CASA' | 'COME_FUNZIONA' | 'RISTORANTI' | 'ATTRAZIONI' | 'EMERGENZE' | 'TRASPORTI' | 'SERVIZI_ZONA'

interface GuidaEntry {
  id: string
  categoria: Categoria
  titolo: string
  descrizione: string | null
  icona: string | null
  ordine: number
  fotoUrl: string | null
  indirizzo: string | null
  distanzaKm: number | null
  mapsLink: string | null
  telefono: string | null
  orari: string | null
  websiteUrl: string | null
  attivo: boolean
}

const CATEGORIE: { value: Categoria; label: string; icon: typeof ScrollText; descrizione: string }[] = [
  { value: 'REGOLE_CASA',  label: 'Regole casa',    icon: ScrollText,   descrizione: 'Silenzio, fumo, animali, ospiti extra' },
  { value: 'COME_FUNZIONA', label: 'Come funziona', icon: Wrench,       descrizione: 'Elettrodomestici, parcheggio, raccolta differenziata' },
  { value: 'RISTORANTI',    label: 'Ristoranti',    icon: Utensils,     descrizione: 'Locali consigliati con foto e link Google Maps' },
  { value: 'ATTRAZIONI',    label: 'Attrazioni',    icon: MapPin,       descrizione: 'Cosa fare in zona, musei, monumenti, esperienze' },
  { value: 'EMERGENZE',     label: 'Emergenze',     icon: Phone,        descrizione: 'Carabinieri, ospedale, farmacia 24h, taxi' },
  { value: 'TRASPORTI',     label: 'Trasporti',     icon: Bus,          descrizione: 'Bus, treni, taxi locali, autonoleggi' },
  { value: 'SERVIZI_ZONA',  label: 'Servizi zona',  icon: ShoppingBag,  descrizione: 'Farmacie, supermercati, lavanderie' },
]

export default function GuidaClient() {
  const { strutturaCorrente } = useStruttura()
  const strutturaId = strutturaCorrente?.id

  const [activeCat, setActiveCat] = useState<Categoria>('REGOLE_CASA')
  const [entries, setEntries] = useState<GuidaEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [editing, setEditing] = useState<GuidaEntry | 'NEW' | null>(null)

  const load = useCallback(async () => {
    if (!strutturaId) return
    setLoading(true)
    try {
      const res = await fetch(`/api/host/strutture/${strutturaId}/guida`)
      if (res.ok) setEntries(await res.json())
    } finally {
      setLoading(false)
    }
  }, [strutturaId])

  useEffect(() => { load() }, [load])

  async function del(id: string) {
    if (!strutturaId) return
    if (!confirm('Eliminare questa voce?')) return
    const res = await fetch(`/api/host/strutture/${strutturaId}/guida/${id}`, { method: 'DELETE' })
    if (res.ok) setEntries(prev => prev.filter(e => e.id !== id))
  }

  async function toggleAttivo(e: GuidaEntry) {
    if (!strutturaId) return
    const res = await fetch(`/api/host/strutture/${strutturaId}/guida/${e.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ attivo: !e.attivo }),
    })
    if (res.ok) {
      const updated = await res.json()
      setEntries(prev => prev.map(x => x.id === e.id ? updated : x))
    }
  }

  if (!strutturaCorrente) {
    return (
      <div className="p-8 text-center text-slate-500 text-[14px]">
        Seleziona una struttura per gestire la guida in camera.
      </div>
    )
  }

  const filtered = entries.filter(e => e.categoria === activeCat)
  const counts: Partial<Record<Categoria, number>> = {}
  for (const e of entries) counts[e.categoria] = (counts[e.categoria] ?? 0) + 1

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-slate-400 mb-1">
            Guida in camera
          </p>
          <h1 className="text-[26px] font-bold text-slate-900 tracking-tight leading-none">
            Welcome book digitale
          </h1>
          <p className="mt-2 text-[13px] text-slate-500 max-w-xl">
            Cosa l&apos;ospite vede in camera dopo aver scansionato il QR. Aggiorna in tempo reale,
            visibile in IT/EN/FR/DE quando configurato.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-4">
        {/* Sidebar categorie */}
        <div className="bg-white/55 backdrop-blur-xl rounded-2xl border border-white/60 shadow-[0_8px_32px_-8px_rgba(0,0,0,0.10),inset_0_1px_0_rgba(255,255,255,0.85)] p-2">
          {CATEGORIE.map(({ value, label, icon: Icon }) => {
            const isActive = activeCat === value
            const count = counts[value] ?? 0
            return (
              <button
                key={value}
                onClick={() => setActiveCat(value)}
                className={cn(
                  'w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left transition-all',
                  isActive
                    ? 'bg-indigo-50 text-indigo-700 font-semibold'
                    : 'text-slate-600 hover:bg-white/60',
                )}
              >
                <Icon size={15} strokeWidth={2} className={isActive ? 'text-indigo-600' : 'text-slate-400'} />
                <span className="flex-1 text-[13px]">{label}</span>
                {count > 0 && (
                  <span className={cn(
                    'inline-flex items-center justify-center min-w-[20px] h-[18px] px-1.5 rounded-full text-[10px] font-bold',
                    isActive ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-500',
                  )}>{count}</span>
                )}
              </button>
            )
          })}
        </div>

        {/* Lista entry categoria attiva */}
        <div className="bg-white/55 backdrop-blur-xl rounded-2xl border border-white/60 shadow-[0_8px_32px_-8px_rgba(0,0,0,0.10),inset_0_1px_0_rgba(255,255,255,0.85)] overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/50">
            <div>
              <h2 className="text-[15px] font-bold text-slate-800">
                {CATEGORIE.find(c => c.value === activeCat)?.label}
              </h2>
              <p className="text-[12px] text-slate-500 mt-0.5">
                {CATEGORIE.find(c => c.value === activeCat)?.descrizione}
              </p>
            </div>
            <button
              onClick={() => setEditing('NEW')}
              className="inline-flex items-center gap-1.5 h-9 px-3 rounded-xl bg-indigo-600 text-white text-[13px] font-semibold hover:bg-indigo-700 transition-colors"
            >
              <Plus size={14} /> Aggiungi
            </button>
          </div>

          {loading && entries.length === 0 ? (
            <div className="p-10 text-center"><Loader2 className="w-5 h-5 animate-spin text-slate-300 mx-auto" /></div>
          ) : filtered.length === 0 ? (
            <div className="p-10 text-center text-[13px] text-slate-400">
              Nessuna voce in questa categoria. Clicca <strong>Aggiungi</strong> per crearne una.
            </div>
          ) : (
            <ul className="divide-y divide-white/40">
              {filtered.map(e => (
                <li key={e.id} className="px-5 py-3 flex items-start gap-3 hover:bg-white/30">
                  {e.fotoUrl && (
                     
                    <img src={e.fotoUrl} alt="" className="w-14 h-14 rounded-lg object-cover shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className={cn('text-[14px] font-semibold truncate', e.attivo ? 'text-slate-800' : 'text-slate-400 line-through')}>
                        {e.titolo}
                      </p>
                      {!e.attivo && <span className="text-[10px] text-slate-400 uppercase">nascosta</span>}
                    </div>
                    {e.descrizione && (
                      <p className="text-[12px] text-slate-500 mt-0.5 line-clamp-2">{e.descrizione}</p>
                    )}
                    <div className="flex items-center gap-3 mt-1 text-[11px] text-slate-400 flex-wrap">
                      {e.indirizzo && <span>📍 {e.indirizzo}</span>}
                      {e.distanzaKm != null && <span>{e.distanzaKm} km</span>}
                      {e.telefono && <span>{e.telefono}</span>}
                      {e.mapsLink && (
                        <a href={e.mapsLink} target="_blank" rel="noopener" className="inline-flex items-center gap-0.5 text-indigo-500 hover:underline">
                          Maps <ExternalLink size={9} />
                        </a>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => toggleAttivo(e)}
                      title={e.attivo ? 'Nascondi' : 'Mostra'}
                      className="p-1.5 rounded-md text-slate-400 hover:bg-white/60 hover:text-slate-700"
                    >
                      <span className={cn('block w-2 h-2 rounded-full', e.attivo ? 'bg-emerald-500' : 'bg-slate-300')} />
                    </button>
                    <button
                      onClick={() => setEditing(e)}
                      className="p-1.5 rounded-md text-slate-400 hover:bg-white/60 hover:text-slate-700"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => del(e.id)}
                      className="p-1.5 rounded-md text-red-500 hover:bg-red-50"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Modal edit / new */}
      {editing && strutturaId && (
        <EntryFormModal
          strutturaId={strutturaId}
          categoria={activeCat}
          entry={editing === 'NEW' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={(saved) => {
            setEntries(prev => {
              const exists = prev.find(e => e.id === saved.id)
              return exists ? prev.map(e => e.id === saved.id ? saved : e) : [...prev, saved]
            })
            setEditing(null)
          }}
        />
      )}
    </div>
  )
}

// ─── Modal form ─────────────────────────────────────────────────────────────

function EntryFormModal({
  strutturaId, categoria, entry, onClose, onSaved,
}: {
  strutturaId: string
  categoria: Categoria
  entry: GuidaEntry | null
  onClose: () => void
  onSaved: (e: GuidaEntry) => void
}) {
  const isPOI = categoria === 'RISTORANTI' || categoria === 'ATTRAZIONI' || categoria === 'SERVIZI_ZONA' || categoria === 'EMERGENZE' || categoria === 'TRASPORTI'

  const [form, setForm] = useState({
    titolo: entry?.titolo ?? '',
    descrizione: entry?.descrizione ?? '',
    fotoUrl: entry?.fotoUrl ?? '',
    indirizzo: entry?.indirizzo ?? '',
    distanzaKm: entry?.distanzaKm?.toString() ?? '',
    mapsLink: entry?.mapsLink ?? '',
    telefono: entry?.telefono ?? '',
    orari: entry?.orari ?? '',
    websiteUrl: entry?.websiteUrl ?? '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!form.titolo.trim()) {
      setError('Titolo obbligatorio')
      return
    }
    setSaving(true)
    try {
      const body = {
        ...form,
        categoria,
        distanzaKm: form.distanzaKm ? Number(form.distanzaKm) : null,
      }
      const url = entry
        ? `/api/host/strutture/${strutturaId}/guida/${entry.id}`
        : `/api/host/strutture/${strutturaId}/guida`
      const res = await fetch(url, {
        method: entry ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        setError(j.error || 'Errore salvataggio')
        return
      }
      const saved = await res.json()
      onSaved(saved)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-slate-100 px-5 py-3 flex items-center justify-between">
          <h3 className="font-bold text-slate-900">{entry ? 'Modifica voce' : 'Nuova voce'}</h3>
          <button onClick={onClose} className="p-1 rounded-md text-slate-400 hover:bg-slate-100"><X size={16} /></button>
        </div>

        <form onSubmit={submit} className="p-5 space-y-3">
          <Field label="Titolo *" value={form.titolo} onChange={v => setForm(f => ({ ...f, titolo: v }))} required />
          <Field label="Descrizione" value={form.descrizione} onChange={v => setForm(f => ({ ...f, descrizione: v }))} multiline />

          {isPOI && (
            <>
              <Field label="Foto (URL)" value={form.fotoUrl} onChange={v => setForm(f => ({ ...f, fotoUrl: v }))} placeholder="https://..." />
              <Field label="Indirizzo" value={form.indirizzo} onChange={v => setForm(f => ({ ...f, indirizzo: v }))} />
              <div className="grid grid-cols-2 gap-3">
                <Field label="Distanza (km)" value={form.distanzaKm} onChange={v => setForm(f => ({ ...f, distanzaKm: v }))} type="number" />
                <Field label="Telefono" value={form.telefono} onChange={v => setForm(f => ({ ...f, telefono: v }))} />
              </div>
              <Field label="Link Google Maps" value={form.mapsLink} onChange={v => setForm(f => ({ ...f, mapsLink: v }))} placeholder="https://maps.google.com/..." />
              <Field label="Orari" value={form.orari} onChange={v => setForm(f => ({ ...f, orari: v }))} placeholder="Lun-Ven 9-18, Sab 10-13" />
              <Field label="Sito web" value={form.websiteUrl} onChange={v => setForm(f => ({ ...f, websiteUrl: v }))} placeholder="https://..." />
            </>
          )}

          {error && <p className="text-[13px] text-red-600 bg-red-50 border border-red-100 rounded-md px-3 py-2">{error}</p>}

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button type="button" onClick={onClose} className="h-9 px-3 rounded-xl text-[13px] text-slate-600 hover:bg-slate-100">Annulla</button>
            <button type="submit" disabled={saving} className="inline-flex items-center gap-1.5 h-9 px-4 rounded-xl bg-indigo-600 text-white text-[13px] font-semibold hover:bg-indigo-700 disabled:opacity-50">
              {saving && <Loader2 size={14} className="animate-spin" />}
              {entry ? 'Salva' : 'Aggiungi'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function Field({
  label, value, onChange, type = 'text', multiline, placeholder, required,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  type?: string
  multiline?: boolean
  placeholder?: string
  required?: boolean
}) {
  const base = 'w-full px-3 py-2 border border-slate-200 rounded-lg text-[13px] focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 outline-none'
  return (
    <label className="block">
      <span className="block text-[11px] font-semibold text-slate-600 mb-1">{label}</span>
      {multiline ? (
        <textarea
          value={value}
          onChange={e => onChange(e.target.value)}
          rows={3}
          placeholder={placeholder}
          required={required}
          className={cn(base, 'resize-none')}
        />
      ) : (
        <input
          type={type}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          required={required}
          step={type === 'number' ? 'any' : undefined}
          className={base}
        />
      )}
    </label>
  )
}
