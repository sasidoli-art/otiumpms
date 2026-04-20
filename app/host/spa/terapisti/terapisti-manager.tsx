'use client'

import { useEffect, useState, useCallback } from 'react'
import { Plus, Edit2, Trash2, Users, CalendarClock, Globe, ChevronDown, ChevronUp, X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface DisponibilitaSlot {
  id: string
  tipo: 'SETTIMANALE' | 'SPECIFICA' | 'BLOCCO'
  giorno: number | null
  data: string | null
  orarioInizio: string
  orarioFine: string
  attiva: boolean
}

interface Terapista {
  id: string
  nome: string
  cognome: string
  email: string | null
  telefono: string | null
  colore: string
  specializzazioni: string[]
  note: string | null
  attivo: boolean
  profiloPublico: boolean
  bio: string | null
}

const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#ef4444', '#f97316', '#eab308', '#22c55e', '#14b8a6', '#06b6d4', '#3b82f6']
const GIORNI = ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato', 'Domenica']

export default function TerapistiManager() {
  const [terapisti, setTerapisti] = useState<Terapista[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<'create' | Terapista | null>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ nome: '', cognome: '', email: '', telefono: '', colore: '#6366f1', specializzazioni: '', note: '', attivo: true, profiloPublico: false, bio: '' })
  const [expandedDispo, setExpandedDispo] = useState<string | null>(null)
  const [disponibilita, setDisponibilita] = useState<Record<string, DisponibilitaSlot[]>>({})

  const load = async () => {
    setLoading(true)
    const res = await fetch('/api/host/spa/terapisti')
    const data = await res.json()
    setTerapisti(Array.isArray(data) ? data : [])
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const loadDispo = useCallback(async (terapistaId: string) => {
    const res = await fetch(`/api/host/spa/terapisti/${terapistaId}/disponibilita`)
    const data = await res.json()
    setDisponibilita(prev => ({ ...prev, [terapistaId]: Array.isArray(data) ? data : [] }))
  }, [])

  const toggleDispo = async (terapistaId: string) => {
    if (expandedDispo === terapistaId) { setExpandedDispo(null); return }
    setExpandedDispo(terapistaId)
    if (!disponibilita[terapistaId]) await loadDispo(terapistaId)
  }

  const openCreate = () => {
    setForm({ nome: '', cognome: '', email: '', telefono: '', colore: '#6366f1', specializzazioni: '', note: '', attivo: true, profiloPublico: false, bio: '' })
    setModal('create')
  }
  const openEdit = (t: Terapista) => {
    setForm({ nome: t.nome, cognome: t.cognome, email: t.email ?? '', telefono: t.telefono ?? '', colore: t.colore, specializzazioni: t.specializzazioni.join(', '), note: t.note ?? '', attivo: t.attivo, profiloPublico: t.profiloPublico, bio: t.bio ?? '' })
    setModal(t)
  }

  const save = async () => {
    setSaving(true)
    const payload = { ...form, specializzazioni: form.specializzazioni.split(',').map((s: string) => s.trim()).filter(Boolean) }
    const res = modal === 'create'
      ? await fetch('/api/host/spa/terapisti', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      : await fetch(`/api/host/spa/terapisti/${(modal as Terapista).id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    if (res.ok) { setModal(null); load() }
    setSaving(false)
  }

  const remove = async (id: string) => {
    if (!confirm('Eliminare questo terapista?')) return
    await fetch(`/api/host/spa/terapisti/${id}`, { method: 'DELETE' })
    load()
  }

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-sky-100 flex items-center justify-center">
            <Users className="w-5 h-5 text-sky-600" />
          </div>
          <h1 className="text-xl font-bold text-gray-900">Terapisti</h1>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
          <Plus className="w-4 h-4" /> Aggiungi
        </button>
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-400">Caricamento...</div>
      ) : terapisti.length === 0 ? (
        <div className="text-center py-16 text-gray-400">Nessun terapista ancora.</div>
      ) : (
        <div className="space-y-3">
          {terapisti.map(t => (
            <div key={t.id} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0" style={{ backgroundColor: t.colore }}>
                  {t.nome[0]}{t.cognome[0]}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-gray-900 flex items-center gap-2">
                    {t.nome} {t.cognome}
                    {t.profiloPublico && <Globe className="w-3.5 h-3.5 text-sky-500" aria-label="Profilo pubblico" />}
                  </div>
                  {t.email && <div className="text-xs text-gray-400 truncate">{t.email}</div>}
                  {t.bio && <div className="text-xs text-gray-500 mt-0.5 line-clamp-1 italic">{t.bio}</div>}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge className={t.attivo ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}>{t.attivo ? 'Attivo' : 'Inattivo'}</Badge>
                  <button onClick={() => openEdit(t)} className="p-1.5 text-gray-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg"><Edit2 className="w-3.5 h-3.5" /></button>
                  <button onClick={() => remove(t.id)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </div>
              <div className="border-t border-gray-100">
                <button onClick={() => toggleDispo(t.id)} className="w-full flex items-center gap-2 px-4 py-2.5 text-xs font-medium text-gray-500 hover:bg-gray-50 text-left">
                  <CalendarClock className="w-3.5 h-3.5" />
                  Disponibilità oraria
                  {expandedDispo === t.id ? <ChevronUp className="w-3.5 h-3.5 ml-auto" /> : <ChevronDown className="w-3.5 h-3.5 ml-auto" />}
                </button>
                {expandedDispo === t.id && (
                  <DisponibilitaPanel terapistaId={t.id} slots={disponibilita[t.id] ?? []} onRefresh={() => loadDispo(t.id)} />
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {modal !== null && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold text-gray-900">{modal === 'create' ? 'Nuovo terapista' : 'Modifica terapista'}</h2>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Nome *" value={form.nome} onChange={v => setForm(f => ({ ...f, nome: v }))} />
              <Field label="Cognome *" value={form.cognome} onChange={v => setForm(f => ({ ...f, cognome: v }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Email" value={form.email} onChange={v => setForm(f => ({ ...f, email: v }))} />
              <Field label="Telefono" value={form.telefono} onChange={v => setForm(f => ({ ...f, telefono: v }))} />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Colore calendario</label>
              <div className="flex flex-wrap gap-2">
                {COLORS.map(c => (
                  <button key={c} onClick={() => setForm(f => ({ ...f, colore: c }))} className={cn('w-7 h-7 rounded-full border-2', form.colore === c ? 'border-gray-800 scale-110' : 'border-transparent')} style={{ backgroundColor: c }} />
                ))}
              </div>
            </div>
            <Field label="Specializzazioni (separate da virgola)" value={form.specializzazioni} onChange={v => setForm(f => ({ ...f, specializzazioni: v }))} />
            <Field label="Bio (visibile ai clienti)" value={form.bio} onChange={v => setForm(f => ({ ...f, bio: v }))} />
            <Field label="Note interne" value={form.note} onChange={v => setForm(f => ({ ...f, note: v }))} />
            <div className="flex gap-4">
              <div className="flex items-center gap-2">
                <input type="checkbox" id="att" checked={form.attivo} onChange={e => setForm(f => ({ ...f, attivo: e.target.checked }))} className="rounded" />
                <label htmlFor="att" className="text-sm text-gray-700">Attivo</label>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="pub" checked={form.profiloPublico} onChange={e => setForm(f => ({ ...f, profiloPublico: e.target.checked }))} className="rounded" />
                <label htmlFor="pub" className="text-sm text-gray-700 flex items-center gap-1"><Globe className="w-3.5 h-3.5 text-sky-500" /> Profilo pubblico</label>
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setModal(null)} className="flex-1 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50">Annulla</button>
              <button onClick={save} disabled={saving || !form.nome || !form.cognome} className="flex-1 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium disabled:opacity-50">
                {saving ? 'Salvataggio...' : 'Salva'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function DisponibilitaPanel({ terapistaId, slots, onRefresh }: { terapistaId: string; slots: DisponibilitaSlot[]; onRefresh: () => void }) {
  const [adding, setAdding] = useState(false)
  const [newSlot, setNewSlot] = useState({ tipo: 'SETTIMANALE', giorno: '0', data: '', orarioInizio: '09:00', orarioFine: '18:00' })
  const [saving, setSaving] = useState(false)

  const addSlot = async () => {
    setSaving(true)
    await fetch(`/api/host/spa/terapisti/${terapistaId}/disponibilita`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tipo: newSlot.tipo, giorno: newSlot.tipo === 'SETTIMANALE' ? Number(newSlot.giorno) : null, data: (newSlot.tipo === 'SPECIFICA' || newSlot.tipo === 'BLOCCO') ? newSlot.data : null, orarioInizio: newSlot.orarioInizio, orarioFine: newSlot.orarioFine }),
    })
    setAdding(false); onRefresh(); setSaving(false)
  }

  const removeSlot = async (slotId: string) => {
    await fetch(`/api/host/spa/terapisti/${terapistaId}/disponibilita/${slotId}`, { method: 'DELETE' })
    onRefresh()
  }

  const settimanali = slots.filter(s => s.tipo === 'SETTIMANALE').sort((a, b) => (a.giorno ?? 0) - (b.giorno ?? 0))
  const specifiche = slots.filter(s => s.tipo === 'SPECIFICA')
  const blocchi = slots.filter(s => s.tipo === 'BLOCCO')

  return (
    <div className="px-4 pb-4 space-y-3">
      <div className="bg-gray-50 rounded-xl p-3 space-y-2">
        <div className="text-xs font-semibold text-gray-500 uppercase flex items-center justify-between">
          <span>Orario settimanale</span>
          <button onClick={() => { setNewSlot(s => ({ ...s, tipo: 'SETTIMANALE' })); setAdding(true) }} className="flex items-center gap-1 text-brand-600 hover:text-brand-700 text-xs font-medium"><Plus className="w-3 h-3" /> Aggiungi</button>
        </div>
        {settimanali.length === 0 ? (
          <div className="text-xs text-gray-400 italic">Nessuna fascia oraria configurata</div>
        ) : (
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: 7 }, (_, g) => {
              const fasce = settimanali.filter(s => s.giorno === g)
              return (
                <div key={g} className={cn('rounded-lg p-1.5 text-center text-xs', fasce.length > 0 ? 'bg-green-100' : 'bg-white border border-gray-200')}>
                  <div className={cn('font-semibold mb-0.5', fasce.length > 0 ? 'text-green-700' : 'text-gray-400')}>{GIORNI[g].slice(0, 3)}</div>
                  {fasce.map(f => (
                    <div key={f.id} className="relative group">
                      <div className="text-green-600 leading-tight text-[10px]">{f.orarioInizio}–{f.orarioFine}</div>
                      <button onClick={() => removeSlot(f.id)} className="absolute -top-1 -right-1 hidden group-hover:flex w-4 h-4 bg-red-500 text-white rounded-full items-center justify-center">
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {(specifiche.length > 0 || blocchi.length > 0) && (
        <div className="space-y-1">
          {specifiche.map(s => (
            <div key={s.id} className="flex items-center justify-between text-xs bg-blue-50 rounded-lg px-3 py-1.5">
              <span className="text-blue-700 font-medium">📅 {s.data ? new Date(s.data).toLocaleDateString('it') : '—'}: {s.orarioInizio}–{s.orarioFine}</span>
              <button onClick={() => removeSlot(s.id)} className="text-red-400 hover:text-red-600 ml-2"><X className="w-3 h-3" /></button>
            </div>
          ))}
          {blocchi.map(s => (
            <div key={s.id} className="flex items-center justify-between text-xs bg-red-50 rounded-lg px-3 py-1.5">
              <span className="text-red-700 font-medium">🔒 {s.data ? new Date(s.data).toLocaleDateString('it') : '—'}: {s.orarioInizio}–{s.orarioFine}</span>
              <button onClick={() => removeSlot(s.id)} className="text-red-400 hover:text-red-600 ml-2"><X className="w-3 h-3" /></button>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <button onClick={() => { setNewSlot(s => ({ ...s, tipo: 'SPECIFICA' })); setAdding(true) }} className="text-xs text-blue-600 border border-blue-200 rounded-lg px-3 py-1.5 hover:bg-blue-50 flex items-center gap-1"><Plus className="w-3 h-3" /> Data specifica</button>
        <button onClick={() => { setNewSlot(s => ({ ...s, tipo: 'BLOCCO' })); setAdding(true) }} className="text-xs text-red-600 border border-red-200 rounded-lg px-3 py-1.5 hover:bg-red-50 flex items-center gap-1"><Plus className="w-3 h-3" /> Blocco/Ferie</button>
      </div>

      {adding && (
        <div className="bg-white border border-gray-200 rounded-xl p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-700">{newSlot.tipo === 'SETTIMANALE' ? '➕ Fascia settimanale' : newSlot.tipo === 'SPECIFICA' ? '📅 Data specifica' : '🔒 Blocco'}</span>
            <button onClick={() => setAdding(false)} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
          </div>
          {newSlot.tipo === 'SETTIMANALE' ? (
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Giorno</label>
              <select value={newSlot.giorno} onChange={e => setNewSlot(s => ({ ...s, giorno: e.target.value }))} className="w-full text-sm border border-gray-200 rounded-lg px-2 py-1.5">
                {GIORNI.map((g, i) => <option key={i} value={i}>{g}</option>)}
              </select>
            </div>
          ) : (
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Data</label>
              <input type="date" value={newSlot.data} onChange={e => setNewSlot(s => ({ ...s, data: e.target.value }))} className="w-full text-sm border border-gray-200 rounded-lg px-2 py-1.5" />
            </div>
          )}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Dalle</label>
              <input type="time" value={newSlot.orarioInizio} onChange={e => setNewSlot(s => ({ ...s, orarioInizio: e.target.value }))} className="w-full text-sm border border-gray-200 rounded-lg px-2 py-1.5" />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Alle</label>
              <input type="time" value={newSlot.orarioFine} onChange={e => setNewSlot(s => ({ ...s, orarioFine: e.target.value }))} className="w-full text-sm border border-gray-200 rounded-lg px-2 py-1.5" />
            </div>
          </div>
          <button onClick={addSlot} disabled={saving} className="w-full py-1.5 bg-brand-600 hover:bg-brand-700 text-white text-xs font-medium rounded-lg disabled:opacity-50">{saving ? 'Salvataggio...' : 'Aggiungi fascia'}</button>
        </div>
      )}
    </div>
  )
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="text-xs font-medium text-gray-500 mb-1 block">{label}</label>
      <input value={value} onChange={e => onChange(e.target.value)} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500" />
    </div>
  )
}
