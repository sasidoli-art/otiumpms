'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { format } from 'date-fns'
import { it } from 'date-fns/locale'
import {
  CheckCircle2, AlertTriangle, Wrench, BedDouble, Clock,
  Users, Plus, X, ChevronDown, Loader2, RefreshCw,
  Sparkles, Ban, Moon, Filter
} from 'lucide-react'

// ─── Tipi ─────────────────────────────────────────────────────────────────────

type Struttura = { id: string; nome: string }

type TaskHK = {
  id: string
  tipo: string
  descrizione: string | null
  priorita: string
  assegnatoA: string | null
  completato: boolean
  note: string | null
  dataScadenza: string | null
}

type ProssimaPren = {
  id: string
  guestNome: string
  guestCognome: string
  dataArrivo: string
  dataPartenza: string | null
  stato: string
} | null

type Unita = {
  id: string
  nome: string
  statoHK: string
  noteHK: string | null
  ultimaPulizia: string | null
  struttura: { id: string; nome: string }
  taskHK: TaskHK[]
  prenotazioni: NonNullable<ProssimaPren>[]
}

// ─── Config stati ─────────────────────────────────────────────────────────────

const STATI_HK: Record<string, {
  label: string
  bg: string
  text: string
  border: string
  icon: React.ReactNode
}> = {
  PULITA: {
    label: 'Pulita',
    bg: 'bg-green-50',
    text: 'text-green-700',
    border: 'border-green-200',
    icon: <CheckCircle2 className="w-4 h-4 text-green-500" />,
  },
  SPORCA: {
    label: 'Da pulire',
    bg: 'bg-red-50',
    text: 'text-red-700',
    border: 'border-red-200',
    icon: <Sparkles className="w-4 h-4 text-red-500" />,
  },
  IN_PULIZIA: {
    label: 'In pulizia',
    bg: 'bg-yellow-50',
    text: 'text-yellow-700',
    border: 'border-yellow-200',
    icon: <RefreshCw className="w-4 h-4 text-yellow-500 animate-spin" />,
  },
  NON_DISTURBARE: {
    label: 'Non disturbare',
    bg: 'bg-purple-50',
    text: 'text-purple-700',
    border: 'border-purple-200',
    icon: <Moon className="w-4 h-4 text-purple-500" />,
  },
  MANUTENZIONE: {
    label: 'Manutenzione',
    bg: 'bg-orange-50',
    text: 'text-orange-700',
    border: 'border-orange-200',
    icon: <Wrench className="w-4 h-4 text-orange-500" />,
  },
  FUORI_SERVIZIO: {
    label: 'Fuori servizio',
    bg: 'bg-gray-100',
    text: 'text-gray-500',
    border: 'border-gray-300',
    icon: <Ban className="w-4 h-4 text-gray-400" />,
  },
}

const PRIORITA_COLORI: Record<string, string> = {
  URGENTE: 'text-red-600 bg-red-50',
  ALTA: 'text-orange-600 bg-orange-50',
  NORMALE: 'text-blue-600 bg-blue-50',
  BASSA: 'text-gray-500 bg-gray-100',
}

const TIPI_TASK = ['PULIZIA', 'CAMBIO_BIANCHERIA', 'MANUTENZIONE', 'ISPEZIONE', 'ALTRO']

// ─── Componente principale ────────────────────────────────────────────────────

