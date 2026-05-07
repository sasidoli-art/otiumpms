'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { ChevronLeft, ChevronRight, Lock, Plus, Save, X, Users } from 'lucide-react'
import {
  format, addMonths, subMonths, startOfMonth, endOfMonth,
  eachDayOfInterval, isWeekend, isBefore, startOfDay,
} from 'date-fns'
import { it } from 'date-fns/locale'

type Tariffa = {
  id: string; nome: string; dataInizio: string; dataFine: string
  prezzo: number; colore: string | null
}
type Disponibilita = {
  data: string; postiDisponibili: number; postiOccupati: number; chiuso: boolean
}
type Prenotazione = {
  dataArrivo: string; dataPartenza: string | null; stato: string
  guestNome: string; guestCognome: string
}
type Unita = {
  id: string; nome: string; prezzoBase: number; capacita: number
  tariffe: Tariffa[]; disponibilita: Disponibilita[]; prenotazioni: Prenotazione[]
}
type PendingChange = { chiuso: boolean }

const COLORI = ['#6366f1', '#8b5cf6', '#ec4899', '#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4']

function prezzoEffettivo(u: Unita, dataStr: string) {
  const t = u.tariffe.find(t => dataStr >= t.dataInizio.substring(0, 10) && dataStr <= t.dataFine.substring(0, 10))
  return { prezzo: t?.prezzo ?? u.prezzoBase, tariffa: t ?? null }
}

type CellState = 'available' | 'closed' | 'occupied'

function cellState(u: Unita, dataStr: string, changes: Record<string, PendingChange>): CellState {
  const key = `${u.id}|${dataStr}`
  if (changes[key]) return changes[key].chiuso ? 'closed' : 'available'
  const disp = u.disponibilita.find(d => d.data.substring(0, 10) === dataStr)
  if (disp?.chiuso) return 'closed'
  const booked = u.prenotazioni.some(p => {
    const a = p.dataArrivo.substring(0, 10)
    const z = p.dataPartenza ? p.dataPartenza.substring(0, 10) : '9999-12-31'
    return dataStr >= a && dataStr < z
  })
  return booked ? 'occupied' : 'available'
}

