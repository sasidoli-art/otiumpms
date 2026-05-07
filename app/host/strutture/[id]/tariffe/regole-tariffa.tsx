'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Plus, Trash2, X, Pencil, Zap, Calendar, Sun, Star,
  ToggleLeft, ToggleRight, Loader2, Percent, Euro,
} from 'lucide-react'

type Unita = { id: string; nome: string }

type Regola = {
  id: string
  strutturaId: string
  unitaId: string | null
  nome: string
  tipo: 'WEEKEND' | 'STAGIONE' | 'FESTIVO' | 'DURATA' | 'EARLY_BIRD' | 'LAST_MINUTE'
  attiva: boolean
  priorita: number
  modificatore: 'PERCENTUALE' | 'FISSO'
  valore: number
  meseInizio: number | null
  giornoInizio: number | null
  meseFine: number | null
  giornoFine: number | null
  giorniSettimana: number[]
  nottiMinime: number | null
  giorniMinimi: number | null
  giorniMassimi: number | null
  unita: { nome: string } | null
}

const GIORNI = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom']
const MESI = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic']

const TIPO_ICONA: Record<string, typeof Sun> = {
  WEEKEND: Sun,
  STAGIONE: Calendar,
  FESTIVO: Star,
}

const TIPO_LABEL: Record<string, string> = {
  WEEKEND: 'Giorni settimana',
  STAGIONE: 'Stagione',
  FESTIVO: 'Festivo',
}

const TIPO_COLORE: Record<string, string> = {
  WEEKEND: 'bg-orange-100 text-orange-700',
  STAGIONE: 'bg-blue-100 text-blue-700',
  FESTIVO: 'bg-purple-100 text-purple-700',
}

function descriviRegola(r: Regola): string {
  const mod = r.modificatore === 'PERCENTUALE' ? `+${r.valore}%` : `+€${r.valore}`
  if (r.tipo === 'WEEKEND') {
    const giorni = r.giorniSettimana.map(g => GIORNI[g]).join(', ')
    return `${mod} ogni ${giorni}`
  }
  if (r.tipo === 'STAGIONE') {
    return `${mod} dal ${r.giornoInizio ?? 1} ${MESI[(r.meseInizio ?? 1) - 1]} al ${r.giornoFine ?? 1} ${MESI[(r.meseFine ?? 1) - 1]}`
  }
  return mod
}