export default function HousekeepingBoard({
  strutture,
  unitaIniziali,
}: {
  strutture: Struttura[]
  unitaIniziali: Unita[]
}) {
  const t = useTranslations('host.housekeeping')
  const tc = useTranslations('common')
  const [unita, setUnita] = useState<Unita[]>(unitaIniziali)
  const [filtroStruttura, setFiltroStruttura] = useState('all')
  const [filtroStato, setFiltroStato] = useState('all')
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [taskModal, setTaskModal] = useState<{ unitaId: string; unitaNome: string } | null>(null)
  const [errore, setErrore] = useState<string | null>(null)
  const router = useRouter()

  // ── Cambio stato HK ────────────────────────────────────────────────────────
  async function cambiaStato(unitaId: string, nuovoStato: string) {
    setLoadingId(unitaId)
    setErrore(null)
    try {
      const res = await fetch(`/api/host/housekeeping/unita/${unitaId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ statoHK: nuovoStato }),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        setErrore(j.error || `Errore aggiornamento stato (${res.status})`)
        setLoadingId(null)
        return
      }
      const aggiornata = await res.json()
      setUnita(prev => prev.map(u =>
        u.id === unitaId
          ? { ...u, statoHK: aggiornata.statoHK, ultimaPulizia: aggiornata.ultimaPulizia }
          : u
      ))
    } catch {
      setErrore('Errore di rete. Controlla la connessione e riprova.')
    }
    setLoadingId(null)
  }

  // ── Completa task ──────────────────────────────────────────────────────────
  async function completaTask(taskId: string, unitaId: string) {
    setErrore(null)
    try {
      const res = await fetch(`/api/host/housekeeping/task/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completato: true }),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        setErrore(j.error || `Errore completamento task (${res.status})`)
        return
      }
      setUnita(prev => prev.map(u =>
        u.id === unitaId
          ? { ...u, taskHK: u.taskHK.filter(t => t.id !== taskId) }
          : u
      ))
    } catch {
      setErrore('Errore di rete. Controlla la connessione e riprova.')
    }
  }

  // ── Filtri ─────────────────────────────────────────────────────────────────
  const unitaFiltrate = unita.filter(u => {
    if (filtroStruttura !== 'all' && u.struttura.id !== filtroStruttura) return false
    if (filtroStato !== 'all' && u.statoHK !== filtroStato) return false
    return true
  })

  // KPI
  const kpi = {
    pulite: unita.filter(u => u.statoHK === 'PULITA').length,
    sporche: unita.filter(u => u.statoHK === 'SPORCA').length,
    inPulizia: unita.filter(u => u.statoHK === 'IN_PULIZIA').length,
    manutenzione: unita.filter(u => u.statoHK === 'MANUTENZIONE').length,
    taskAperti: unita.reduce((acc, u) => acc + u.taskHK.length, 0),
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="page-title-box">
        <div>
          <h1 className="page-title">{t('title')}</h1>
          <p className="text-sm text-gray-500">
            Gestione stanze e pulizie — {format(new Date(), "EEEE d MMMM", { locale: it })}
          </p>
        </div>
        <button
          onClick={() => router.refresh()}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 px-3 py-1.5 rounded border border-gray-200 hover:bg-gray-50"
        >
          <RefreshCw className="w-4 h-4" /> Aggiorna
        </button>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: 'Pulite', val: kpi.pulite, color: 'text-green-600', bg: 'bg-green-50', stato: 'PULITA' },
          { label: 'Da pulire', val: kpi.sporche, color: 'text-red-600', bg: 'bg-red-50', stato: 'SPORCA' },
          { label: 'In pulizia', val: kpi.inPulizia, color: 'text-yellow-600', bg: 'bg-yellow-50', stato: 'IN_PULIZIA' },
          { label: 'Manutenzione', val: kpi.manutenzione, color: 'text-orange-600', bg: 'bg-orange-50', stato: 'MANUTENZIONE' },
          { label: 'Task aperti', val: kpi.taskAperti, color: 'text-brand-600', bg: 'bg-brand-500/10', stato: null },
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
        <div className="flex items-center gap-1 text-sm text-gray-500">
          <Filter className="w-4 h-4" />
        </div>
        {strutture.length > 1 && (
          <select
            value={filtroStruttura}
            onChange={e => setFiltroStruttura(e.target.value)}
            className="input text-sm py-1.5 w-auto"
          >
            <option value="all">Tutte le strutture</option>
            {strutture.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
          </select>
        )}
        <select
          value={filtroStato}
          onChange={e => setFiltroStato(e.target.value)}
          className="input text-sm py-1.5 w-auto"
        >
          <option value="all">Tutti gli stati</option>
          {Object.entries(STATI_HK).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>
        {(filtroStruttura !== 'all' || filtroStato !== 'all') && (
          <button
            onClick={() => { setFiltroStruttura('all'); setFiltroStato('all') }}
            className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1"
          >
            <X className="w-3.5 h-3.5" /> Reset filtri
          </button>
        )}
        <span className="ml-auto text-xs text-gray-400">{unitaFiltrate.length} unità</span>
      </div>

      {/* Griglia stanze */}
      {unitaFiltrate.length === 0 ? (
        <div className="card py-14 flex flex-col items-center gap-2 text-gray-400">
          <BedDouble className="w-10 h-10 opacity-30" />
          <p className="text-sm">Nessuna unità da mostrare</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {unitaFiltrate.map(u => (
            <CardStanza
              key={u.id}
              unita={u}
              loading={loadingId === u.id}
              onCambiaStato={cambiaStato}
              onCompletaTask={completaTask}
              onNuovoTask={() => setTaskModal({ unitaId: u.id, unitaNome: u.nome })}
            />
          ))}
        </div>
      )}

      {/* Modal nuovo task */}
      {taskModal && (
        <NuovoTaskModal
          unitaId={taskModal.unitaId}
          unitaNome={taskModal.unitaNome}
          onClose={() => setTaskModal(null)}
          onCreato={(task) => {
            setUnita(prev => prev.map(u =>
              u.id === taskModal.unitaId
                ? { ...u, taskHK: [...u.taskHK, task] }
                : u
            ))
            setTaskModal(null)
          }}
        />
      )}
    </div>
  )
}

