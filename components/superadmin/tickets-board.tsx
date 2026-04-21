'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { format } from 'date-fns'
import { it } from 'date-fns/locale'
import {
  Search, X, Loader2, AlertCircle, Clock, CheckCircle2, ChevronRight,
} from 'lucide-react'

type Ticket = {
  id: string
  oggetto: string
  descrizione: string
  categoria: string
  priorita: 'BASSA' | 'NORMALE' | 'ALTA' | 'URGENTE'
  stato: 'APERTO' | 'IN_LAVORAZIONE' | 'IN_ATTESA_RISPOSTA' | 'RISOLTO' | 'CHIUSO'
  createdAt: string
  user: { id: string; nome: string; cognome: string; email: string; role: string }
  host: { id: string; nomeAzienda: string } | null
}

type Kpi = { totale: number; aperti: number; inLavorazione: number; risolti: number; chiusi: number }

const PRIORITA_CLS: Record<string, string> = {
  BASSA: 'bg-gray-100 text-gray-600',
  NORMALE: 'bg-blue-50 text-blue-700',
  ALTA: 'bg-orange-50 text-orange-700',
  URGENTE: 'bg-red-50 text-red-700 ring-1 ring-red-200',
}

const STATO_CLS: Record<string, string> = {
  APERTO: 'bg-amber-50 text-amber-700',
  IN_LAVORAZIONE: 'bg-blue-50 text-blue-700',
  IN_ATTESA_RISPOSTA: 'bg-indigo-50 text-indigo-700',
  RISOLTO: 'bg-green-50 text-green-700',
  CHIUSO: 'bg-gray-100 text-gray-500',
}

export default function TicketsBoard() {
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [kpi, setKpi] = useState<Kpi>({ totale: 0, aperti: 0, inLavorazione: 0, risolti: 0, chiusi: 0 })
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [stato, setStato] = useState('')
  const [priorita, setPriorita] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    const sp = new URLSearchParams()
    if (q) sp.set('q', q)
    if (stato) sp.set('stato', stato)
    if (priorita) sp.set('priorita', priorita)
    const res = await fetch(`/api/superadmin/tickets?${sp}`)
    if (res.ok) {
      const d = await res.json()
      setTickets(d.tickets)
      setKpi(d.kpi)
    }
    setLoading(false)
  }, [q, stato, priorita])

  useEffect(() => {
    const t = setTimeout(load, 200)
    return () => clearTimeout(t)
  }, [load])

  return (
    <div className="space-y-6">
      {/* KPI */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <KpiCard label="Totale" value={kpi.totale} color="bg-slate-100 text-slate-700" />
        <KpiCard label="Aperti" value={kpi.aperti} color="bg-amber-50 text-amber-700" icon={<AlertCircle className="w-4 h-4" />} />
        <KpiCard label="In lavorazione" value={kpi.inLavorazione} color="bg-blue-50 text-blue-700" icon={<Clock className="w-4 h-4" />} />
        <KpiCard label="Risolti" value={kpi.risolti} color="bg-green-50 text-green-700" icon={<CheckCircle2 className="w-4 h-4" />} />
        <KpiCard label="Chiusi" value={kpi.chiusi} color="bg-gray-100 text-gray-500" />
      </div>

      {/* Filtri */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Cerca per oggetto o descrizione..."
            className="input pl-9"
          />
          {q && (
            <button onClick={() => setQ('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <select
          value={stato} onChange={(e) => setStato(e.target.value)}
          className="px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm font-medium"
        >
          <option value="">Tutti gli stati</option>
          <option value="APERTO">Aperti</option>
          <option value="IN_LAVORAZIONE">In lavorazione</option>
          <option value="IN_ATTESA_RISPOSTA">In attesa risposta</option>
          <option value="RISOLTO">Risolti</option>
          <option value="CHIUSO">Chiusi</option>
        </select>
        <select
          value={priorita} onChange={(e) => setPriorita(e.target.value)}
          className="px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm font-medium"
        >
          <option value="">Tutte le priorità</option>
          <option value="URGENTE">🔴 Urgente</option>
          <option value="ALTA">🟠 Alta</option>
          <option value="NORMALE">Normale</option>
          <option value="BASSA">Bassa</option>
        </select>
        {loading && <Loader2 className="w-4 h-4 animate-spin text-gray-400" />}
      </div>

      {/* Tabella */}
      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <th className="table-th">Oggetto</th>
                <th className="table-th hidden md:table-cell">Autore</th>
                <th className="table-th hidden lg:table-cell">Host</th>
                <th className="table-th">Priorità</th>
                <th className="table-th">Stato</th>
                <th className="table-th hidden md:table-cell">Data</th>
                <th className="table-th w-10"></th>
              </tr>
            </thead>
            <tbody>
              {tickets.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-14 text-center text-gray-400 text-sm">
                    Nessun ticket per i filtri selezionati
                  </td>
                </tr>
              ) : (
                tickets.map((t) => {
                  const autoreNome = `${t.user.nome} ${t.user.cognome}`.trim() || t.user.email
                  return (
                    <tr key={t.id} className="border-b border-gray-50 hover:bg-gray-50/60 group">
                      <td className="table-td">
                        <p className="font-semibold text-gray-900 truncate max-w-xs">{t.oggetto}</p>
                        <p className="text-xs text-gray-400 truncate max-w-xs">{t.categoria}</p>
                      </td>
                      <td className="table-td hidden md:table-cell">
                        <p className="text-gray-700 text-sm">{autoreNome}</p>
                        <p className="text-xs text-gray-400">{t.user.role}</p>
                      </td>
                      <td className="table-td hidden lg:table-cell text-gray-600 text-sm">
                        {t.host?.nomeAzienda ?? '—'}
                      </td>
                      <td className="table-td">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${PRIORITA_CLS[t.priorita]}`}>
                          {t.priorita}
                        </span>
                      </td>
                      <td className="table-td">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${STATO_CLS[t.stato]}`}>
                          {t.stato.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="table-td hidden md:table-cell text-xs text-gray-500">
                        {format(new Date(t.createdAt), 'd MMM HH:mm', { locale: it })}
                      </td>
                      <td className="table-td">
                        <Link
                          href={`/superadmin/tickets/${t.id}`}
                          className="p-1.5 rounded text-gray-400 hover:text-brand-500 hover:bg-brand-50"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </Link>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function KpiCard({
  label, value, color, icon,
}: {
  label: string; value: number; color: string; icon?: React.ReactNode
}) {
  return (
    <div className="card flex items-center gap-2.5">
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${color}`}>
        {icon ?? <div className="w-2 h-2 rounded-full bg-current opacity-40" />}
      </div>
      <div>
        <p className="text-xl font-extrabold leading-none">{value}</p>
        <p className="text-[11px] text-gray-500 mt-0.5">{label}</p>
      </div>
    </div>
  )
}