export default function RegoleTariffaManager({
  strutturaId,
  unita,
  regole: regoleProp,
}: {
  strutturaId: string
  unita: Unita[]
  regole: Regola[]
}) {
  const [regole, setRegole] = useState(regoleProp)
  const [modalAperto, setModalAperto] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const [form, setForm] = useState({
    unitaId: '',
    nome: '',
    tipo: 'WEEKEND' as 'WEEKEND' | 'STAGIONE' | 'FESTIVO' | 'DURATA' | 'EARLY_BIRD' | 'LAST_MINUTE',
    modificatore: 'PERCENTUALE' as 'PERCENTUALE' | 'FISSO',
    valore: '',
    meseInizio: '6',
    giornoInizio: '1',
    meseFine: '9',
    giornoFine: '30',
    giorniSettimana: [4, 5] as number[], // Ven+Sab default
    priorita: '0',
  })
  const [formError, setFormError] = useState('')

  function resetForm() {
    setForm({
      unitaId: '', nome: '', tipo: 'WEEKEND', modificatore: 'PERCENTUALE',
      valore: '', meseInizio: '6', giornoInizio: '1', meseFine: '9', giornoFine: '30',
      giorniSettimana: [4, 5], priorita: '0',
    })
    setFormError('')
  }

  function apriNuova() {
    resetForm()
    setEditId(null)
    setModalAperto(true)
  }

  function apriEdit(r: Regola) {
    setForm({
      unitaId: r.unitaId ?? '',
      nome: r.nome,
      tipo: r.tipo,
      modificatore: r.modificatore,
      valore: String(r.valore),
      meseInizio: String(r.meseInizio ?? 6),
      giornoInizio: String(r.giornoInizio ?? 1),
      meseFine: String(r.meseFine ?? 9),
      giornoFine: String(r.giornoFine ?? 30),
      giorniSettimana: r.giorniSettimana,
      priorita: String(r.priorita),
    })
    setFormError('')
    setEditId(r.id)
    setModalAperto(true)
  }

  function toggleGiorno(g: number) {
    setForm(f => ({
      ...f,
      giorniSettimana: f.giorniSettimana.includes(g)
        ? f.giorniSettimana.filter(x => x !== g)
        : [...f.giorniSettimana, g].sort(),
    }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setFormError('')

    const payload = {
      unitaId: form.unitaId || null,
      nome: form.nome,
      tipo: form.tipo,
      modificatore: form.modificatore,
      valore: Number(form.valore),
      meseInizio: form.tipo === 'STAGIONE' ? Number(form.meseInizio) : null,
      giornoInizio: form.tipo === 'STAGIONE' ? Number(form.giornoInizio) : null,
      meseFine: form.tipo === 'STAGIONE' ? Number(form.meseFine) : null,
      giornoFine: form.tipo === 'STAGIONE' ? Number(form.giornoFine) : null,
      giorniSettimana: form.tipo === 'WEEKEND' ? form.giorniSettimana : [],
      priorita: Number(form.priorita),
    }

    const url = editId
      ? `/api/host/strutture/${strutturaId}/regole-tariffa?regolaId=${editId}`
      : `/api/host/strutture/${strutturaId}/regole-tariffa`

    const res = await fetch(url, {
      method: editId ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    if (!res.ok) {
      const j = await res.json()
      setFormError(j.error || 'Errore')
      setLoading(false)
      return
    }

    const data = await res.json()
    if (editId) {
      setRegole(prev => prev.map(r => r.id === editId ? data : r))
    } else {
      setRegole(prev => [...prev, data])
    }
    setModalAperto(false)
    setEditId(null)
    router.refresh()
    setLoading(false)
  }

  async function handleToggle(r: Regola) {
    const res = await fetch(`/api/host/strutture/${strutturaId}/regole-tariffa?regolaId=${r.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ attiva: !r.attiva }),
    })
    if (res.ok) {
      const data = await res.json()
      setRegole(prev => prev.map(x => x.id === r.id ? data : x))
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Eliminare questa regola?')) return
    const res = await fetch(`/api/host/strutture/${strutturaId}/regole-tariffa?regolaId=${id}`, { method: 'DELETE' })
    if (res.ok) setRegole(prev => prev.filter(r => r.id !== id))
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
            <Zap className="w-5 h-5 text-amber-500" /> Regole automatiche
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Maggiorazioni automatiche per weekend, alta stagione e festivi. Si applicano sopra il prezzo base.
          </p>
        </div>
        <button onClick={apriNuova} className="btn-primary flex items-center gap-2 text-sm">
          <Plus className="w-4 h-4" /> Nuova regola
        </button>
      </div>

      {regole.length === 0 ? (
        <div className="card text-center py-10">
          <Zap className="w-8 h-8 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-500">Nessuna regola automatica</p>
          <p className="text-xs text-gray-400 mt-1">
            Crea regole per applicare automaticamente maggiorazioni nei weekend o in alta stagione
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {regole.map(r => {
            const Icona = TIPO_ICONA[r.tipo] ?? Zap
            return (
              <div
                key={r.id}
                className={`card flex items-center gap-4 transition-opacity ${!r.attiva ? 'opacity-50' : ''}`}
              >
                <div className={`p-2 rounded-lg shrink-0 ${TIPO_COLORE[r.tipo]}`}>
                  <Icona className="w-4 h-4" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-gray-900">{r.nome}</p>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${TIPO_COLORE[r.tipo]}`}>
                      {TIPO_LABEL[r.tipo]}
                    </span>
                    {r.unita ? (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">
                        {r.unita.nome}
                      </span>
                    ) : (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-50 text-green-700">
                        Tutte le unita
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">{descriviRegola(r)}</p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-sm font-bold text-brand-600">
                    {r.modificatore === 'PERCENTUALE' ? `+${r.valore}%` : `+€${r.valore}`}
                  </span>

                  <button
                    onClick={() => handleToggle(r)}
                    className="text-gray-400 hover:text-brand-500 transition-colors"
                    title={r.attiva ? 'Disattiva' : 'Attiva'}
                  >
                    {r.attiva ? <ToggleRight className="w-6 h-6 text-green-500" /> : <ToggleLeft className="w-6 h-6" />}
                  </button>

                  <button onClick={() => apriEdit(r)} className="p-1.5 text-gray-400 hover:text-brand-500 rounded transition-colors">
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(r.id)} className="p-1.5 text-gray-400 hover:text-red-500 rounded transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal crea/modifica */}
      {modalAperto && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-gray-100 sticky top-0 bg-white">
              <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <Zap className="w-5 h-5 text-amber-500" />
                {editId ? 'Modifica regola' : 'Nuova regola'}
              </h3>
              <button onClick={() => { setModalAperto(false); setEditId(null) }} className="p-1 rounded hover:bg-gray-100 text-gray-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              {formError && <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg">{formError}</div>}

              <div>
                <label className="label">Nome regola *</label>
                <input
                  value={form.nome}
                  onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
                  className="input" required
                  placeholder="es. Weekend +20%, Alta stagione agosto"
                />
              </div>

              <div>
                <label className="label">Tipo *</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['WEEKEND', 'STAGIONE', 'FESTIVO'] as const).map(t => {
                    const Ic = TIPO_ICONA[t]
                    return (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setForm(f => ({ ...f, tipo: t }))}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
                          form.tipo === t
                            ? 'border-brand-500 bg-brand-50 text-brand-700'
                            : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                        }`}
                      >
                        <Ic className="w-4 h-4" /> {TIPO_LABEL[t]}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Giorni settimana (WEEKEND) */}
              {form.tipo === 'WEEKEND' && (
                <div>
                  <label className="label">Giorni della settimana *</label>
                  <div className="flex gap-1.5">
                    {GIORNI.map((g, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => toggleGiorno(i)}
                        className={`w-10 h-10 rounded-lg text-xs font-semibold transition-colors ${
                          form.giorniSettimana.includes(i)
                            ? 'bg-brand-500 text-white'
                            : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                        }`}
                      >
                        {g}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Periodo (STAGIONE) */}
              {form.tipo === 'STAGIONE' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label">Da</label>
                    <div className="flex gap-1.5">
                      <input
                        type="number" min={1} max={31}
                        value={form.giornoInizio}
                        onChange={e => setForm(f => ({ ...f, giornoInizio: e.target.value }))}
                        className="input w-16 text-center" placeholder="GG"
                      />
                      <select
                        value={form.meseInizio}
                        onChange={e => setForm(f => ({ ...f, meseInizio: e.target.value }))}
                        className="input flex-1"
                      >
                        {MESI.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="label">A</label>
                    <div className="flex gap-1.5">
                      <input
                        type="number" min={1} max={31}
                        value={form.giornoFine}
                        onChange={e => setForm(f => ({ ...f, giornoFine: e.target.value }))}
                        className="input w-16 text-center" placeholder="GG"
                      />
                      <select
                        value={form.meseFine}
                        onChange={e => setForm(f => ({ ...f, meseFine: e.target.value }))}
                        className="input flex-1"
                      >
                        {MESI.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* Modificatore */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Tipo maggiorazione *</label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setForm(f => ({ ...f, modificatore: 'PERCENTUALE' }))}
                      className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
                        form.modificatore === 'PERCENTUALE'
                          ? 'border-brand-500 bg-brand-50 text-brand-700'
                          : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                      }`}
                    >
                      <Percent className="w-3.5 h-3.5" /> %
                    </button>
                    <button
                      type="button"
                      onClick={() => setForm(f => ({ ...f, modificatore: 'FISSO' }))}
                      className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
                        form.modificatore === 'FISSO'
                          ? 'border-brand-500 bg-brand-50 text-brand-700'
                          : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                      }`}
                    >
                      <Euro className="w-3.5 h-3.5" /> Fisso
                    </button>
                  </div>
                </div>
                <div>
                  <label className="label">Valore *</label>
                  <div className="relative">
                    {form.modificatore === 'PERCENTUALE' ? (
                      <Percent className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    ) : (
                      <Euro className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    )}
                    <input
                      type="number" step="0.01" min={0}
                      value={form.valore}
                      onChange={e => setForm(f => ({ ...f, valore: e.target.value }))}
                      className="input pl-9" required
                      placeholder={form.modificatore === 'PERCENTUALE' ? 'es. 20' : 'es. 30'}
                    />
                  </div>
                </div>
              </div>

              {/* Unita (opzionale) */}
              <div>
                <label className="label">Applica a</label>
                <select
                  value={form.unitaId}
                  onChange={e => setForm(f => ({ ...f, unitaId: e.target.value }))}
                  className="input"
                >
                  <option value="">Tutte le unita della struttura</option>
                  {unita.map(u => <option key={u.id} value={u.id}>{u.nome}</option>)}
                </select>
              </div>

              {/* Priorita */}
              <div>
                <label className="label">Priorita (0 = bassa, 10 = alta)</label>
                <input
                  type="number" min={0} max={10}
                  value={form.priorita}
                  onChange={e => setForm(f => ({ ...f, priorita: e.target.value }))}
                  className="input w-24"
                />
                <p className="text-xs text-gray-400 mt-1">Se piu regole si sovrappongono, vince quella con priorita piu alta</p>
              </div>

              <div className="flex gap-3 pt-1">
                <button type="submit" disabled={loading} className="flex-1 btn-primary flex items-center justify-center gap-2">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                  {loading ? 'Salvo...' : editId ? 'Salva modifiche' : 'Crea regola'}
                </button>
                <button type="button" onClick={() => { setModalAperto(false); setEditId(null) }} className="btn-secondary">
                  Annulla
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
