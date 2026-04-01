'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import {
  Plus, Trash2, Tag, ChevronLeft, ChevronRight,
  LayoutList, CalendarDays, X, Euro, Pencil
} from 'lucide-react'
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval,
  getDay, addMonths, subMonths, isWithinInterval,
  isSameDay, isBefore, isAfter, startOfDay
} from 'date-fns'
import { it } from 'date-fns/locale'

type Unita = { id: string; nome: string; prezzoBase: number }

type Tariffa = {
  id: string
  unitaId: string
  nome: string
  dataInizio: Date | string
  dataFine: Date | string
  prezzo: number
  colore: string | null
  unita: { nome: string }
}

const COLORI = [
  { label: 'Indaco',    value: '#6366f1' },
  { label: 'Viola',     value: '#8b5cf6' },
  { label: 'Rosa',      value: '#ec4899' },
  { label: 'Rosso',     value: '#ef4444' },
  { label: 'Arancione', value: '#f97316' },
  { label: 'Giallo',    value: '#eab308' },
  { label: 'Verde',     value: '#22c55e' },
  { label: 'Celeste',   value: '#06b6d4' },
]

const GIORNI_SETTIMANA = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom']

// Converte getDay (0=dom) in indice Lun=0
function lunedi0(d: Date) {
  const g = getDay(d)
  return g === 0 ? 6 : g - 1
}

