'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { useTranslations } from 'next-intl'
import { it } from 'date-fns/locale'
import {
  UserPlus, Trash2, ChevronDown, ChevronUp, Loader2, X,
  User, FileText, AlertTriangle,
} from 'lucide-react'

type Accompagnatore = {
  id: string
  nome: string
  cognome: string
  sesso: string | null
  dataNascita: string | null
  luogoNascita: string | null
  provinciaNascita: string | null
  nazionalita: string | null
  tipoDocumento: string | null
  numeroDocumento: string | null
  luogoRilascio: string | null
  provinciaRilascio: string | null
  email: string | null
  telefono: string | null
  note: string | null
  isMinore: boolean
}

const TIPI_DOCUMENTO = [
  { value: 'IDENTE', label: "Carta d'identità" },
  { value: 'PPORT', label: 'Passaporto' },
  { value: 'PATEN', label: 'Patente' },
  { value: 'ALTRO', label: 'Altro' },
]

const inp = 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-brand-400 focus:ring-1 focus:ring-brand-400 outline-none'

export default function AccompagnatoriSection({
  prenotazioneId,
  accompagnatoriIniziali,
  numOspiti,
}: {
  prenotazioneId: string
  accompagnatoriIniziali: Accompagnatore[]
  numOspiti: number
}) {
  const [lista, setLista] = useState<Accompagnatore[]>(accompagnatoriIniziali)
  const [showForm, setShowForm] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [errore, setErrore] = useState<string | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  const [form, setForm] = useState({
    nome: '', cognome: '', sesso: '', dataNascita: '', luogoNascita: '',
    provinciaNascita: '', nazionalita: 'Italiana', tipoDocumento: '',
    numeroDocumento: '', luogoRilascio: '', provinciaRilascio: '',
    email: '', telefono: '', note: '', isMinore: false,
  })

  function resetForm() {
    setForm({
      nome: '', cognome: '', sesso: '', dataNascita: '', luogoNascita: '',
      provinciaNascita: '', nazionalita: 'Italiana', tipoDocumento: '',
      numeroDocumento: '', luogoRilascio: '', provinciaRilascio: '',
      email: '', telefono: '', note: '', isMinore: false,
    })
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!form.nome || !form.cognome) { setErrore('Nome e cognome obbligatori'); return }
    setLoading(true); setErrore(null)
    try {
      const res = await fetch(`/api/host/prenotazioni/${prenotazioneId}/accompagnatori`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          sesso: form.sesso || null,
          dataNascita: form.dataNascita || null,
          tipoDocumento: form.tipoDocumento || null,
        }),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        setErrore(j.error || `Errore (${res.status})`)
        setLoading(false); return
      }
      const acc = await res.json()
      setLista(prev => [...prev, acc])
      resetForm()
      setShowForm(false)
    } catch {
      setErrore('Errore di rete. Riprova.')
    }
    setLoading(false)
  }

  async function handleDelete(accId: string) {
    setErrore(null)
    try {
      const res = await fetch(`/api/host/prenotazioni/${prenotazioneId}/accompagnatori?accId=${accId}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        setErrore(j.error || `Errore eliminazione (${res.status})`)
        return
      }
      setLista(prev => prev.filter(a => a.id !== accId))
      setDeleteConfirm(null)
    } catch {
      setErrore('Errore di rete. Riprova.')
    }
  }

  const puoAggiungere = true

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-base font-semibold text-gray-900">Accompagnatori</h2>
          <p className="text-xs text-gray-400">
            {lista.length} registrat{lista.length === 1 ? 'o' : 'i'}
          </p>
        </div>
        {puoAggiungere && !showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-brand-600 border border-brand-200 rounded-lg hover:bg-brand-50 transition-colors"
          >
            <UserPlus className="w-3.5 h-3.5" /> Aggiungi
          </button>
        )}
      </div>

      {errore && (
        <div className="flex items-center gap-2 px-3 py-2 mb-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
          <AlertTriangle className="w-4 h-4 shrink-0" /> {errore}
          <button onClick={() => setErrore(null)} className="ml-auto p-0.5 hover:bg-red-100 rounded"><X className="w-3.5 h-3.5" /></button>
        </div>
      )}

      {/* Lista accompagnatori */}
      {lista.length === 0 && !showForm && (
        <p className="text-sm text-gray-400 italic py-2">Nessun accompagnatore registrato.</p>
      )}

      <div className="space-y-2">
        {lista.map(acc => (
          <div key={acc.id} className="border border-gray-200 rounded-lg overflow-hidden">
            <button
              onClick={() => setExpandedId(expandedId === acc.id ? null : acc.id)}
              className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-gray-50 transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center shrink-0">
                <User className="w-4 h-4 text-brand-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900">
                  {acc.nome} {acc.cognome}
                  {acc.isMinore && <span className="ml-1.5 text-[10px] font-medium text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">Minore</span>}
                </p>
                <p className="text-xs text-gray-500">
                  {[
                    acc.nazionalita,
                    acc.dataNascita && format(new Date(acc.dataNascita), 'd MMM yyyy', { locale: it }),
                    acc.tipoDocumento && TIPI_DOCUMENTO.find(t => t.value === acc.tipoDocumento)?.label,
                  ].filter(Boolean).join(' · ') || 'Dati parziali'}
                </p>
              </div>
              {expandedId === acc.id ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
            </button>

            {expandedId === acc.id && (
              <div className="px-3 pb-3 pt-1 border-t border-gray-100 bg-gray-50">
                <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                  {acc.sesso && <><dt className="text-gray-500">Sesso</dt><dd className="text-gray-900">{acc.sesso === 'M' ? 'Maschio' : 'Femmina'}</dd></>}
                  {acc.dataNascita && <><dt className="text-gray-500">Data nascita</dt><dd className="text-gray-900">{format(new Date(acc.dataNascita), 'd/MM/yyyy')}</dd></>}
                  {acc.luogoNascita && <><dt className="text-gray-500">Luogo nascita</dt><dd className="text-gray-900">{acc.luogoNascita}{acc.provinciaNascita ? ` (${acc.provinciaNascita})` : ''}</dd></>}
                  {acc.nazionalita && <><dt className="text-gray-500">Nazionalità</dt><dd className="text-gray-900">{acc.nazionalita}</dd></>}
                  {acc.tipoDocumento && <><dt className="text-gray-500">Documento</dt><dd className="text-gray-900">{TIPI_DOCUMENTO.find(t => t.value === acc.tipoDocumento)?.label} {acc.numeroDocumento}</dd></>}
                  {acc.luogoRilascio && <><dt className="text-gray-500">Rilasciato a</dt><dd className="text-gray-900">{acc.luogoRilascio}{acc.provinciaRilascio ? ` (${acc.provinciaRilascio})` : ''}</dd></>}
                  {acc.email && <><dt className="text-gray-500">Email</dt><dd className="text-gray-900">{acc.email}</dd></>}
                  {acc.telefono && <><dt className="text-gray-500">Telefono</dt><dd className="text-gray-900">{acc.telefono}</dd></>}
                  {acc.note && <><dt className="text-gray-500 col-span-2">Note</dt><dd className="text-gray-700 col-span-2">{acc.note}</dd></>}
                </dl>
                <div className="mt-3 flex justify-end">
                  {deleteConfirm === acc.id ? (
                    <div className="flex gap-2">
                      <button onClick={() => handleDelete(acc.id)} className="px-3 py-1 text-xs font-medium bg-red-500 text-white rounded-lg">Conferma</button>
                      <button onClick={() => setDeleteConfirm(null)} className="px-3 py-1 text-xs font-medium border border-gray-200 rounded-lg">Annulla</button>
                    </div>
                  ) : (
                    <button onClick={() => setDeleteConfirm(acc.id)} className="flex items-center gap-1 text-xs text-gray-400 hover:text-red-500 transition-colors">
                      <Trash2 className="w-3.5 h-3.5" /> Rimuovi
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Form nuovo accompagnatore */}
      {showForm && (
        <form onSubmit={handleAdd} className="mt-3 border border-brand-200 rounded-lg p-4 bg-brand-50/30 space-y-3">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-brand-500" /> Nuovo accompagnatore
            </h3>
            <button type="button" onClick={() => { setShowForm(false); resetForm() }} className="p-1 hover:bg-gray-100 rounded">
              <X className="w-4 h-4 text-gray-400" />
            </button>
          </div>

          {/* Anagrafica base */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Nome *</label>
              <input type="text" value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} className={inp} required />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Cognome *</label>
              <input type="text" value={form.cognome} onChange={e => setForm(f => ({ ...f, cognome: e.target.value }))} className={inp} required />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Sesso</label>
              <select value={form.sesso} onChange={e => setForm(f => ({ ...f, sesso: e.target.value }))} className={inp}>
                <option value="">—</option>
                <option value="M">M</option>
                <option value="F">F</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Data nascita</label>
              <input type="date" value={form.dataNascita} onChange={e => setForm(f => ({ ...f, dataNascita: e.target.value }))} className={inp} />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Nazionalità</label>
              <input type="text" value={form.nazionalita} onChange={e => setForm(f => ({ ...f, nazionalita: e.target.value }))} className={inp} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Luogo nascita</label>
              <input type="text" value={form.luogoNascita} onChange={e => setForm(f => ({ ...f, luogoNascita: e.target.value }))} className={inp} placeholder="Comune" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Prov. nascita</label>
              <input type="text" value={form.provinciaNascita} onChange={e => setForm(f => ({ ...f, provinciaNascita: e.target.value.toUpperCase().slice(0, 2) }))} className={inp} placeholder="RM" maxLength={2} />
            </div>
          </div>

          {/* Documento */}
          <div className="pt-2 border-t border-gray-200">
            <p className="text-xs font-medium text-gray-500 mb-2 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5" /> Documento (per Alloggiati Web)
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Tipo documento</label>
                <select value={form.tipoDocumento} onChange={e => setForm(f => ({ ...f, tipoDocumento: e.target.value }))} className={inp}>
                  <option value="">—</option>
                  {TIPI_DOCUMENTO.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Numero</label>
                <input type="text" value={form.numeroDocumento} onChange={e => setForm(f => ({ ...f, numeroDocumento: e.target.value }))} className={inp} />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Luogo rilascio</label>
                <input type="text" value={form.luogoRilascio} onChange={e => setForm(f => ({ ...f, luogoRilascio: e.target.value }))} className={inp} />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Prov. rilascio</label>
                <input type="text" value={form.provinciaRilascio} onChange={e => setForm(f => ({ ...f, provinciaRilascio: e.target.value.toUpperCase().slice(0, 2) }))} className={inp} maxLength={2} />
              </div>
            </div>
          </div>

          {/* Extra */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Email</label>
              <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className={inp} />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Telefono</label>
              <input type="tel" value={form.telefono} onChange={e => setForm(f => ({ ...f, telefono: e.target.value }))} className={inp} />
            </div>
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.isMinore} onChange={e => setForm(f => ({ ...f, isMinore: e.target.checked }))} className="w-4 h-4 rounded accent-brand-500" />
            <span className="text-xs text-gray-700">Minore di 18 anni</span>
          </label>

          <div className="flex gap-2 pt-1">
            <button type="submit" disabled={loading} className="flex-1 btn-primary flex items-center justify-center gap-2 text-sm py-2">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
              {loading ? 'Salvo...' : 'Aggiungi'}
            </button>
            <button type="button" onClick={() => { setShowForm(false); resetForm() }} className="btn-secondary text-sm py-2">
              Annulla
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
