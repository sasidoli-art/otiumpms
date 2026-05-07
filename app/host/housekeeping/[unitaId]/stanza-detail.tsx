'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { format } from 'date-fns'
import { it } from 'date-fns/locale'
import {
  CheckCircle2, Clock, Wrench, Sparkles, Moon, Ban,
  RefreshCw, Plus, Trash2, Loader2, Pencil, Check,
  X, ChevronDown, ChevronUp, Users, Save, AlertTriangle,
} from 'lucide-react'

// ─── Tipi ─────────────────────────────────────────────────────────────────────

type TaskHK = {
  id: string
  tipo: string
  descrizione: string | null
  priorita: string
  assegnatoA: string | null
  completato: boolean
  completatoAt: string | null
  note: string | null
  dataScadenza: string | null
  createdAt: string
}

type Prenotazione = {
  id: string
  guestNome: string
  guestCognome: string
  guestEmail: string
  dataArrivo: string
  dataPartenza: string | null
  stato: string
  numOspiti: number
}

type Unita = {
  id: string
  nome: string
  descrizione: string | null
  capacita: number
  prezzoBase: number
  statoHK: string
  noteHK: string | null
  ultimaPulizia: string | null
  struttura: { id: string; nome: string }
  taskHK: TaskHK[]
  prenotazioni: Prenotazione[]
}

// ─── Config ────────────────────────────────────────────────────────────────────