export default function TariffeManager({
  strutturaId,
  unita,
  tariffe: tariffeProp,
}: {
  strutturaId: string
  unita: Unita[]
  tariffe: Tariffa[]
}) {
  const [tariffe, setTariffe] = useState(tariffeProp)
  const [vista, setVista] = useState<'calendario' | 'lista'>('calendario')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  // ── Stato calendario ──────────────────────────────────────────
  const [meseCorrente, setMeseCorrente] = useState(() => startOfMonth(new Date()))
  const [rangeStart, setRangeStart] = useState<Date | null>(null)
  const [rangeHover, setRangeHover] = useState<Date | null>(null)
  const [filtroUnita, setFiltroUnita] = useState<string>('all')

  // ── Stato form (crea) ─────────────────────────────────────────
  const [modalAperto, setModalAperto] = useState(false)
  const [formData, setFormData] = useState({
    unitaId: unita[0]?.id ?? '',
    nome: '',
    dataInizio: '',
    dataFine: '',
    prezzo: '',
    colore: '#6366f1',
  })
  const [formError, setFormError] = useState('')

  // ── Stato modal edit ──────────────────────────────────────────
  const [editId, setEditId] = useState<string | null>(null)
  const [editData, setEditData] = useState({
    unitaId: '',
    nome: '',
    dataInizio: '',
    dataFine: '',
    prezzo: '',
    colore: '#6366f1',
  })
  const [editError, setEditError] = useState('')

  // ── Helpers ───────────────────────────────────────────────────
  const fmt = (d: Date | string) =>
    format(new Date(d as string), 'd MMM yyyy', { locale: it })
  const toISO = (d: Date) => format(d, 'yyyy-MM-dd')

  function apriForm(inizio?: Date, fine?: Date) {
    setFormData(f => ({
      ...f,
      dataInizio: inizio ? toISO(inizio) : '',
      dataFine: fine ? toISO(fine) : '',
    }))
    setFormError('')
    setModalAperto(true)
  }

  // ── Calendario ────────────────────────────────────────────────
  const giorniMese = eachDayOfInterval({
    start: startOfMonth(meseCorrente),
    end: endOfMonth(meseCorrente),
  })
  const offsetInizio = lunedi0(startOfMonth(meseCorrente))
  const tariffeFiltrate = filtroUnita === 'all' ? tariffe : tariffe.filter(t => t.unitaId === filtroUnita)

  function tariffeDel(giorno: Date): Tariffa[] {
    return tariffeFiltrate.filter(t => {
      const inizio = startOfDay(new Date(t.dataInizio as string))
      const fine = startOfDay(new Date(t.dataFine as string))
      return isWithinInterval(giorno, { start: inizio, end: fine })
    })
  }

  function isInRange(giorno: Date): boolean {
    if (!rangeStart) return false
    const end = rangeHover ?? rangeStart
    const [a, b] = isBefore(rangeStart, end) ? [rangeStart, end] : [end, rangeStart]
    return isWithinInterval(giorno, { start: a, end: b })
  }

  function clickGiorno(giorno: Date) {
    if (!rangeStart) {
      setRangeStart(giorno)
    } else {
      const [inizio, fine] = isBefore(rangeStart, giorno)
        ? [rangeStart, giorno]
        : [giorno, rangeStart]
      setRangeStart(null)
      setRangeHover(null)
      apriForm(inizio, fine)
    }
  }

  // ── API ───────────────────────────────────────────────────────
  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setFormError('')
    const res = await fetch(`/api/host/strutture/${strutturaId}/tariffe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData),
    })
    if (!res.ok) {
      const j = await res.json()
      setFormError(j.error || 'Errore durante il salvataggio')
      setLoading(false); return
    }
    const nuova = await res.json()
    const unitaNome = unita.find(u => u.id === formData.unitaId)?.nome ?? ''
    setTariffe(prev => [...prev, { ...nuova, unita: { nome: unitaNome } }])
    setModalAperto(false)
    router.refresh()
    setLoading(false)
  }

  async function handleDelete(id: string) {
    if (!confirm('Eliminare questa tariffa?')) return
    const res = await fetch(`/api/host/strutture/${strutturaId}/tariffe?tariffaId=${id}`, { method: 'DELETE' })
    if (res.ok) setTariffe(prev => prev.filter(t => t.id !== id))
  }

  function apriEdit(t: Tariffa) {
    setEditId(t.id)
    setEditError('')
    setEditData({
      unitaId: t.unitaId,
      nome: t.nome,
      dataInizio: toISO(new Date(t.dataInizio as string)),
      dataFine: toISO(new Date(t.dataFine as string)),
      prezzo: String(t.prezzo),
      colore: t.colore ?? '#6366f1',
    })
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault()
    if (!editId) return
    setLoading(true); setEditError('')
    const res = await fetch(`/api/host/strutture/${strutturaId}/tariffe?tariffaId=${editId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editData),
    })
    if (!res.ok) {
      const j = await res.json()
      setEditError(j.error || 'Errore durante il salvataggio')
      setLoading(false); return
    }
    const aggiornata = await res.json()
    const unitaNome = unita.find(u => u.id === editData.unitaId)?.nome ?? ''
    setTariffe(prev => prev.map(t => t.id === editId ? { ...aggiornata, unita: { nome: unitaNome } } : t))
    setEditId(null)
    router.refresh()
    setLoading(false)
  }

  // ─────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center bg-gray-100 rounded-lg p-1 gap-1">
          <button
            onClick={() => setVista('calendario')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-medium transition-colors ${
              vista === 'calendario' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <CalendarDays className="w-4 h-4" /> Calendario
          </button>
          <button
            onClick={() => setVista('lista')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-medium transition-colors ${
              vista === 'lista' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <LayoutList className="w-4 h-4" /> Lista
          </button>
        </div>

        {vista === 'calendario' && unita.length > 1 && (
          <select
            value={filtroUnita}
            onChange={e => setFiltroUnita(e.target.value)}
            className="input text-sm py-1.5 w-auto"
          >
            <option value="all">Tutte le unità</option>
            {unita.map(u => <option key={u.id} value={u.id}>{u.nome}</option>)}
          </select>
        )}

        <button onClick={() => apriForm()} className="btn-primary flex items-center gap-2 text-sm">
          <Plus className="w-4 h-4" /> Nuova tariffa
        </button>
      </div>

      {/* ── CALENDARIO ─────────────────────────────────────── */}
      {vista === 'calendario' && (
        <div className="card p-0 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
            <button onClick={() => setMeseCorrente(m => subMonths(m, 1))} className="p-1.5 rounded hover:bg-gray-100 text-gray-500">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <h3 className="text-sm font-bold text-gray-900 capitalize">
              {format(meseCorrente, 'MMMM yyyy', { locale: it })}
            </h3>
            <button onClick={() => setMeseCorrente(m => addMonths(m, 1))} className="p-1.5 rounded hover:bg-gray-100 text-gray-500">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="px-5 py-2 bg-brand-500/5 text-xs text-brand-600">
            {rangeStart
              ? `📅 Hai selezionato il ${format(rangeStart, 'd MMM', { locale: it })} — clicca su un altro giorno per chiudere il periodo`
              : '👆 Clicca su un giorno per iniziare a selezionare un periodo'}
          </div>

          <div className="px-3 pt-2 grid grid-cols-7">
            {GIORNI_SETTIMANA.map(g => (
              <div key={g} className="text-center text-xs font-semibold text-gray-400 py-1">{g}</div>
            ))}
          </div>

          <div className="px-3 pb-3 grid grid-cols-7 gap-1">
            {Array.from({ length: offsetInizio }).map((_, i) => <div key={`off-${i}`} />)}
            {giorniMese.map(giorno => {
              const tg = tariffeDel(giorno)
              const inRange = isInRange(giorno)
              const isStart = rangeStart ? isSameDay(giorno, rangeStart) : false
              const isHover = rangeHover ? isSameDay(giorno, rangeHover) : false
              const isToday = isSameDay(giorno, new Date())

              return (
                <button
                  key={giorno.toISOString()}
                  onClick={() => clickGiorno(giorno)}
                  onMouseEnter={() => { if (rangeStart) setRangeHover(giorno) }}
                  onMouseLeave={() => { if (rangeStart) setRangeHover(null) }}
                  className={`
                    relative group rounded-lg p-1 min-h-[52px] flex flex-col items-center transition-all
                    ${inRange ? 'bg-brand-500/15' : 'hover:bg-gray-50'}
                    ${isStart || isHover ? 'ring-2 ring-brand-500' : ''}
                    ${isToday && !isStart ? 'ring-1 ring-brand-300' : ''}
                  `}
                >
                  <span className={`text-xs font-semibold mb-0.5 leading-tight ${isToday ? 'text-brand-600' : 'text-gray-700'}`}>
                    {format(giorno, 'd')}
                  </span>
                  <div className="w-full flex flex-col gap-0.5">
                    {tg.slice(0, 3).map(t => (
                      <div
                        key={t.id}
                        className="w-full h-1.5 rounded-full opacity-80"
                        style={{ backgroundColor: t.colore ?? '#6366f1' }}
                        title={`${t.nome} · €${t.prezzo}/notte · ${t.unita.nome}`}
                      />
                    ))}
                    {tg.length > 3 && <div className="w-full h-1.5 rounded-full bg-gray-300 opacity-60" />}
                  </div>
                  {tg.length > 0 && (
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 z-20 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity">
                      <div className="bg-gray-900 text-white text-[11px] rounded-lg px-2.5 py-1.5 whitespace-nowrap shadow-lg space-y-0.5">
                        {tg.map(t => (
                          <div key={t.id} className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: t.colore ?? '#6366f1' }} />
                            <span>{t.nome}</span>
                            <span className="opacity-70">€{t.prezzo}/notte</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </button>
              )
            })}
          </div>

          {/* Legenda mese corrente */}
          {tariffeFiltrate.filter(t => {
            const inizio = new Date(t.dataInizio as string)
            const fine = new Date(t.dataFine as string)
            return (
              isWithinInterval(startOfMonth(meseCorrente), { start: inizio, end: fine }) ||
              isWithinInterval(endOfMonth(meseCorrente), { start: inizio, end: fine }) ||
              (isBefore(inizio, startOfMonth(meseCorrente)) && isAfter(fine, endOfMonth(meseCorrente)))
            )
          }).length > 0 && (
            <div className="px-5 py-3 border-t border-gray-100 flex flex-wrap gap-x-4 gap-y-1.5">
              {tariffeFiltrate
                .filter(t => {
                  const inizio = new Date(t.dataInizio as string)
                  const fine = new Date(t.dataFine as string)
                  return (
                    isWithinInterval(startOfMonth(meseCorrente), { start: inizio, end: fine }) ||
                    isWithinInterval(endOfMonth(meseCorrente), { start: inizio, end: fine }) ||
                    (isBefore(inizio, startOfMonth(meseCorrente)) && isAfter(fine, endOfMonth(meseCorrente)))
                  )
                })
                .map(t => (
                  <div key={t.id} className="flex items-center gap-1.5 text-xs text-gray-600">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: t.colore ?? '#6366f1' }} />
                    <span className="font-medium">{t.nome}</span>
                    <span className="text-gray-400">€{t.prezzo}/notte</span>
                    {unita.length > 1 && <span className="text-gray-400">· {t.unita.nome}</span>}
                    <button onClick={() => apriEdit(t)} className="ml-1 text-gray-300 hover:text-brand-500 transition-colors">
                      <Pencil className="w-3 h-3" />
                    </button>
                    <button onClick={() => handleDelete(t.id)} className="ml-0.5 text-gray-300 hover:text-red-500 transition-colors">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}

      {/* ── LISTA ──────────────────────────────────────────── */}
      {vista === 'lista' && (
        <>
          {tariffe.length === 0 ? (
            <div className="card text-center py-12">
              <Tag className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-gray-500">Nessuna tariffa — aggiungi un periodo con prezzo speciale</p>
              <p className="text-xs text-gray-400 mt-1">Se non imposti tariffe viene usato il prezzo base dell&apos;unità</p>
            </div>
          ) : (
            <div className="card overflow-hidden p-0">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="table-th">Unità</th>
                    <th className="table-th">Nome</th>
                    <th className="table-th">Dal</th>
                    <th className="table-th">Al</th>
                    <th className="table-th text-right">Prezzo</th>
                    <th className="table-th" />
                  </tr>
                </thead>
                <tbody>
                  {tariffe.map((t) => (
                    <tr key={t.id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="table-td text-gray-600">{t.unita.nome}</td>
                      <td className="table-td">
                        <span
                          className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium text-white"
                          style={{ backgroundColor: t.colore ?? '#6366f1' }}
                        >
                          {t.nome}
                        </span>
                      </td>
                      <td className="table-td text-sm">{fmt(t.dataInizio)}</td>
                      <td className="table-td text-sm">{fmt(t.dataFine)}</td>
                      <td className="table-td text-right font-semibold text-brand-600">€{t.prezzo.toFixed(2)}</td>
                      <td className="table-td text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => apriEdit(t)} className="p-1.5 text-gray-400 hover:text-brand-500 rounded" title="Modifica tariffa">
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDelete(t.id)} className="p-1.5 text-gray-400 hover:text-red-500 rounded" title="Elimina tariffa">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* ── MODAL NUOVA TARIFFA ───────────────────────────── */}
      {modalAperto && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <Tag className="w-5 h-5 text-brand-500" /> Nuova tariffa periodo
              </h3>
              <button onClick={() => { setModalAperto(false); setRangeStart(null) }} className="p-1 rounded hover:bg-gray-100 text-gray-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAdd} className="p-5 space-y-4">
              {formError && (
                <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg">{formError}</div>
              )}

              <div>
                <label className="label">Unità *</label>
                <select
                  value={formData.unitaId}
                  onChange={e => setFormData(f => ({ ...f, unitaId: e.target.value }))}
                  required className="input"
                >
                  {unita.map(u => (
                    <option key={u.id} value={u.id}>{u.nome} (base €{u.prezzoBase}/notte)</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label">Nome tariffa *</label>
                <input
                  value={formData.nome}
                  onChange={e => setFormData(f => ({ ...f, nome: e.target.value }))}
                  required className="input"
                  placeholder="es. Alta stagione, Promo Pasqua"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Dal *</label>
                  <input type="date" value={formData.dataInizio}
                    onChange={e => setFormData(f => ({ ...f, dataInizio: e.target.value }))}
                    required className="input" />
                </div>
                <div>
                  <label className="label">Al *</label>
                  <input type="date" value={formData.dataFine}
                    onChange={e => setFormData(f => ({ ...f, dataFine: e.target.value }))}
                    required className="input" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Prezzo €/notte *</label>
                  <div className="relative">
                    <Euro className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input type="number" step="0.01" min={0} value={formData.prezzo}
                      onChange={e => setFormData(f => ({ ...f, prezzo: e.target.value }))}
                      required className="input pl-9" placeholder="0.00" />
                  </div>
                </div>
                <div>
                  <label className="label">Colore</label>
                  <div className="flex gap-1.5 flex-wrap pt-1">
                    {COLORI.map(c => (
                      <button key={c.value} type="button"
                        onClick={() => setFormData(f => ({ ...f, colore: c.value }))}
                        className={`w-6 h-6 rounded-full transition-transform ${formData.colore === c.value ? 'ring-2 ring-offset-1 ring-gray-400 scale-110' : ''}`}
                        style={{ backgroundColor: c.value }} title={c.label}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-1">
                <button type="submit" disabled={loading} className="flex-1 btn-primary">
                  {loading ? 'Salvo...' : 'Aggiungi tariffa'}
                </button>
                <button type="button" onClick={() => { setModalAperto(false); setRangeStart(null) }} className="btn-secondary">
                  Annulla
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL EDIT TARIFFA ────────────────────────────── */}
      {editId && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <Pencil className="w-5 h-5 text-brand-500" /> Modifica tariffa
              </h3>
              <button onClick={() => setEditId(null)} className="p-1 rounded hover:bg-gray-100 text-gray-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEdit} className="p-5 space-y-4">
              {editError && (
                <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg">{editError}</div>
              )}

              <div>
                <label className="label">Unità *</label>
                <select
                  value={editData.unitaId}
                  onChange={e => setEditData(f => ({ ...f, unitaId: e.target.value }))}
                  required className="input"
                >
                  {unita.map(u => (
                    <option key={u.id} value={u.id}>{u.nome} (base €{u.prezzoBase}/notte)</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label">Nome tariffa *</label>
                <input
                  value={editData.nome}
                  onChange={e => setEditData(f => ({ ...f, nome: e.target.value }))}
                  required className="input"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Dal *</label>
                  <input type="date" value={editData.dataInizio}
                    onChange={e => setEditData(f => ({ ...f, dataInizio: e.target.value }))}
                    required className="input" />
                </div>
                <div>
                  <label className="label">Al *</label>
                  <input type="date" value={editData.dataFine}
                    onChange={e => setEditData(f => ({ ...f, dataFine: e.target.value }))}
                    required className="input" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Prezzo €/notte *</label>
                  <div className="relative">
                    <Euro className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input type="number" step="0.01" min={0} value={editData.prezzo}
                      onChange={e => setEditData(f => ({ ...f, prezzo: e.target.value }))}
                      required className="input pl-9" />
                  </div>
                </div>
                <div>
                  <label className="label">Colore</label>
                  <div className="flex gap-1.5 flex-wrap pt-1">
                    {COLORI.map(c => (
                      <button key={c.value} type="button"
                        onClick={() => setEditData(f => ({ ...f, colore: c.value }))}
                        className={`w-6 h-6 rounded-full transition-transform ${editData.colore === c.value ? 'ring-2 ring-offset-1 ring-gray-400 scale-110' : ''}`}
                        style={{ backgroundColor: c.value }} title={c.label}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-1">
                <button type="submit" disabled={loading} className="flex-1 btn-primary">
                  {loading ? 'Salvo...' : 'Salva modifiche'}
                </button>
                <button type="button" onClick={() => setEditId(null)} className="btn-secondary">
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

