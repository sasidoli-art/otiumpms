'use client'

import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { it } from 'date-fns/locale'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { Bot, MessageSquare, AlertTriangle, CheckCircle2, Loader2, Settings, FlaskConical, Users } from 'lucide-react'

type Conv = {
  id: string; telefonoOspite: string; nomeOspite: string | null; stato: string; lingua: string; updatedAt: string
  prenotazione: { id: string; guestNome: string; guestCognome: string; unita: { nome: string } | null } | null
  _count: { messaggi: number; azioni: number }
}

const STATO_BADGE: Record<string, { label: string; color: string }> = {
  ATTIVA: { label: 'Attiva', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  ESCALATA: { label: 'Escalata', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
  CHIUSA: { label: 'Chiusa', color: 'bg-gray-100 text-gray-500 dark:bg-slate-700 dark:text-slate-400' },
}

export default function ConciergeDashboard() {
  const t = useTranslations('host.concierge')
  const tc = useTranslations('common')
  const [conversazioni, setConversazioni] = useState<Conv[]>([])
  const [kpi, setKpi] = useState({ attive: 0, escalate: 0, totali: 0 })
  const [loading, setLoading] = useState(true)
  const [filtro, setFiltro] = useState('')

  useEffect(() => {
    const params = filtro ? `?stato=${filtro}` : ''
    fetch(`/api/host/concierge${params}`)
      .then(r => r.ok ? r.json() : { conversazioni: [], kpi: { attive: 0, escalate: 0, totali: 0 } })
      .then(d => { setConversazioni(d.conversazioni); setKpi(d.kpi) })
      .finally(() => setLoading(false))
  }, [filtro])

  return (
    <div className="space-y-6">
      <div className="page-title-box">
        <div>
          <h1 className="page-title flex items-center gap-2"><Bot className="w-6 h-6 text-purple-500" /> {t('title')}</h1>
          <p className="text-sm text-gray-500">Conversazioni WhatsApp gestite dall'intelligenza artificiale</p>
        </div>
        <div className="flex gap-2">
          <Link href="/host/concierge/test" className="btn-secondary flex items-center gap-2 text-sm"><FlaskConical className="w-4 h-4" /> Simulatore</Link>
          <Link href="/host/concierge/impostazioni" className="btn-secondary flex items-center gap-2 text-sm"><Settings className="w-4 h-4" /> Impostazioni</Link>
        </div>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-3 gap-4">
        <button onClick={() => setFiltro(filtro === 'ATTIVA' ? '' : 'ATTIVA')} className={`card py-3 flex flex-col items-center cursor-pointer hover:shadow-md ${filtro === 'ATTIVA' ? 'ring-2 ring-green-500' : ''}`}>
          <span className="text-2xl font-extrabold text-green-600">{kpi.attive}</span>
          <span className="text-xs text-gray-500">Attive</span>
        </button>
        <button onClick={() => setFiltro(filtro === 'ESCALATA' ? '' : 'ESCALATA')} className={`card py-3 flex flex-col items-center cursor-pointer hover:shadow-md ${filtro === 'ESCALATA' ? 'ring-2 ring-red-500' : ''}`}>
          <span className="text-2xl font-extrabold text-red-600">{kpi.escalate}</span>
          <span className="text-xs text-gray-500">Escalate</span>
        </button>
        <div className="card py-3 flex flex-col items-center">
          <span className="text-2xl font-extrabold text-gray-600">{kpi.totali}</span>
          <span className="text-xs text-gray-500">Totali</span>
        </div>
      </div>

      {/* Lista conversazioni */}
      {loading ? (
        <div className="card py-12 flex items-center justify-center text-gray-400"><Loader2 className="w-6 h-6 animate-spin" /></div>
      ) : conversazioni.length === 0 ? (
        <div className="card py-12 flex flex-col items-center gap-3 text-gray-300">
          <Bot className="w-12 h-12 opacity-30" />
          <p className="text-sm">Nessuna conversazione</p>
          <Link href="/host/concierge/test" className="text-sm text-purple-600 hover:underline">Prova il simulatore</Link>
        </div>
      ) : (
        <div className="space-y-2">
          {conversazioni.map(c => {
            const st = STATO_BADGE[c.stato] || STATO_BADGE.CHIUSA
            return (
              <Link key={c.id} href={`/host/concierge/${c.id}`} className="card flex items-center gap-3 hover:border-purple-300 dark:hover:border-purple-600 transition-colors">
                <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center shrink-0">
                  <MessageSquare className="w-5 h-5 text-purple-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-sm font-semibold text-gray-900 dark:text-slate-100">{c.nomeOspite || c.telefonoOspite}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${st.color}`}>{st.label}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-400">
                    <span>{c.telefonoOspite}</span>
                    <span>{c._count.messaggi} msg</span>
                    {c._count.azioni > 0 && <span>{c._count.azioni} azioni</span>}
                    {c.prenotazione && <span className="text-purple-600">{c.prenotazione.guestNome} {c.prenotazione.guestCognome}{c.prenotazione.unita ? ` · ${c.prenotazione.unita.nome}` : ''}</span>}
                    <span className="ml-auto">{format(new Date(c.updatedAt), 'd MMM HH:mm', { locale: it })}</span>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
