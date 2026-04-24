'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { format, addDays, subDays } from 'date-fns'
import { it } from 'date-fns/locale'
import {
  Calendar, ChevronLeft, ChevronRight, Users, Clock, Phone, Mail, StickyNote,
  Loader2, UtensilsCrossed, Check, X, CircleSlash, CheckCircle2,
} from 'lucide-react'

type Prenotazione = {
  id: string
  guestNome: string
  guestCognome: string
  guestEmail: string
  guestTelefono: string | null
  dataOra: string
  numPersone: number
  note: string | null
  stato: 'CONFERMATA' | 'ANNULLATA' | 'COMPLETATA' | 'NO_SHOW' | string
  prenotazioneId: string | null
  createdAt: string
}

function ymd(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

const STATO_LABEL: Record<string, string> = {
  CONFERMATA: 'Confermata',
  ANNULLATA: 'Annullata',
  COMPLETATA: 'Completata',
  NO_SHOW: 'No-show',
}

const STATO_CLASS: Record<string, string> = {
  CONFERMATA: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  ANNULLATA: 'bg-gray-100 text-gray-500 border-gray-200 line-through',
  COMPLETATA: 'bg-blue-50 text-blue-700 border-blue-200',
  NO_SHOW: 'bg-amber-50 text-amber-700 border-amber-200',
}

export default function PrenotazioniRistoranteClient() {
  const [date, setDate] = useState<Date>(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d
  })
  const [list, setList] = useState<Prenotazione[]>([])
  const [loading, setLoading] = useState(true)
  const [errore, setErrore] = useState<string | null>(null)
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setErrore(null)
    try {
      const res = await fetch(`/api/host/ristorazione/prenotazioni?data=${ymd(date)}`)
      const data = await res.json()
      if (!res.ok) {
        setErrore(data.error ?? 'Errore caricamento')
        setList([])
      } else {
        setList(data.prenotazioni ?? [])
      }
    } catch {
      setErrore('Errore di rete')
    } finally {
      setLoading(false)
    }
  }, [date])

  useEffect(() => { load() }, [load])

  async function cambiaStato(id: string, stato: Prenotazione['stato']) {
    setUpdatingId(id)
    try {
      const res = await fetch(`/api/host/ristorazione/prenotazioni/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stato }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        setErrore(d.error ?? 'Aggiornamento fallito')
      } else {
        setList((prev) => prev.map((p) => (p.id === id ? { ...p, stato } : p)))
      }
    } finally {
      setUpdatingId(null)
    }
  }

  const totCoperti = useMemo(
    () => list.filter((p) => p.stato === 'CONFERMATA' || p.stato === 'COMPLETATA')
      .reduce((s, p) => s + p.numPersone, 0),
    [list],
  )

  const isToday = ymd(date) === ymd(new Date())

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
          <UtensilsCrossed className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900">Prenotazioni ristorante</h1>
          <p className="text-xs text-gray-500">Tavoli prenotati dal booking engine</p>
        </div>
      </div>

      {/* Date nav */}
      <div className="bg-white rounded-xl border border-gray-100 p-3 md:p-4 mb-4 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => setDate((d) => subDays(d, 1))}
          className="w-9 h-9 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50"
          aria-label="Giorno precedente"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <div className="flex-1 text-center">
          <p className="text-sm font-bold text-gray-900">
            {format(date, "EEEE d MMMM yyyy", { locale: it })}
          </p>
          <p className="text-[11px] text-gray-500">
            {isToday ? 'Oggi' : ''} · {list.length} prenotazioni · {totCoperti} coperti
          </p>
        </div>

        <button
          type="button"
          onClick={() => setDate((d) => addDays(d, 1))}
          className="w-9 h-9 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50"
          aria-label="Giorno successivo"
        >
          <ChevronRight className="w-4 h-4" />
        </button>

        {!isToday && (
          <button
            type="button"
            onClick={() => { const d = new Date(); d.setHours(0,0,0,0); setDate(d) }}
            className="hidden md:flex text-xs font-semibold text-indigo-600 hover:underline px-2"
          >
            <Calendar className="w-3.5 h-3.5 mr-1 inline" /> Oggi
          </button>
        )}
      </div>

      {errore && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700 mb-4">
          {errore}
        </div>
      )}

      {loading ? (
        <div className="py-16 text-center">
          <Loader2 className="w-6 h-6 animate-spin mx-auto text-gray-400" />
        </div>
      ) : list.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 p-10 text-center">
          <UtensilsCrossed className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-sm font-semibold text-gray-900">Nessuna prenotazione per questo giorno</p>
          <p className="text-xs text-gray-500 mt-1">
            Quando qualcuno prenota un tavolo dal booking pubblico, comparirà qui.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {list.map((p) => {
            const ora = format(new Date(p.dataOra), 'HH:mm')
            const stato = p.stato as keyof typeof STATO_LABEL
            const isUpdating = updatingId === p.id
            const canConfirm = p.stato !== 'CONFERMATA'
            const canComplete = p.stato === 'CONFERMATA'
            const canCancel = p.stato !== 'ANNULLATA'
            const canNoShow = p.stato === 'CONFERMATA'

            return (
              <li key={p.id} className="bg-white rounded-xl border border-gray-100 p-4 md:p-5">
                <div className="flex items-start gap-4 flex-wrap">
                  {/* Ora */}
                  <div className="flex flex-col items-center shrink-0 w-14">
                    <Clock className="w-3.5 h-3.5 text-gray-400 mb-1" />
                    <span className="text-lg font-bold text-gray-900 leading-none">{ora}</span>
                  </div>

                  {/* Ospite */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-gray-900 truncate">
                        {p.guestNome} {p.guestCognome}
                      </p>
                      <span
                        className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${STATO_CLASS[stato] ?? 'bg-gray-100 text-gray-500 border-gray-200'}`}
                      >
                        {STATO_LABEL[stato] ?? p.stato}
                      </span>
                      {p.prenotazioneId && (
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-indigo-50 text-indigo-700">
                          In-house
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 mt-1">
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3" /> {p.numPersone} {p.numPersone === 1 ? 'persona' : 'persone'}
                      </span>
                      <a href={`mailto:${p.guestEmail}`} className="flex items-center gap-1 hover:text-gray-900">
                        <Mail className="w-3 h-3" /> {p.guestEmail}
                      </a>
                      {p.guestTelefono && (
                        <a href={`tel:${p.guestTelefono}`} className="flex items-center gap-1 hover:text-gray-900">
                          <Phone className="w-3 h-3" /> {p.guestTelefono}
                        </a>
                      )}
                    </div>
                    {p.note && (
                      <p className="mt-2 text-xs text-gray-700 flex items-start gap-1.5 bg-amber-50 border border-amber-100 rounded-lg p-2">
                        <StickyNote className="w-3.5 h-3.5 mt-0.5 shrink-0 text-amber-500" />
                        {p.note}
                      </p>
                    )}
                  </div>

                  {/* Azioni */}
                  <div className="flex flex-wrap gap-1.5 shrink-0">
                    {canConfirm && (
                      <ActionButton
                        onClick={() => cambiaStato(p.id, 'CONFERMATA')}
                        disabled={isUpdating}
                        icon={<Check className="w-3.5 h-3.5" />}
                        label="Conferma"
                        tone="emerald"
                      />
                    )}
                    {canComplete && (
                      <ActionButton
                        onClick={() => cambiaStato(p.id, 'COMPLETATA')}
                        disabled={isUpdating}
                        icon={<CheckCircle2 className="w-3.5 h-3.5" />}
                        label="Completata"
                        tone="blue"
                      />
                    )}
                    {canNoShow && (
                      <ActionButton
                        onClick={() => cambiaStato(p.id, 'NO_SHOW')}
                        disabled={isUpdating}
                        icon={<CircleSlash className="w-3.5 h-3.5" />}
                        label="No-show"
                        tone="amber"
                      />
                    )}
                    {canCancel && (
                      <ActionButton
                        onClick={() => cambiaStato(p.id, 'ANNULLATA')}
                        disabled={isUpdating}
                        icon={<X className="w-3.5 h-3.5" />}
                        label="Annulla"
                        tone="gray"
                      />
                    )}
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

function ActionButton({
  onClick, disabled, icon, label, tone,
}: {
  onClick: () => void
  disabled?: boolean
  icon: React.ReactNode
  label: string
  tone: 'emerald' | 'blue' | 'amber' | 'gray'
}) {
  const toneClass = {
    emerald: 'text-emerald-700 border-emerald-200 hover:bg-emerald-50',
    blue: 'text-blue-700 border-blue-200 hover:bg-blue-50',
    amber: 'text-amber-700 border-amber-200 hover:bg-amber-50',
    gray: 'text-gray-500 border-gray-200 hover:bg-gray-50',
  }[tone]
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg border ${toneClass} disabled:opacity-40`}
    >
      {icon} {label}
    </button>
  )
}