// ─── Card singola stanza ──────────────────────────────────────────────────────

function CardStanza({
  unita: u,
  loading,
  onCambiaStato,
  onCompletaTask,
  onNuovoTask,
}: {
  unita: Unita
  loading: boolean
  onCambiaStato: (id: string, stato: string) => void
  onCompletaTask: (taskId: string, unitaId: string) => void
  onNuovoTask: () => void
}) {
  const [dropdownAperto, setDropdownAperto] = useState(false)
  const stato = STATI_HK[u.statoHK] ?? STATI_HK.PULITA
  const pren = u.prenotazioni[0] ?? null
  const taskUrg = u.taskHK.filter(t => t.priorita === 'URGENTE' || t.priorita === 'ALTA')

  return (
    <div className={`rounded-xl border-2 ${stato.border} bg-white shadow-sm flex flex-col overflow-hidden`}>
      {/* Header card */}
      <div className={`px-4 py-3 ${stato.bg} flex items-center justify-between`}>
        <div className="flex items-center gap-2">
          {stato.icon}
          <span className="font-bold text-gray-900 text-sm">{u.nome}</span>
        </div>
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${stato.bg} ${stato.text}`}>
          {stato.label}
        </span>
      </div>

      {/* Struttura */}
      <div className="px-4 pt-2 pb-0 text-xs text-gray-400">{u.struttura.nome}</div>

      {/* Prenotazione attiva */}
      <div className="px-4 py-2">
        {pren ? (
          <Link
            href={`/host/prenotazioni/${pren.id}`}
            className="flex items-center gap-2 text-xs bg-brand-500/8 rounded-lg px-2.5 py-1.5 hover:bg-brand-500/15 transition-colors"
          >
            <Users className="w-3.5 h-3.5 text-brand-500 shrink-0" />
            <div className="min-w-0">
              <p className="font-semibold text-gray-800 truncate">{pren.guestNome} {pren.guestCognome}</p>
              <p className="text-gray-500">
                {format(new Date(pren.dataArrivo), 'd/MM')}
                {pren.dataPartenza && ` → ${format(new Date(pren.dataPartenza), 'd/MM')}`}
              </p>
            </div>
          </Link>
        ) : (
          <p className="text-xs text-gray-300 italic">Nessun ospite oggi</p>
        )}
      </div>

      {/* Task aperti */}
      {u.taskHK.length > 0 && (
        <div className="px-4 pb-2 space-y-1">
          {u.taskHK.slice(0, 3).map(t => (
            <div key={t.id} className="flex items-center gap-2">
              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${PRIORITA_COLORI[t.priorita]}`}>
                {t.priorita === 'URGENTE' ? '‼️' : t.priorita === 'ALTA' ? '⬆' : '·'} {t.tipo.replace('_', ' ')}
              </span>
              <span className="text-xs text-gray-500 flex-1 truncate">{t.descrizione ?? ''}</span>
              <button
                onClick={() => onCompletaTask(t.id, u.id)}
                className="p-0.5 text-gray-300 hover:text-green-500 transition-colors"
                title="Segna completato"
              >
                <CheckCircle2 className="w-4 h-4" />
              </button>
            </div>
          ))}
          {u.taskHK.length > 3 && (
            <p className="text-xs text-gray-400">+{u.taskHK.length - 3} altri task</p>
          )}
        </div>
      )}

      {/* Ultima pulizia */}
      {u.ultimaPulizia && (
        <div className="px-4 pb-1 flex items-center gap-1 text-xs text-gray-400">
          <Clock className="w-3 h-3" />
          Pulita: {format(new Date(u.ultimaPulizia), 'd MMM HH:mm', { locale: it })}
        </div>
      )}

      {/* Azioni */}
      <div className="mt-auto px-4 py-3 border-t border-gray-100 flex items-center gap-2">
        {/* Dropdown cambio stato */}
        <div className="relative flex-1">
          <button
            onClick={() => setDropdownAperto(!dropdownAperto)}
            disabled={loading}
            className="w-full flex items-center justify-between px-3 py-1.5 text-xs font-medium border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-60"
          >
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Cambia stato'}
            <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
          </button>
          {dropdownAperto && (
            <div className="absolute bottom-full left-0 mb-1 w-44 bg-white rounded-xl shadow-xl border border-gray-100 z-30 overflow-hidden">
              {Object.entries(STATI_HK)
                .filter(([k]) => k !== u.statoHK)
                .map(([k, v]) => (
                  <button
                    key={k}
                    onClick={() => { onCambiaStato(u.id, k); setDropdownAperto(false) }}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-xs text-left hover:${v.bg} transition-colors`}
                  >
                    {v.icon}
                    <span className={v.text}>{v.label}</span>
                  </button>
                ))}
            </div>
          )}
        </div>

        {/* Nuovo task */}
        <button
          onClick={onNuovoTask}
          className="p-1.5 rounded-lg border border-gray-200 text-gray-400 hover:text-brand-500 hover:border-brand-300 transition-colors"
          title="Aggiungi task"
        >
          <Plus className="w-4 h-4" />
        </button>

        {/* Link dettaglio */}
        <Link
          href={`/host/housekeeping/${u.id}`}
          className="p-1.5 rounded-lg border border-gray-200 text-gray-400 hover:text-brand-500 hover:border-brand-300 transition-colors"
          title="Dettaglio stanza"
        >
          <BedDouble className="w-4 h-4" />
        </Link>
      </div>
    </div>
  )
}

// ─── Modal nuovo task ─────────────────────────────────────────────────────────

function NuovoTaskModal({
  unitaId,
  unitaNome,
  onClose,
  onCreato,
}: {
  unitaId: string
  unitaNome: string
  onClose: () => void
  onCreato: (task: TaskHK) => void
}) {
  const [form, setForm] = useState({
    tipo: 'PULIZIA',
    descrizione: '',
    priorita: 'NORMALE',
    assegnatoA: '',
    dataScadenza: '',
  })
  const [loading, setLoading] = useState(false)
  const [errore, setErrore] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setErrore('')
    const res = await fetch('/api/host/housekeeping/task', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ unitaId, ...form }),
    })
    if (!res.ok) {
      const j = await res.json()
      setErrore(j.error || 'Errore')
      setLoading(false); return
    }
    const task = await res.json()
    onCreato(task)
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div>
            <h3 className="text-base font-bold text-gray-900">Nuovo task HK</h3>
            <p className="text-xs text-gray-500 mt-0.5">{unitaNome}</p>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-100 text-gray-400">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {errore && <p className="text-sm text-red-600">{errore}</p>}

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
            <textarea
              rows={2}
              value={form.descrizione}
              onChange={e => setForm(f => ({ ...f, descrizione: e.target.value }))}
              className="input"
              placeholder="Note per lo staff..."
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Assegnato a</label>
              <input
                type="text"
                value={form.assegnatoA}
                onChange={e => setForm(f => ({ ...f, assegnatoA: e.target.value }))}
                className="input"
                placeholder="Nome operatore"
              />
            </div>
            <div>
              <label className="label">Scadenza</label>
              <input
                type="date"
                value={form.dataScadenza}
                onChange={e => setForm(f => ({ ...f, dataScadenza: e.target.value }))}
                className="input"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-1">
            <button type="submit" disabled={loading} className="flex-1 btn-primary flex items-center justify-center gap-2">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              {loading ? 'Salvo...' : 'Crea task'}
            </button>
            <button type="button" onClick={onClose} className="btn-secondary">Annulla</button>
          </div>
        </form>
      </div>
    </div>
  )
}
