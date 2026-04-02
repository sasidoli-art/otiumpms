'use client'

import { useState } from 'react'
import { BedDouble, Loader2, CheckCircle2, AlertTriangle, Sparkles, Zap } from 'lucide-react'
import { useTranslations } from 'next-intl'

type Camera = { id: string; nome: string; capacita: number; piano: number | null; prezzoBase: number; statoHK: string; score: number; motivoScore: string }
type StatoCamera = { nome: string; statoHK: string; piano: number | null; ultimaPulizia: string | null; noteHK: string | null } | null

const HK_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  PULITA: { label: 'Pulita', color: 'text-green-700', bg: 'bg-green-100' },
  OCCUPATA: { label: 'Occupata', color: 'text-blue-700', bg: 'bg-blue-100' },
  IN_PULIZIA: { label: 'In pulizia', color: 'text-yellow-700', bg: 'bg-yellow-100' },
  SPORCA: { label: 'Da pulire', color: 'text-red-700', bg: 'bg-red-100' },
  NON_DISPONIBILE: { label: 'Non disponibile', color: 'text-gray-700', bg: 'bg-gray-100' },
}

export default function AssegnazioneSection({ prenotazioneId, cameraAttuale }: { prenotazioneId: string; cameraAttuale: string | null }) {
  const [camere, setCamere] = useState<Camera[]>([])
  const [consigliata, setConsigliata] = useState<Camera | null>(null)
  const [statoCamera, setStatoCamera] = useState<StatoCamera>(null)
  const [loading, setLoading] = useState(false)
  const [assegnando, setAssegnando] = useState(false)
  const [successo, setSuccesso] = useState<string | null>(null)
  const [aperto, setAperto] = useState(false)

  // Carica stato camera assegnata
  useState(() => {
    if (cameraAttuale) {
      fetch(`/api/host/prenotazioni/${prenotazioneId}/stato-camera`)
        .then(r => r.ok ? r.json() : null)
        .then(d => { if (d) setStatoCamera(d) })
    }
  })

  async function carica() {
    setLoading(true); setAperto(true)
    const res = await fetch(`/api/host/prenotazioni/${prenotazioneId}/assegna-camera`)
    if (res.ok) {
      const d = await res.json()
      setCamere(d.camereDisponibili)
      setConsigliata(d.consigliata)
    }
    setLoading(false)
  }

  async function assegna(unitaId: string, modalita: string) {
    setAssegnando(true)
    const res = await fetch(`/api/host/prenotazioni/${prenotazioneId}/assegna-camera`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ unitaId, modalita }),
    })
    if (res.ok) {
      const d = await res.json()
      setSuccesso(d.cameraAssegnata.nome)
      setTimeout(() => setSuccesso(null), 3000)
    }
    setAssegnando(false)
  }

  async function autoAssegna() {
    setAssegnando(true)
    const res = await fetch(`/api/host/prenotazioni/${prenotazioneId}/assegna-camera`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ modalita: 'AUTOMATICA' }),
    })
    if (res.ok) {
      const d = await res.json()
      setSuccesso(d.cameraAssegnata.nome)
    }
    setAssegnando(false)
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-base font-semibold flex items-center gap-2">
          <BedDouble className="w-4 h-4 text-brand-500" /> Camera
        </h2>
        {successo && <span className="text-xs text-green-600 flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> {successo}</span>}
      </div>

      {/* Stato camera assegnata */}
      {statoCamera && !successo && (
        <div className="mb-3 p-3 rounded-lg bg-gray-50 dark:bg-slate-800 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-900 dark:text-slate-100">{statoCamera.nome}</span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${HK_LABELS[statoCamera.statoHK]?.bg ?? 'bg-gray-100'} ${HK_LABELS[statoCamera.statoHK]?.color ?? 'text-gray-700'}`}>
              {HK_LABELS[statoCamera.statoHK]?.label ?? statoCamera.statoHK}
            </span>
          </div>
          <div className="flex items-center gap-3 text-[10px] text-gray-400">
            {statoCamera.piano !== null && <span>Piano {statoCamera.piano}</span>}
            {statoCamera.ultimaPulizia && <span>Ultima pulizia: {statoCamera.ultimaPulizia}</span>}
          </div>
          {statoCamera.noteHK && (
            <p className="text-[10px] text-amber-600 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" /> {statoCamera.noteHK}
            </p>
          )}
        </div>
      )}
      {cameraAttuale && !successo && !statoCamera && <p className="text-xs text-gray-500 mb-2">Attuale: <span className="font-medium">{cameraAttuale}</span></p>}

      <div className="flex gap-2">
        <button onClick={autoAssegna} disabled={assegnando} className="btn-primary text-xs flex items-center gap-1.5 py-1.5">
          {assegnando ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />} Auto
        </button>
        <button onClick={carica} disabled={loading} className="btn-secondary text-xs flex items-center gap-1.5 py-1.5">
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <BedDouble className="w-3.5 h-3.5" />} Scegli
        </button>
      </div>

      {aperto && camere.length > 0 && (
        <div className="mt-3 space-y-1.5 max-h-48 overflow-y-auto">
          {camere.map(c => (
            <button key={c.id} onClick={() => assegna(c.id, 'MANUALE')} disabled={assegnando}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 dark:border-slate-600 hover:border-brand-300 hover:bg-brand-50/50 dark:hover:bg-brand-900/10 text-left transition-all text-xs">
              <span className={`w-2 h-2 rounded-full ${c.statoHK === 'PULITA' ? 'bg-green-400' : c.statoHK === 'IN_PULIZIA' ? 'bg-yellow-400' : 'bg-red-400'}`} />
              <span className="font-medium flex-1">{c.nome}</span>
              {c.piano !== null && <span className="text-gray-400">P{c.piano}</span>}
              <span className="text-gray-400">Cap. {c.capacita}</span>
              <span className="text-brand-600 font-bold">{c.score}pt</span>
              {consigliata?.id === c.id && <Sparkles className="w-3 h-3 text-amber-500" />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