export default function PannelloStanze({
  strutturaId, unitaIniziali,
}: { strutturaId: string; unitaIniziali: Unita[] }) {
  const [mese, setMese] = useState(new Date())
  const [unita, setUnita] = useState(unitaIniziali)
  const [loading, setLoading] = useState(false)
  const [changes, setChanges] = useState<Record<string, PendingChange>>({})
  const [saving, setSaving] = useState(false)
  const [savedMsg, setSavedMsg] = useState('')
  const [modal, setModal] = useState<{ unitaId: string; dataInizio: string; dataFine: string } | null>(null)
  const [modalErr, setModalErr] = useState('')
  const [savingModal, setSavingModal] = useState(false)
  const [dragStart, setDragStart] = useState<{ uid: string; data: string } | null>(null)
  const [dragEnd, setDragEnd] = useState<{ uid: string; data: string } | null>(null)
  const dragging = useRef(false)

  const chiaveMese = format(mese, 'yyyy-MM')
  const giorni = eachDayOfInterval({ start: startOfMonth(mese), end: endOfMonth(mese) })
  const oggi = format(new Date(), 'yyyy-MM-dd')

  const carica = useCallback(async () => {
    setLoading(true)
    const r = await fetch(`/api/host/strutture/${strutturaId}/pannello?mese=${chiaveMese}`)
    if (r.ok) { const d = await r.json(); setUnita(d.unita); setChanges({}) }
    setLoading(false)
  }, [strutturaId, chiaveMese])

  useEffect(() => { carica() }, [carica])

  // ─── Drag selection ───────────────────────────────────────────────────────
  function onMouseDown(uid: string, data: string) {
    if (isBefore(new Date(data), startOfDay(new Date()))) return
    dragging.current = true
    setDragStart({ uid, data })
    setDragEnd({ uid, data })
  }
  function onMouseEnter(uid: string, data: string) {
    if (!dragging.current || dragStart?.uid !== uid) return
    setDragEnd({ uid, data })
  }
  function onMouseUp() {
    if (!dragging.current || !dragStart || !dragEnd) { dragging.current = false; return }
    dragging.current = false
    const uid = dragStart.uid
    const s = dragStart.data < dragEnd.data ? dragStart.data : dragEnd.data
    const e = dragStart.data < dragEnd.data ? dragEnd.data : dragStart.data
    const u = unita.find(x => x.id === uid)!
    const firstState = cellState(u, s, changes)
    const close = firstState !== 'closed'
    const next = { ...changes }
    giorni.forEach(g => {
      const ds = format(g, 'yyyy-MM-dd')
      if (ds >= s && ds <= e) next[`${uid}|${ds}`] = { chiuso: close }
    })
    setChanges(next)
    setDragStart(null); setDragEnd(null)
  }

  function inSel(uid: string, data: string) {
    if (!dragStart || !dragEnd || dragStart.uid !== uid) return false
    const s = dragStart.data < dragEnd.data ? dragStart.data : dragEnd.data
    const e = dragStart.data < dragEnd.data ? dragEnd.data : dragStart.data
    return data >= s && data <= e
  }

  // ─── Save availability ───────────────────────────────────────────────────
  async function salva() {
    if (!Object.keys(changes).length) return
    setSaving(true)
    const byUnita: Record<string, { data: string; chiuso: boolean }[]> = {}
    Object.entries(changes).forEach(([k, v]) => {
      const [uid, data] = k.split('|')
      if (!byUnita[uid]) byUnita[uid] = []
      byUnita[uid].push({ data, chiuso: v.chiuso })
    })
    await Promise.all(Object.entries(byUnita).map(([uid, agg]) =>
      fetch(`/api/host/strutture/${strutturaId}/disponibilita`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          unitaId: uid,
          aggiornamenti: agg.map(a => ({
            data: a.data,
            chiuso: a.chiuso,
            postiDisponibili: unita.find(u => u.id === uid)?.capacita ?? 1,
          })),
        }),
      })
    ))
    setSavedMsg('✓ Salvato'); setTimeout(() => setSavedMsg(''), 2500)
    setSaving(false); carica()
  }

  // ─── Tariffa modal ────────────────────────────────────────────────────────
  async function submitTariffa(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); if (!modal) return
    setSavingModal(true); setModalErr('')
    const fd = new FormData(e.currentTarget)
    const body = Object.fromEntries(fd.entries())
    const r = await fetch(`/api/host/strutture/${strutturaId}/tariffe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...body, unitaId: modal.unitaId }),
    })
    if (!r.ok) { const j = await r.json(); setModalErr(j.error || 'Errore'); setSavingModal(false); return }
    setModal(null); setSavingModal(false); carica()
  }

  async function deleteTariffa(id: string) {
    if (!confirm('Eliminare questa tariffa?')) return
    await fetch(`/api/host/strutture/${strutturaId}/tariffe?tariffaId=${id}`, { method: 'DELETE' })
    carica()
  }

  const hasChanges = Object.keys(changes).length > 0

  return (
    <div className="space-y-4" onMouseUp={onMouseUp} onMouseLeave={onMouseUp}>
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <button onClick={() => setMese(m => subMonths(m, 1))} className="p-1.5 rounded-lg hover:bg-gray-100 border border-gray-200">
            <ChevronLeft className="w-4 h-4 text-gray-500" />
          </button>
          <span className="text-base font-bold text-gray-900 w-44 text-center capitalize">
            {format(mese, 'MMMM yyyy', { locale: it })}
          </span>
          <button onClick={() => setMese(m => addMonths(m, 1))} className="p-1.5 rounded-lg hover:bg-gray-100 border border-gray-200">
            <ChevronRight className="w-4 h-4 text-gray-500" />
          </button>
        </div>
        <div className="flex items-center gap-3">
          {/* Legenda */}
          <div className="hidden sm:flex items-center gap-3 text-xs text-gray-400">
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-100 border border-green-300" />Libero</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-100 border border-red-300" />Chiuso</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-amber-100 border border-amber-300" />Prenotato</span>
          </div>
          {savedMsg && <span className="text-sm text-green-600 font-semibold">{savedMsg}</span>}
          {hasChanges && (
            <button onClick={salva} disabled={saving} className="btn-primary flex items-center gap-2 text-sm py-1.5">
              <Save className="w-4 h-4" />
              {saving ? 'Salvo...' : `Salva (${Object.keys(changes).length})`}
            </button>
          )}
        </div>
      </div>

      <p className="text-xs text-gray-400">
        💡 <strong>Trascina</strong> sulle celle per bloccare/sbloccare più giorni. Clicca <strong>+ Tariffa</strong> per impostare un prezzo speciale. Clicca su una barra tariffa per eliminarla.
      </p>

      {loading ? (
        <div className="flex items-center justify-center h-40 text-gray-400 text-sm">Caricamento...</div>
      ) : unita.length === 0 ? (
        <div className="text-center py-16 text-gray-400 text-sm">
          Nessuna stanza/unità. Aggiungine una dal profilo della struttura.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm select-none">
          <table className="border-collapse text-sm" style={{ minWidth: `${200 + giorni.length * 44}px` }}>
            <thead>
              <tr className="bg-gray-50">
                <th className="sticky left-0 z-20 bg-gray-50 border-b border-r border-gray-200 px-4 py-3 text-left text-xs font-semibold text-gray-500 w-48 min-w-48">
                  Stanza / Unità
                </th>
                {giorni.map(g => {
                  const ds = format(g, 'yyyy-MM-dd')
                  const isWE = isWeekend(g)
                  const isToday = ds === oggi
                  return (
                    <th key={ds} className={`border-b border-r border-gray-100 text-center w-11 min-w-11 py-1.5 px-0 ${
                      isToday ? 'bg-indigo-50' : isWE ? 'bg-rose-50/50' : ''
                    }`}>
                      <div className={`text-xs font-bold ${isToday ? 'text-indigo-700' : isWE ? 'text-rose-400' : 'text-gray-500'}`}>
                        {g.getDate()}
                      </div>
                      <div className="text-gray-300 text-xs font-normal">
                        {format(g, 'EEEEE', { locale: it })}
                      </div>
                    </th>
                  )
                })}
              </tr>
            </thead>
            <tbody>
              {unita.map((u, ui) => (
                <>
                  {/* ── Stanza row ── */}
                  <tr key={u.id} className={ui % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'}>
                    {/* Row header */}
                    <td className="sticky left-0 z-10 border-r border-b border-gray-200 px-3 py-2 bg-inherit">
                      <div className="font-semibold text-gray-800 text-sm leading-tight">{u.nome}</div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-gray-400 flex items-center gap-0.5">
                          <Users className="w-3 h-3" />{u.capacita}p
                        </span>
                        <span className="text-xs font-medium text-indigo-600">€{u.prezzoBase}/n</span>
                      </div>
                      <button
                        onClick={() => {
                          setModal({
                            unitaId: u.id,
                            dataInizio: format(startOfMonth(mese), 'yyyy-MM-dd'),
                            dataFine: format(endOfMonth(mese), 'yyyy-MM-dd'),
                          })
                          setModalErr('')
                        }}
                        className="mt-1.5 text-xs text-indigo-500 hover:text-indigo-700 flex items-center gap-0.5 font-medium"
                      >
                        <Plus className="w-3 h-3" /> Tariffa
                      </button>
                    </td>

                    {/* Day cells */}
                    {giorni.map(g => {
                      const ds = format(g, 'yyyy-MM-dd')
                      const past = isBefore(g, startOfDay(new Date()))
                      const state = cellState(u, ds, changes)
                      const { prezzo, tariffa } = prezzoEffettivo(u, ds)
                      const sel = inSel(u.id, ds)
                      const prenotazione = u.prenotazioni.find(p => {
                        const a = p.dataArrivo.substring(0, 10)
                        const z = p.dataPartenza ? p.dataPartenza.substring(0, 10) : '9999-12-31'
                        return ds >= a && ds < z
                      })

                      let bg = ''
                      let style: React.CSSProperties = {}
                      if (sel) bg = 'bg-indigo-200'
                      else if (state === 'closed') bg = 'bg-red-50'
                      else if (state === 'occupied') bg = 'bg-amber-50'
                      else if (tariffa) style = { backgroundColor: `${tariffa.colore ?? '#6366f1'}18` }
                      else bg = 'bg-green-50'

                      return (
                        <td
                          key={ds}
                          className={`border-b border-r border-gray-100 cursor-pointer text-center p-0 w-11 min-w-11 transition-colors ${bg} ${past ? 'opacity-30' : 'hover:brightness-95'}`}
                          style={style}
                          onMouseDown={() => !past && onMouseDown(u.id, ds)}
                          onMouseEnter={() => !past && onMouseEnter(u.id, ds)}
                          title={
                            prenotazione
                              ? `${prenotazione.guestNome} ${prenotazione.guestCognome}`
                              : state === 'closed'
                              ? '🔒 Chiuso'
                              : `€${prezzo}/notte${tariffa ? ` · ${tariffa.nome}` : ''}`
                          }
                        >
                          <div className="h-10 flex flex-col items-center justify-center gap-0.5">
                            {state === 'closed' ? (
                              <Lock className="w-3.5 h-3.5 text-red-400" />
                            ) : state === 'occupied' ? (
                              <>
                                <span className="text-amber-500 text-xs">●</span>
                                <span className="text-xs text-amber-600 font-medium leading-none">{prezzo}</span>
                              </>
                            ) : (
                              <span className={`text-xs font-semibold ${tariffa ? 'text-gray-700' : 'text-green-700'}`}>
                                {prezzo}
                              </span>
                            )}
                          </div>
                        </td>
                      )
                    })}
                  </tr>

                  {/* ── Tariffe bar row ── */}
                  {u.tariffe.length > 0 && (
                    <tr key={`${u.id}-t`}>
                      <td className="sticky left-0 z-10 bg-white border-r border-b border-gray-100 px-3 py-1">
                        <span className="text-xs text-gray-300 italic">tariffe</span>
                      </td>
                      <td colSpan={giorni.length} className="border-b border-gray-100 p-0 relative" style={{ height: 20 }}>
                        <div className="relative h-5 mx-0.5">
                          {u.tariffe.map(t => {
                            const ms = startOfMonth(mese)
                            const me = endOfMonth(mese)
                            const ts = new Date(t.dataInizio) < ms ? ms : new Date(t.dataInizio)
                            const te = new Date(t.dataFine) > me ? me : new Date(t.dataFine)
                            const sd = ts.getDate() - 1
                            const ed = te.getDate() - 1
                            const tot = giorni.length
                            const left = (sd / tot) * 100
                            const width = ((ed - sd + 1) / tot) * 100
                            return (
                              <div
                                key={t.id}
                                className="absolute top-0.5 h-4 rounded flex items-center overflow-hidden cursor-pointer hover:opacity-80 transition-opacity"
                                style={{ left: `${left}%`, width: `${width}%`, backgroundColor: t.colore ?? '#6366f1' }}
                                title={`${t.nome}: €${t.prezzo}/notte — clicca per eliminare`}
                                onClick={() => deleteTariffa(t.id)}
                              >
                                <span className="px-1.5 text-white text-xs font-medium truncate leading-none whitespace-nowrap">
                                  {t.nome} · €{t.prezzo}
                                </span>
                              </div>
                            )
                          })}
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Modal tariffa ── */}
      {modal && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={e => { if (e.target === e.currentTarget) setModal(null) }}
        >
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-gray-900 text-base">
                Nuova tariffa — {unita.find(u => u.id === modal.unitaId)?.nome}
              </h3>
              <button onClick={() => setModal(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            {modalErr && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2 mb-4">{modalErr}</p>}
            <form onSubmit={submitTariffa} className="space-y-4">
              <div>
                <label className="label">Nome tariffa</label>
                <input name="nome" className="input" placeholder="es. Alta stagione, Weekend, Natale..." required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Dal</label>
                  <input name="dataInizio" type="date" className="input" defaultValue={modal.dataInizio} required />
                </div>
                <div>
                  <label className="label">Al</label>
                  <input name="dataFine" type="date" className="input" defaultValue={modal.dataFine} required />
                </div>
              </div>
              <div>
                <label className="label">Prezzo per notte (€)</label>
                <input name="prezzo" type="number" min="0" step="0.01" className="input" placeholder="120" required />
              </div>
              <div>
                <label className="label">Colore</label>
                <div className="flex gap-2 flex-wrap mt-1">
                  {COLORI.map((c, i) => (
                    <label key={c} className="cursor-pointer">
                      <input type="radio" name="colore" value={c} className="sr-only" defaultChecked={i === 0} />
                      <span className="block w-7 h-7 rounded-full shadow-sm hover:scale-110 transition-transform ring-offset-1"
                        style={{ backgroundColor: c }} />
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setModal(null)} className="btn-secondary flex-1 text-sm">Annulla</button>
                <button type="submit" disabled={savingModal} className="btn-primary flex-1 text-sm">
                  {savingModal ? 'Salvo...' : 'Aggiungi tariffa'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
