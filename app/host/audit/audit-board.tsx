'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { format } from 'date-fns'
import { it } from 'date-fns/locale'
import { Loader2, Search, Clock, User, FileText, ChevronLeft, ChevronRight, Shield, Download } from 'lucide-react'

type LogEntry = {
  id: string
  azione: string
  entita: string
  entitaId: string | null
  dettagli: string | null
  userEmail: string | null
  ip: string | null
  createdAt: string
}

const inp = 'px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:border-brand-400 focus:ring-1 focus:ring-brand-400 outline-none'

export default function AuditBoard() {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [totale, setTotale] = useState(0)
  const [loading, setLoading] = useState(true)
  const [offset, setOffset] = useState(0)
  const [entita, setEntita] = useState('')
  const [azione, setAzione] = useState('')
  const [soloAccessi, setSoloAccessi] = useState(false)
  const limit = 50

  const carica = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({ limit: String(limit), offset: String(offset) })
    if (entita) params.set('entita', entita)
    if (azione && !soloAccessi) params.set('azione', azione)
    if (soloAccessi) params.set('soloAccessi', 'true')
    const res = await fetch(`/api/host/audit?${params}`)
    if (res.ok) {
      const d = await res.json()
      setLogs(d.logs)
      setTotale(d.totale)
    }
    setLoading(false)
  }, [offset, entita, azione, soloAccessi])

  const exportHref = (() => {
    const params = new URLSearchParams({ export: 'csv' })
    if (entita) params.set('entita', entita)
    if (azione && !soloAccessi) params.set('azione', azione)
    if (soloAccessi) params.set('soloAccessi', 'true')
    return `/api/host/audit?${params}`
  })()

  useEffect(() => { carica() }, [carica])

  const pagine = Math.ceil(totale / limit)
  const paginaCorrente = Math.floor(offset / limit) + 1

  return (
    <div className="space-y-6">
      <div className="page-title-box">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <Clock className="w-6 h-6 text-gray-500" /> Registro Attività
          </h1>
          <p className="text-sm text-gray-500">Cronologia azioni nel sistema</p>
        </div>
      </div>

      {/* Filtri */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[150px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" value={azione} onChange={e => { setAzione(e.target.value); setOffset(0) }} disabled={soloAccessi} placeholder="Cerca azione..." className={`w-full pl-9 ${inp} disabled:opacity-50`} />
        </div>
        <select value={entita} onChange={e => { setEntita(e.target.value); setOffset(0) }} className={inp}>
          <option value="">Tutte le entità</option>
          <option value="prenotazione">Prenotazioni</option>
          <option value="fattura">Fatture</option>
          <option value="ospite">Ospiti</option>
          <option value="struttura">Strutture</option>
          <option value="spa">SPA</option>
          <option value="sistema">Sistema</option>
        </select>
        <label className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer border transition-colors ${soloAccessi ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}>
          <input type="checkbox" checked={soloAccessi} onChange={e => { setSoloAccessi(e.target.checked); setOffset(0) }} className="sr-only" />
          <Shield className="w-3.5 h-3.5" /> Solo accessi dati personali
        </label>
        <a href={exportHref} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-gray-200 text-gray-600 hover:bg-gray-50">
          <Download className="w-3.5 h-3.5" /> Esporta CSV
        </a>
        <span className="text-xs text-gray-400">{totale} voci</span>
      </div>

      {/* Lista */}
      {loading ? (
        <div className="card py-12 flex items-center justify-center text-gray-400"><Loader2 className="w-6 h-6 animate-spin" /></div>
      ) : logs.length === 0 ? (
        <div className="card py-12 flex flex-col items-center gap-2 text-gray-300">
          <FileText className="w-10 h-10 opacity-30" />
          <p className="text-sm">Nessuna attività registrata</p>
        </div>
      ) : (
        <div className="card">
          <div className="space-y-0 divide-y divide-gray-100">
            {logs.map(l => (
              <div key={l.id} className="flex items-start gap-3 py-3 px-1">
                <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center shrink-0 mt-0.5">
                  <Clock className="w-3.5 h-3.5 text-gray-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-semibold text-brand-600 bg-brand-50 px-1.5 py-0.5 rounded">{l.azione}</span>
                    <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">{l.entita}</span>
                  </div>
                  {l.dettagli && <p className="text-sm text-gray-700 mt-0.5">{l.dettagli}</p>}
                  <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                    {l.userEmail && <span className="flex items-center gap-1"><User className="w-3 h-3" /> {l.userEmail}</span>}
                    <span>{format(new Date(l.createdAt), 'd MMM yyyy HH:mm:ss', { locale: it })}</span>
                    {l.ip && <span className="font-mono">{l.ip}</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Paginazione */}
      {pagine > 1 && (
        <div className="flex items-center justify-center gap-3">
          <button onClick={() => setOffset(Math.max(0, offset - limit))} disabled={offset === 0} className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-30">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm text-gray-500">Pagina {paginaCorrente} di {pagine}</span>
          <button onClick={() => setOffset(offset + limit)} disabled={offset + limit >= totale} className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-30">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  )
}
