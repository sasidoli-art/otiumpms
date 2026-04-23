'use client'

import { useCallback, useEffect, useState } from 'react'
import { LayoutGrid, List, AlertTriangle, Wrench, Clock, Euro } from 'lucide-react'
import ManutenzioneBoard from '@/app/host/manutenzione/manutenzione-board'
import KanbanBoard, { type SegnalazioneKanban } from './kanban-board'

type Struttura = { id: string; nome: string }

type Stats = {
  aperte: number
  inLavorazione: number
  risolteUltimi30gg: number
  aperteUrgenti: number
  tempoMedioRisoluzioneOre: number
  costoMedioReale: number
  costoTotale: number
  costoRilevazioni: number
  perPriorita: Record<string, number>
}

export default function ManutenzionePage({
  strutture,
  segnalazioniIniziali,
}: {
  strutture: Struttura[]
  segnalazioniIniziali: SegnalazioneKanban[]
}) {
  const [view, setView] = useState<'lista' | 'kanban'>(() => {
    if (typeof window === 'undefined') return 'kanban'
    return (localStorage.getItem('manutenzione_view') as 'lista' | 'kanban') ?? 'kanban'
  })
  const [stats, setStats] = useState<Stats | null>(null)

  useEffect(() => {
    if (typeof window !== 'undefined') localStorage.setItem('manutenzione_view', view)
  }, [view])

  const loadStats = useCallback(async () => {
    try {
      const res = await fetch('/api/host/manutenzione/stats')
      if (res.ok) setStats(await res.json())
    } catch { /* silent */ }
  }, [])
  useEffect(() => { loadStats() }, [loadStats])

  return (
    <div className="space-y-5">
      {/* KPI bar */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Kpi
            label="Aperte"
            value={String(stats.aperte + stats.inLavorazione)}
            sub={stats.aperteUrgenti > 0 ? `${stats.aperteUrgenti} urgenti` : undefined}
            subTone={stats.aperteUrgenti > 0 ? 'red' : undefined}
            icon={AlertTriangle}
            tone="red"
          />
          <Kpi
            label="In lavorazione"
            value={String(stats.inLavorazione)}
            icon={Wrench}
            tone="blue"
          />
          <Kpi
            label="Tempo medio risoluzione"
            value={stats.tempoMedioRisoluzioneOre > 0 ? `${stats.tempoMedioRisoluzioneOre} h` : '—'}
            sub={`${stats.risolteUltimi30gg} risolte ultimi 30gg`}
            icon={Clock}
            tone="emerald"
          />
          <Kpi
            label="Costo medio riparazione"
            value={stats.costoMedioReale > 0 ? `€${stats.costoMedioReale.toFixed(2)}` : '—'}
            sub={stats.costoRilevazioni > 0 ? `su ${stats.costoRilevazioni} interventi` : undefined}
            icon={Euro}
            tone="amber"
          />
        </div>
      )}

      {/* Toggle */}
      <div className="flex items-center justify-end">
        <div className="inline-flex rounded-lg border border-gray-200 bg-white p-0.5">
          <button
            onClick={() => setView('lista')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded ${
              view === 'lista' ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <List className="w-4 h-4" /> Lista
          </button>
          <button
            onClick={() => setView('kanban')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded ${
              view === 'kanban' ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <LayoutGrid className="w-4 h-4" /> Kanban
          </button>
        </div>
      </div>

      {/* View body */}
      {view === 'lista' && (
        <ManutenzioneBoard
          strutture={strutture}
          segnalazioniIniziali={segnalazioniIniziali as unknown as Parameters<typeof ManutenzioneBoard>[0]['segnalazioniIniziali']}
        />
      )}
      {view === 'kanban' && (
        <KanbanBoard
          segnalazioni={segnalazioniIniziali}
          onStateChanged={() => loadStats()}
        />
      )}
    </div>
  )
}

const TONES: Record<string, { bg: string; icon: string }> = {
  red: { bg: 'bg-red-50', icon: 'text-red-500' },
  blue: { bg: 'bg-blue-50', icon: 'text-blue-500' },
  emerald: { bg: 'bg-emerald-50', icon: 'text-emerald-500' },
  amber: { bg: 'bg-amber-50', icon: 'text-amber-500' },
}

function Kpi({
  label, value, sub, subTone, icon: Icon, tone,
}: {
  label: string
  value: string
  sub?: string
  subTone?: 'red'
  icon: React.ComponentType<{ className?: string }>
  tone: keyof typeof TONES
}) {
  const t = TONES[tone]
  return (
    <div className={`rounded-xl ${t.bg} border border-gray-200 p-4`}>
      <div className="flex items-start justify-between mb-2">
        <span className="text-xs font-medium text-gray-600 uppercase tracking-wide">{label}</span>
        <Icon className={`w-4 h-4 ${t.icon}`} />
      </div>
      <div className="text-2xl font-bold text-gray-900 tabular-nums">{value}</div>
      {sub && (
        <div className={`text-xs mt-0.5 ${subTone === 'red' ? 'text-red-600 font-semibold' : 'text-gray-500'}`}>
          {sub}
        </div>
      )}
    </div>
  )
}