const STATI_HK: Record<string, { label: string; bg: string; text: string; border: string; icon: React.ReactNode }> = {
  PULITA:         { label: 'Pulita',          bg: 'bg-green-50',  text: 'text-green-700',  border: 'border-green-300',  icon: <CheckCircle2 className="w-4 h-4 text-green-500" /> },
  SPORCA:         { label: 'Da pulire',       bg: 'bg-red-50',    text: 'text-red-700',    border: 'border-red-300',    icon: <Sparkles className="w-4 h-4 text-red-500" /> },
  IN_PULIZIA:     { label: 'In pulizia',      bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-300', icon: <RefreshCw className="w-4 h-4 text-yellow-500 animate-spin" /> },
  NON_DISTURBARE: { label: 'Non disturbare',  bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-300', icon: <Moon className="w-4 h-4 text-purple-500" /> },
  MANUTENZIONE:   { label: 'Manutenzione',    bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-300', icon: <Wrench className="w-4 h-4 text-orange-500" /> },
  FUORI_SERVIZIO: { label: 'Fuori servizio',  bg: 'bg-gray-100',  text: 'text-gray-500',   border: 'border-gray-300',   icon: <Ban className="w-4 h-4 text-gray-400" /> },
}

const PRIORITA: Record<string, { label: string; cls: string }> = {
  URGENTE: { label: 'Urgente', cls: 'text-red-600 bg-red-50 border-red-200' },
  ALTA:    { label: 'Alta',    cls: 'text-orange-600 bg-orange-50 border-orange-200' },
  NORMALE: { label: 'Normale', cls: 'text-blue-600 bg-blue-50 border-blue-200' },
  BASSA:   { label: 'Bassa',   cls: 'text-gray-500 bg-gray-50 border-gray-200' },
}

const STATI_PREN: Record<string, { label: string; cls: string }> = {
  RICHIESTA:   { label: 'Richiesta',  cls: 'text-yellow-700 bg-yellow-50' },
  CONFERMATA:  { label: 'Confermata', cls: 'text-green-700 bg-green-50' },
  COMPLETATA:  { label: 'Completata', cls: 'text-gray-500 bg-gray-100' },
  CANCELLATA:  { label: 'Cancellata', cls: 'text-red-600 bg-red-50' },
}

const TIPI_TASK = ['PULIZIA', 'CAMBIO_BIANCHERIA', 'MANUTENZIONE', 'ISPEZIONE', 'ALTRO']

// ─── Componente principale ─────────────────────────────────────────────────────

export default function StanzaDetail({ unita: iniziale }: { unita: Unita }) {
  const [unita, setUnita] = useState<Unita>(iniziale)
  const [tasks, setTasks] = useState<TaskHK[]>(iniziale.taskHK)
  const [loadingStato, setLoadingStato] = useState(false)
  const [dropdownStato, setDropdownStato] = useState(false)
  // Note editing
  const [editNote, setEditNote] = useState(false)
  const [noteTemp, setNoteTemp] = useState(iniziale.noteHK ?? '')
  const [savingNote, setSavingNote] = useState(false)
  // Tab task
  const [mostraStorico, setMostraStorico] = useState(false)
  // Nuovo task
  const [formAperto, setFormAperto] = useState(false)
  const [form, setForm] = useState({ tipo: 'PULIZIA', descrizione: '', priorita: 'NORMALE', assegnatoA: '', dataScadenza: '' })
  const [savingTask, setSavingTask] = useState(false)
  // Deleteing
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const router = useRouter()

  const stato = STATI_HK[unita.statoHK] ?? STATI_HK.PULITA
  const taskAperti = tasks.filter(t => !t.completato)
  const taskCompletati = tasks.filter(t => t.completato)

  // ── Cambio stato ────────────────────────────────────────────────────────────
  async function cambiaStato(nuovoStato: string) {
    setLoadingStato(true); setDropdownStato(false)
    const res = await fetch(`/api/host/housekeeping/unita/${unita.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ statoHK: nuovoStato }),
    })
    if (res.ok) {
      const ag = await res.json()
      setUnita(u => ({ ...u, statoHK: ag.statoHK, ultimaPulizia: ag.ultimaPulizia?.toString() ?? null }))
    }
    setLoadingStato(false)
  }

  // ── Salva note ──────────────────────────────────────────────────────────────
  async function salvaNota() {
    setSavingNote(true)
    const res = await fetch(`/api/host/housekeeping/unita/${unita.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ noteHK: noteTemp }),
    })
    if (res.ok) { setUnita(u => ({ ...u, noteHK: noteTemp })); setEditNote(false) }
    setSavingNote(false)
  }

  // ── Completa task ───────────────────────────────────────────────────────────
  async function completaTask(taskId: string) {
    const res = await fetch(`/api/host/housekeeping/task/${taskId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ completato: true }),
    })
    if (res.ok) {
      const ag = await res.json()
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, ...ag, completatoAt: ag.completatoAt?.toString() ?? null } : t))
    }
  }

  // ── Elimina task ────────────────────────────────────────────────────────────
  async function eliminaTask(taskId: string) {
    setDeletingId(taskId)
    const res = await fetch(`/api/host/housekeeping/task/${taskId}`, { method: 'DELETE' })
    if (res.ok) setTasks(prev => prev.filter(t => t.id !== taskId))
    setDeletingId(null)
  }

  // ── Crea task ───────────────────────────────────────────────────────────────
  async function creaTask(e: React.FormEvent) {
    e.preventDefault()
    setSavingTask(true)
    const res = await fetch('/api/host/housekeeping/task', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ unitaId: unita.id, ...form }),
    })
    if (res.ok) {
      const task = await res.json()
      setTasks(prev => [{ ...task, createdAt: task.createdAt?.toString(), completatoAt: null, dataScadenza: task.dataScadenza?.toString() ?? null }, ...prev])
      setForm({ tipo: 'PULIZIA', descrizione: '', priorita: 'NORMALE', assegnatoA: '', dataScadenza: '' })
      setFormAperto(false)
    }
    setSavingTask(false)
  }

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

      {/* ── Colonna sinistra: info stanza ─────────────────────────────────── */}
      <div className="space-y-5">
        {/* Card stato */}
        <div className={`card border-2 ${stato.border}`}>
          <div className={`flex items-center gap-3 ${stato.bg} rounded-lg px-4 py-3 mb-4`}>
            {stato.icon}
            <div className="flex-1">
              <p className="font-bold text-gray-900 text-lg">{unita.nome}</p>
              <p className="text-sm text-gray-500">{unita.struttura.nome}</p>
            </div>
            <span className={`text-sm font-semibold px-3 py-1 rounded-full ${stato.bg} ${stato.text}`}>
              {stato.label}
            </span>
          </div>

          <div className="space-y-2 mb-4">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Capacità</span>
              <span className="font-medium">{unita.capacita} ospiti</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Prezzo base</span>
              <span className="font-medium">€{unita.prezzoBase.toFixed(2)}</span>
            </div>
            {unita.ultimaPulizia && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Ultima pulizia</span>
                <span className="font-medium text-green-600">
                  {format(new Date(unita.ultimaPulizia), 'd MMM HH:mm', { locale: it })}
                </span>
              </div>
            )}
          </div>

          {/* Dropdown stato */}
          <div className="relative">
            <button
              onClick={() => setDropdownStato(!dropdownStato)}
              disabled={loadingStato}
              className="w-full flex items-center justify-between px-4 py-2.5 text-sm font-medium border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-60"
            >
              {loadingStato ? (
                <span className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Aggiornamento…</span>
              ) : (
                <span>Cambia stato</span>
              )}
              <ChevronDown className="w-4 h-4 text-gray-400" />
            </button>
            {dropdownStato && (
              <div className="absolute top-full left-0 mt-1 w-full bg-white rounded-xl shadow-xl border border-gray-100 z-20 overflow-hidden">
                {Object.entries(STATI_HK)
                  .filter(([k]) => k !== unita.statoHK)
                  .map(([k, v]) => (
                    <button
                      key={k}
                      onClick={() => cambiaStato(k)}
                      className={`w-full flex items-center gap-2 px-4 py-2.5 text-sm text-left hover:${v.bg} transition-colors`}
                    >
                      {v.icon}
                      <span className={v.text}>{v.label}</span>
                    </button>
                  ))}
              </div>
            )}
          </div>
        </div>

        {/* Note HK */}
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-900 text-sm">Note per lo staff</h3>
            {!editNote ? (
              <button onClick={() => setEditNote(true)} className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600">
                <Pencil className="w-4 h-4" />
              </button>
            ) : (
              <div className="flex gap-1">
                <button
                  onClick={salvaNota}
                  disabled={savingNote}
                  className="p-1 rounded hover:bg-green-50 text-gray-400 hover:text-green-600"
                >
                  {savingNote ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                </button>
                <button onClick={() => { setEditNote(false); setNoteTemp(unita.noteHK ?? '') }} className="p-1 rounded hover:bg-gray-100 text-gray-400">
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
          {editNote ? (
            <textarea
              rows={4}
              value={noteTemp}
              onChange={e => setNoteTemp(e.target.value)}
              className="input text-sm"
              placeholder="Istruzioni per le pulizie, note importanti…"
              autoFocus
            />
          ) : (
            <p className="text-sm text-gray-600 min-h-[3rem] whitespace-pre-wrap">
              {unita.noteHK || <span className="italic text-gray-300">Nessuna nota</span>}
            </p>
          )}
        </div>

        {/* Prenotazioni */}
        <div className="card">
          <h3 className="font-semibold text-gray-900 text-sm mb-3 flex items-center gap-2">
            <Users className="w-4 h-4 text-gray-400" /> Prenotazioni recenti/future
          </h3>
          {unita.prenotazioni.length === 0 ? (
            <p className="text-sm text-gray-400 italic">Nessuna prenotazione</p>
          ) : (
            <div className="space-y-2">
              {unita.prenotazioni.map(p => {
                const s = STATI_PREN[p.stato] ?? STATI_PREN.RICHIESTA
                const oggi = new Date()
                oggi.setHours(0, 0, 0, 0)
                const arr = new Date(p.dataArrivo)
                const isSoggiorno = arr <= oggi && (!p.dataPartenza || new Date(p.dataPartenza) >= oggi)
                return (
                  <Link
                    key={p.id}
                    href={`/host/prenotazioni/${p.id}`}
                    className="flex items-start justify-between text-xs p-2.5 rounded-lg bg-gray-50 hover:bg-brand-500/8 transition-colors group"
                  >
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-800 group-hover:text-brand-600 truncate">
                        {p.guestNome} {p.guestCognome}
                        {isSoggiorno && <span className="ml-1.5 text-brand-500 text-[10px] font-bold">● IN STRUTTURA</span>}
                      </p>
                      <p className="text-gray-500">
                        {format(new Date(p.dataArrivo), 'd MMM', { locale: it })}
                        {p.dataPartenza && ` → ${format(new Date(p.dataPartenza), 'd MMM', { locale: it })}`}
                        {' · '}{p.numOspiti} osp.
                      </p>
                    </div>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ml-2 shrink-0 ${s.cls}`}>{s.label}</span>
                  </Link>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Colonna destra: task ──────────────────────────────────────────── */}
      <div className="xl:col-span-2 space-y-5">
        {/* Intestazione task aperti */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
              Task aperti
              {taskAperti.length > 0 && (
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-brand-500 text-white">
                  {taskAperti.length}
                </span>
              )}
            </h2>
            <button
              onClick={() => setFormAperto(!formAperto)}
              className="flex items-center gap-1.5 btn-primary text-sm py-1.5 px-3"
            >
              {formAperto ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              {formAperto ? 'Annulla' : 'Nuovo task'}
            </button>
          </div>

          {/* Form nuovo task */}
          {formAperto && (
            <form onSubmit={creaTask} className="mb-5 p-4 rounded-xl bg-gray-50 border border-dashed border-gray-200 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Tipo *</label>
                  <select value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))} className="input">
                    {TIPI_TASK.map(t => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
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
                <textarea rows={2} value={form.descrizione} onChange={e => setForm(f => ({ ...f, descrizione: e.target.value }))} className="input" placeholder="Note per lo staff…" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Assegnato a</label>
                  <input type="text" value={form.assegnatoA} onChange={e => setForm(f => ({ ...f, assegnatoA: e.target.value }))} className="input" placeholder="Nome operatore" />
                </div>
                <div>
                  <label className="label">Data scadenza</label>
                  <input type="date" value={form.dataScadenza} onChange={e => setForm(f => ({ ...f, dataScadenza: e.target.value }))} className="input" />
                </div>
              </div>
              <button type="submit" disabled={savingTask} className="btn-primary w-full flex items-center justify-center gap-2">
                {savingTask ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                {savingTask ? 'Salvo…' : 'Crea task'}
              </button>
            </form>
          )}

          {/* Lista task aperti */}
          {taskAperti.length === 0 ? (
            <div className="py-10 flex flex-col items-center gap-2 text-gray-300">
              <CheckCircle2 className="w-10 h-10 opacity-40" />
              <p className="text-sm">Nessun task aperto — tutto in ordine!</p>
            </div>
          ) : (
            <div className="space-y-2">
              {taskAperti.map(t => (
                <TaskRow
                  key={t.id}
                  task={t}
                  deleting={deletingId === t.id}
                  onCompleta={() => completaTask(t.id)}
                  onElimina={() => eliminaTask(t.id)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Storico task completati */}
        <div className="card">
          <button
            onClick={() => setMostraStorico(!mostraStorico)}
            className="w-full flex items-center justify-between text-sm font-semibold text-gray-700 hover:text-gray-900"
          >
            <span className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-500" />
              Storico completati ({taskCompletati.length})
            </span>
            {mostraStorico ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
          </button>
          {mostraStorico && (
            <div className="mt-4 space-y-2">
              {taskCompletati.length === 0 ? (
                <p className="text-sm text-gray-400 italic">Nessun task completato</p>
              ) : (
                taskCompletati.map(t => (
                  <div key={t.id} className="flex items-start gap-3 px-3 py-2.5 rounded-lg bg-green-50/50 border border-green-100">
                    <CheckCircle2 className="w-4 h-4 text-green-400 mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-gray-700">{t.tipo.replace('_', ' ')}</span>
                        {t.assegnatoA && <span className="text-xs text-gray-500">→ {t.assegnatoA}</span>}
                      </div>
                      {t.descrizione && <p className="text-xs text-gray-500 mt-0.5 truncate">{t.descrizione}</p>}
                      {t.completatoAt && (
                        <p className="text-xs text-green-600 mt-0.5">
                          Completato {format(new Date(t.completatoAt), 'd MMM HH:mm', { locale: it })}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => eliminaTask(t.id)}
                      disabled={deletingId === t.id}
                      className="p-1 text-gray-300 hover:text-red-400 transition-colors disabled:opacity-40"
                    >
                      {deletingId === t.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Task row ─────────────────────────────────────────────────────────────────

function TaskRow({
  task: t,
  deleting,
  onCompleta,
  onElimina,
}: {
  task: TaskHK
  deleting: boolean
  onCompleta: () => void
  onElimina: () => void
}) {
  const [completando, setCompletando] = useState(false)
  const pr = PRIORITA[t.priorita] ?? PRIORITA.NORMALE
  const scaduta = t.dataScadenza && new Date(t.dataScadenza) < new Date()

  async function handleCompleta() {
    setCompletando(true)
    await onCompleta()
    setCompletando(false)
  }

  return (
    <div className={`flex items-start gap-3 px-3 py-3 rounded-xl border transition-colors ${
      t.priorita === 'URGENTE' ? 'border-red-200 bg-red-50/30' : 'border-gray-100 bg-white hover:bg-gray-50'
    }`}>
      {/* Pulsante completa */}
      <button
        onClick={handleCompleta}
        disabled={completando}
        className="mt-0.5 rounded-full w-5 h-5 border-2 border-gray-300 flex items-center justify-center hover:border-green-500 hover:bg-green-50 transition-colors shrink-0 disabled:opacity-50"
        title="Segna come completato"
      >
        {completando ? <Loader2 className="w-3 h-3 animate-spin text-gray-400" /> : <Check className="w-3 h-3 text-transparent hover:text-green-500" />}
      </button>

      {/* Contenuto */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-xs font-semibold px-2 py-0.5 rounded border ${pr.cls}`}>{pr.label}</span>
          <span className="text-sm font-medium text-gray-800">{t.tipo.replace('_', ' ')}</span>
          {t.assegnatoA && (
            <span className="text-xs text-gray-500 flex items-center gap-1">
              → {t.assegnatoA}
            </span>
          )}
        </div>
        {t.descrizione && <p className="text-xs text-gray-500 mt-0.5">{t.descrizione}</p>}
        <div className="flex items-center gap-3 mt-1">
          {t.dataScadenza && (
            <span className={`flex items-center gap-1 text-[11px] ${scaduta ? 'text-red-500 font-semibold' : 'text-gray-400'}`}>
              <Clock className="w-3 h-3" />
              {scaduta && <AlertTriangle className="w-3 h-3" />}
              Entro {format(new Date(t.dataScadenza), 'd MMM', { locale: it })}
            </span>
          )}
          <span className="text-[11px] text-gray-300">
            {format(new Date(t.createdAt), 'd MMM HH:mm', { locale: it })}
          </span>
        </div>
      </div>

      {/* Elimina */}
      <button
        onClick={onElimina}
        disabled={deleting}
        className="p-1.5 rounded-lg text-gray-300 hover:text-red-400 hover:bg-red-50 transition-colors disabled:opacity-40"
        title="Elimina task"
      >
        {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
      </button>
    </div>
  )
}
