'use client'

import { useState, useEffect, useCallback } from 'react'
import { format } from 'date-fns'
import { it } from 'date-fns/locale'
import { Loader2, Search, ChevronLeft, ChevronRight, Shield, Clock, User, FileText, Building2 } from 'lucide-react'

type LogEntry = {
  id: string
  hostId: string | null
  azione: string
  entita: string
  entitaId: string | null
  dettagli: string | null
  userEmail: string | null
  ip: string | null
  createdAt: string
}

type HostOption = { id: string; nomeAzienda: string }

const inp = 'px-3 py-1.5 border border-gray-200 dark:border-slate-600 rounded-xl text-sm focus:border-brand-400 focus:ring-1 focus:ring-brand-400 outline-none dark:bg-slate-800 dark:text-slate-200'

const ENTITA_COLORS: Record<string, string> = {
  prenotazione: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400',
  addebito: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400',
  struttura: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400',
  fattura: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-400',
  host: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-400',
  utente: 'bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-400',
  cassa: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400',
  appuntamento_spa: 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-400',
  transazione_pos: 'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-400',
}

export default function SuperAdminAuditPage() {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [totale, setTotale] = useState(0)
  const [hosts, setHosts] = useState<HostOption[]>([])
  const [loading, setLoading] = useState(true)
  const [offset, setOffset] = useState(0)
  const [entita, setEntita] = useState('')
  const [azione, setAzione] = useState('')
  const [hostId, setHostId] = useState('')
  const limit = 50

  const carica = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({ limit: String(limit), offset: String(offset) })
    if (entita) params.set('entita', entita)
    if (azione) params.set('azione', azione)
    if (hostId) params.set('hostId', hostId)
    const res = await fetch(`/api/superadmin/audit?${params}`)
    if (res.ok) {
      const d = await res.json()
      setLogs(d.logs)
      setTotale(d.totale)
      if (d.hosts) setHosts(d.hosts)
    }
    setLoading(false)
  }, [offset, entita, azione, hostId])

  useEffect(() => { carica() }, [carica])

  const hostMap = Object.fromEntries(hosts.map(h => [h.id, h.nomeAzienda]))

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
          <Shield className="w-5 h-5 text-red-600" />
        </div>
        <div>
          <h1 className="text-2xl font-heading font-bold text-gray-900 dark:text-white">Audit Log</h1>
          <p className="text-sm text-gray-500 dark:text-slate-400">Registro completo di tutte le operazioni — tutti gli host</p>
        </div>
        <span className="ml-auto text-xs text-gray-400">{totale} eventi</span>
      </div>

      {/* Filtri */}
      <div className="flex flex-wrap gap-3">
        <select value={hostId} onChange={e => { setHostId(e.target.value); setOffset(0) }} className={inp}>
          <option value="">Tutti gli host</option>
          {hosts.map(h => <option key={h.id} value={h.id}>{h.nomeAzienda}</option>)}
        </select>
        <div className="relative">
          <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-gray-400" />
          <input value={entita} onChange={e => { setEntita(e.target.value); setOffset(0) }} placeholder="Entità..." className={`${inp} pl-8`} />
        </div>
        <div className="relative">
          <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-gray-400" />
          <input value={azione} onChange={e => { setAzione(e.target.value); setOffset(0) }} placeholder="Azione..." className={`${inp} pl-8`} />
        </div>
      </div>

      {/* Log list */}
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-gray-300" /></div>
      ) : logs.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <FileText className="w-10 h-10 mx-auto mb-3 opacity-20" />
          <p>Nessun evento registrato</p>
        </div>
      ) : (
        <div className="space-y-2">
          {logs.map(log => (
            <div key={log.id} className="card !py-3 flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-slate-800 flex items-center justify-center shrink-0 mt-0.5">
                <Clock className="w-4 h-4 text-gray-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${ENTITA_COLORS[log.entita] ?? 'bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-slate-300'}`}>
                    {log.entita}
                  </span>
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">{log.azione}</span>
                  {log.hostId && hostMap[log.hostId] && (
                    <span className="text-[10px] text-gray-400 flex items-center gap-0.5">
                      <Building2 className="w-3 h-3" /> {hostMap[log.hostId]}
                    </span>
                  )}
                </div>
                {log.dettagli && <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5 truncate">{log.dettagli}</p>}
                <div className="flex items-center gap-3 mt-1 text-[10px] text-gray-400">
                  <span className="flex items-center gap-0.5"><Clock className="w-3 h-3" />{format(new Date(log.createdAt), 'dd/MM/yyyy HH:mm:ss', { locale: it })}</span>
                  {log.userEmail && <span className="flex items-center gap-0.5"><User className="w-3 h-3" />{log.userEmail}</span>}
                  {log.ip && <span>{log.ip}</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Paginazione */}
      {totale > limit && (
        <div className="flex items-center justify-between">
          <button onClick={() => setOffset(Math.max(0, offset - limit))} disabled={offset === 0}
            className="btn-secondary text-xs flex items-center gap-1 disabled:opacity-50">
            <ChevronLeft className="w-3.5 h-3.5" /> Precedenti
          </button>
          <span className="text-xs text-gray-400">{offset + 1}–{Math.min(offset + limit, totale)} di {totale}</span>
          <button onClick={() => setOffset(offset + limit)} disabled={offset + limit >= totale}
            className="btn-secondary text-xs flex items-center gap-1 disabled:opacity-50">
            Successivi <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  )
}
