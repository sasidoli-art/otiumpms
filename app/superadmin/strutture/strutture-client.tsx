'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import type { BadgeVariant } from '@/components/ui/badge'
import { Building2, ExternalLink, Plus, X, Loader2, Trash2, PowerOff, Power } from 'lucide-react'

type Struttura = {
  id: string
  nome: string
  tipo: string
  citta: string | null
  attiva: boolean
  hostId: string
  host: { nomeAzienda: string }
  _count: { unita: number; prenotazioni: number }
}

type Host = { id: string; nomeAzienda: string }

const TIPO_COLORI: Record<string, BadgeVariant> = {
  EVENTO: 'purple',
  VENUE: 'blue',
  ESPERIENZA: 'orange',
  ALLOGGIO: 'green',
  SERVIZIO: 'gray',
}

const TIPI = ['ALLOGGIO', 'EVENTO', 'VENUE', 'ESPERIENZA', 'SERVIZIO'] as const

export default function StruttureClient({
  strutture,
  hosts,
  totale,
  filtroTipo,
  filtroAttiva,
  filtroHost,
}: {
  strutture: Struttura[]
  hosts: Host[]
  totale: number
  filtroTipo: string
  filtroAttiva: string
  filtroHost: string
}) {
  const [list, setList] = useState(strutture)
  const [showNew, setShowNew] = useState(false)
  const [saving, setSaving] = useState(false)
  const [toggling, setToggling] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({
    hostId: hosts[0]?.id ?? '',
    nome: '',
    tipo: 'ALLOGGIO' as (typeof TIPI)[number],
    citta: '',
    regione: '',
    indirizzo: '',
    descrizione: '',
    capacitaTotale: '1',
    prezzoBase: '0',
    numeroUnita: '0',
    prefissoUnita: 'Camera',
  })

  async function toggleAttiva(id: string, nome: string, attiva: boolean) {
    const azione = attiva ? 'disattivare' : 'attivare'
    if (!confirm(`Vuoi ${azione} la struttura "${nome}"?`)) return
    setToggling(id)
    const res = await fetch(`/api/superadmin/strutture/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ attiva: !attiva }),
    })
    if (res.ok) {
      setList(prev => prev.map(s => s.id === id ? { ...s, attiva: !attiva } : s))
    }
    setToggling(null)
  }

  async function deleteStruttura(id: string, nome: string) {
    const conferma = prompt(
      `ATTENZIONE: stai per ELIMINARE la struttura "${nome}" e TUTTE le sue unità e prenotazioni.\nQuesta operazione è IRREVERSIBILE.\n\nScrivi esattamente il nome per confermare:`
    )
    if (conferma !== nome) {
      if (conferma !== null) alert('Nome non corrisponde, operazione annullata.')
      return
    }
    setDeleting(id)
    const res = await fetch(`/api/superadmin/strutture/${id}?confirm=${encodeURIComponent(nome)}`, { method: 'DELETE' })
    setDeleting(null)
    if (res.ok) {
      setList(prev => prev.filter(s => s.id !== id))
    } else {
      alert('Errore durante l\'eliminazione.')
    }
  }

  async function salva(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!form.hostId) {
      setError('Seleziona un host')
      return
    }
    if (!form.nome.trim()) {
      setError('Nome struttura obbligatorio')
      return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/superadmin/strutture', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hostId: form.hostId,
          nome: form.nome,
          tipo: form.tipo,
          citta: form.citta || null,
          regione: form.regione || null,
          indirizzo: form.indirizzo || null,
          descrizione: form.descrizione || null,
          capacitaTotale: Number(form.capacitaTotale) || 1,
          prezzoBase: Number(form.prezzoBase) || 0,
          numeroUnita: Number(form.numeroUnita) || 0,
          prefissoUnita: form.prefissoUnita || 'Camera',
        }),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        setError(j.error || 'Errore creazione')
        return
      }
      window.location.reload()
    } catch {
      setError('Errore di rete')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Strutture</h1>
          <p className="text-sm text-gray-500">{totale} strutture totali sulla piattaforma</p>
        </div>
        <button
          onClick={() => {
            setShowNew(true)
            setError(null)
          }}
          className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
        >
          <Plus className="w-4 h-4" /> Nuova Struttura
        </button>
      </div>

      {/* Modale Nuova Struttura */}
      {showNew && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowNew(false)} />
          <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-xl p-6 max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setShowNew(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              <X size={18} />
            </button>

            <h2 className="text-lg font-bold text-gray-900 dark:text-slate-100 mb-1">
              Nuova Struttura (white-glove)
            </h2>
            <p className="text-xs text-gray-500 mb-4">
              Crea una struttura sotto un host esistente. Puoi anche creare
              automaticamente le unità iniziali.
            </p>

            <form onSubmit={salva} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">
                  Host *
                </label>
                <select
                  required
                  value={form.hostId}
                  onChange={e => setForm(f => ({ ...f, hostId: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm dark:bg-slate-800 dark:text-slate-200"
                >
                  <option value="">-- Seleziona host --</option>
                  {hosts.map(h => (
                    <option key={h.id} value={h.id}>
                      {h.nomeAzienda}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">
                    Nome struttura *
                  </label>
                  <input
                    required
                    value={form.nome}
                    onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
                    placeholder="Agriturismo Il Poggio"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm dark:bg-slate-800 dark:text-slate-200"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">
                    Tipo
                  </label>
                  <select
                    value={form.tipo}
                    onChange={e => setForm(f => ({ ...f, tipo: e.target.value as (typeof TIPI)[number] }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm dark:bg-slate-800 dark:text-slate-200"
                  >
                    {TIPI.map(t => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">
                    Città
                  </label>
                  <input
                    value={form.citta}
                    onChange={e => setForm(f => ({ ...f, citta: e.target.value }))}
                    placeholder="Siena"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm dark:bg-slate-800 dark:text-slate-200"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">
                    Regione
                  </label>
                  <input
                    value={form.regione}
                    onChange={e => setForm(f => ({ ...f, regione: e.target.value }))}
                    placeholder="Toscana"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm dark:bg-slate-800 dark:text-slate-200"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">
                  Indirizzo
                </label>
                <input
                  value={form.indirizzo}
                  onChange={e => setForm(f => ({ ...f, indirizzo: e.target.value }))}
                  placeholder="Via del Poggio 12"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm dark:bg-slate-800 dark:text-slate-200"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">
                  Descrizione
                </label>
                <textarea
                  value={form.descrizione}
                  onChange={e => setForm(f => ({ ...f, descrizione: e.target.value }))}
                  rows={2}
                  placeholder="Agriturismo in collina, colazione con prodotti propri"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm dark:bg-slate-800 dark:text-slate-200"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">
                    Capacità totale
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={form.capacitaTotale}
                    onChange={e => setForm(f => ({ ...f, capacitaTotale: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm dark:bg-slate-800 dark:text-slate-200"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">
                    Prezzo base (€)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="10"
                    value={form.prezzoBase}
                    onChange={e => setForm(f => ({ ...f, prezzoBase: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm dark:bg-slate-800 dark:text-slate-200"
                  />
                </div>
              </div>

              <div className="border-t border-gray-200 dark:border-slate-700 pt-3">
                <p className="text-xs font-semibold text-gray-600 dark:text-slate-400 mb-2">
                  Pre-crea unità (opzionale)
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-500 dark:text-slate-500 mb-1">
                      Numero unità
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="200"
                      value={form.numeroUnita}
                      onChange={e => setForm(f => ({ ...f, numeroUnita: e.target.value }))}
                      placeholder="0 = nessuna"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm dark:bg-slate-800 dark:text-slate-200"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 dark:text-slate-500 mb-1">
                      Prefisso nome
                    </label>
                    <input
                      value={form.prefissoUnita}
                      onChange={e => setForm(f => ({ ...f, prefissoUnita: e.target.value }))}
                      placeholder="Camera"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm dark:bg-slate-800 dark:text-slate-200"
                    />
                  </div>
                </div>
                {Number(form.numeroUnita) > 0 && (
                  <p className="text-[11px] text-gray-500 mt-1">
                    Verranno create: <strong>{form.prefissoUnita} 1</strong>,{' '}
                    <strong>{form.prefissoUnita} 2</strong>, ... fino a{' '}
                    <strong>
                      {form.prefissoUnita} {form.numeroUnita}
                    </strong>
                  </p>
                )}
              </div>

              {error && (
                <p className="text-sm text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400 p-2 rounded">
                  {error}
                </p>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNew(false)}
                  className="flex-1 px-4 py-2.5 rounded-lg border border-gray-200 dark:border-slate-700 text-sm font-semibold text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-700 text-white py-2.5 rounded-lg text-sm font-semibold disabled:opacity-50"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  {saving ? 'Creazione...' : 'Crea Struttura'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Filtri */}
      <div className="card">
        <form className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Tipo</label>
            <select name="tipo" defaultValue={filtroTipo} className="input text-sm">
              <option value="">Tutti</option>
              {TIPI.map(t => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Stato</label>
            <select name="attiva" defaultValue={filtroAttiva} className="input text-sm">
              <option value="">Tutti</option>
              <option value="1">Attiva</option>
              <option value="0">Inattiva</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Host</label>
            <select name="host" defaultValue={filtroHost} className="input text-sm">
              <option value="">Tutti</option>
              {hosts.map(h => (
                <option key={h.id} value={h.id}>
                  {h.nomeAzienda}
                </option>
              ))}
            </select>
          </div>
          <button type="submit" className="btn btn-primary text-sm">
            Filtra
          </button>
          <Link href="/superadmin/strutture" className="btn btn-ghost text-sm">
            Reset
          </Link>
        </form>
      </div>

      {/* Tabella */}
      <div className="card">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-slate-700">
                <th className="table-th">Nome</th>
                <th className="table-th">Tipo</th>
                <th className="table-th">Host</th>
                <th className="table-th">Città</th>
                <th className="table-th">Stato</th>
                <th className="table-th text-right">Unità</th>
                <th className="table-th text-right">Prenotazioni</th>
                <th className="table-th"></th>
              </tr>
            </thead>
            <tbody>
              {list.map(s => (
                <tr
                  key={s.id}
                  className="border-b border-gray-50 dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800/50"
                >
                  <td className="table-td">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-gray-400" />
                      <span className="font-medium text-gray-900 dark:text-slate-100">{s.nome}</span>
                    </div>
                  </td>
                  <td className="table-td">
                    <Badge variant={TIPO_COLORI[s.tipo] || 'gray'}>{s.tipo}</Badge>
                  </td>
                  <td className="table-td text-gray-600 dark:text-slate-300">{s.host.nomeAzienda}</td>
                  <td className="table-td text-gray-500">{s.citta || '—'}</td>
                  <td className="table-td">
                    <Badge variant={s.attiva ? 'green' : 'red'}>{s.attiva ? 'Attiva' : 'Inattiva'}</Badge>
                  </td>
                  <td className="table-td text-right">{s._count.unita}</td>
                  <td className="table-td text-right font-medium">{s._count.prenotazioni}</td>
                  <td className="table-td">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => toggleAttiva(s.id, s.nome, s.attiva)}
                        disabled={toggling === s.id}
                        title={s.attiva ? 'Disattiva' : 'Attiva'}
                        className={`p-1.5 rounded transition-colors ${s.attiva ? 'text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20' : 'text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20'}`}
                      >
                        {toggling === s.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : s.attiva ? <PowerOff className="w-3.5 h-3.5" /> : <Power className="w-3.5 h-3.5" />}
                      </button>
                      <button
                        onClick={() => deleteStruttura(s.id, s.nome)}
                        disabled={deleting === s.id}
                        title="Elimina struttura"
                        className="p-1.5 rounded text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                      >
                        {deleting === s.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                      </button>
                      <Link
                        href={`/superadmin/moduli?host=${s.hostId}`}
                        className="text-brand-600 hover:underline text-xs flex items-center gap-1 ml-1"
                        title="Attiva/disattiva moduli per questo host"
                      >
                        Moduli <ExternalLink className="w-3 h-3" />
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
              {list.length === 0 && (
                <tr>
                  <td colSpan={9} className="table-td text-center text-gray-400 py-8">
                    Nessuna struttura trovata
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
