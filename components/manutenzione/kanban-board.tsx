'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  AlertTriangle, Wrench, CheckCircle2, Clock, User,
  Loader2, Image as ImageIcon, Euro,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { it } from 'date-fns/locale'

// ────────────────────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────────────────────

export type SegnalazioneKanban = {
  id: string
  titolo: string
  descrizione: string | null
  stato: 'APERTA' | 'IN_LAVORAZIONE' | 'IN_ATTESA_PARTI' | 'RISOLTA' | 'ANNULLATA'
  priorita: 'URGENTE' | 'ALTA' | 'NORMALE' | 'BASSA'
  categoria: string
  assegnatoA: string | null
  costoReale: number | null
  dataRisoluzione: string | null
  immagineUrl: string | null
  immagini?: string[]
  createdAt: string
  struttura: { id: string; nome: string } | null
  unita: { id: string; nome: string } | null
}

type Stato = SegnalazioneKanban['stato']

const COLUMNS: Array<{ stato: Stato; label: string; accent: string }> = [
  { stato: 'APERTA', label: 'Da fare', accent: 'border-red-300' },
  { stato: 'IN_LAVORAZIONE', label: 'In lavorazione', accent: 'border-blue-300' },
  { stato: 'RISOLTA', label: 'Completate (ultime 10)', accent: 'border-emerald-300' },
]

const PRIORITA_STYLE: Record<string, { bg: string; text: string; label: string }> = {
  URGENTE: { bg: 'bg-red-100', text: 'text-red-700', label: 'Urgente' },
  ALTA: { bg: 'bg-orange-100', text: 'text-orange-700', label: 'Alta' },
  NORMALE: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Normale' },
  BASSA: { bg: 'bg-gray-100', text: 'text-gray-600', label: 'Bassa' },
}

const PRIORITA_ORDER: Record<string, number> = { URGENTE: 0, ALTA: 1, NORMALE: 2, BASSA: 3 }

// ────────────────────────────────────────────────────────────────────────────
// Main
// ────────────────────────────────────────────────────────────────────────────

export default function KanbanBoard({
  segnalazioni: initial,
  onOpenDetail,
  onStateChanged,
}: {
  segnalazioni: SegnalazioneKanban[]
  onOpenDetail?: (id: string) => void
  onStateChanged?: () => void
}) {
  const [segnalazioni, setSegnalazioni] = useState(initial)
  const [dragId, setDragId] = useState<string | null>(null)
  const [overCol, setOverCol] = useState<Stato | null>(null)
  const [savingId, setSavingId] = useState<string | null>(null)

  useEffect(() => { setSegnalazioni(initial) }, [initial])

  const byColumn = useCallback((stato: Stato) => {
    if (stato === 'RISOLTA') {
      return segnalazioni
        .filter((s) => s.stato === 'RISOLTA')
        .sort((a, b) => (b.dataRisoluzione ?? b.createdAt).localeCompare(a.dataRisoluzione ?? a.createdAt))
        .slice(0, 10)
    }
    return segnalazioni
      .filter((s) => s.stato === stato)
      .sort((a, b) => {
        const p = (PRIORITA_ORDER[a.priorita] ?? 9) - (PRIORITA_ORDER[b.priorita] ?? 9)
        if (p !== 0) return p
        return b.createdAt.localeCompare(a.createdAt)
      })
  }, [segnalazioni])

  async function sposta(id: string, nuovoStato: Stato) {
    const corrente = segnalazioni.find((s) => s.id === id)
    if (!corrente || corrente.stato === nuovoStato) return

    // Optimistic update
    setSavingId(id)
    setSegnalazioni((list) => list.map((s) =>
      s.id === id ? { ...s, stato: nuovoStato, dataRisoluzione: nuovoStato === 'RISOLTA' ? new Date().toISOString() : null } : s,
    ))

    try {
      const res = await fetch(`/api/host/manutenzione/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stato: nuovoStato }),
      })
      if (!res.ok) throw new Error('Errore aggiornamento')
      onStateChanged?.()
    } catch {
      // rollback
      setSegnalazioni((list) => list.map((s) =>
        s.id === id ? corrente : s,
      ))
    } finally {
      setSavingId(null)
    }
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {COLUMNS.map((col) => {
        const items = byColumn(col.stato)
        const isOver = overCol === col.stato
        return (
          <div
            key={col.stato}
            onDragOver={(e) => { e.preventDefault(); setOverCol(col.stato) }}
            onDragLeave={() => setOverCol(null)}
            onDrop={(e) => {
              e.preventDefault()
              const id = e.dataTransfer.getData('text/plain')
              setOverCol(null)
              if (id) sposta(id, col.stato)
            }}
            className={`rounded-xl bg-gray-50 border-2 ${isOver ? col.accent : 'border-transparent'} transition-colors p-3`}
          >
            <div className="flex items-center justify-between mb-3 px-1">
              <h3 className="font-semibold text-gray-900 text-sm">{col.label}</h3>
              <span className="text-xs text-gray-500 tabular-nums">{items.length}</span>
            </div>

            <div className="space-y-2 min-h-[120px]">
              {items.map((s) => (
                <KanbanCard
                  key={s.id}
                  segnalazione={s}
                  saving={savingId === s.id}
                  onDragStart={() => setDragId(s.id)}
                  onDragEnd={() => setDragId(null)}
                  onClick={() => onOpenDetail?.(s.id)}
                />
              ))}
              {items.length === 0 && (
                <div className="py-8 text-center text-xs text-gray-400">
                  {col.stato === 'RISOLTA' ? 'Nessuna risolta recente' : 'Nessuna segnalazione'}
                </div>
              )}
            </div>
          </div>
        )
      })}
      {dragId && <span className="sr-only">Drag: {dragId}</span>}
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────────
// Card
// ────────────────────────────────────────────────────────────────────────────

function KanbanCard({
  segnalazione: s, saving, onDragStart, onDragEnd, onClick,
}: {
  segnalazione: SegnalazioneKanban
  saving: boolean
  onDragStart: () => void
  onDragEnd: () => void
  onClick: () => void
}) {
  const pri = PRIORITA_STYLE[s.priorita]
  const dataApertura = formatDistanceToNow(new Date(s.createdAt), { addSuffix: true, locale: it })
  const dataRisoluzione = s.dataRisoluzione
    ? formatDistanceToNow(new Date(s.dataRisoluzione), { addSuffix: true, locale: it })
    : null
  const fotoCount = (s.immagini?.length ?? 0) || (s.immagineUrl ? 1 : 0)
  const fotoPreview = s.immagini?.[0] ?? s.immagineUrl

  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('text/plain', s.id)
        e.dataTransfer.effectAllowed = 'move'
        onDragStart()
      }}
      onDragEnd={onDragEnd}
      onClick={onClick}
      className={`group rounded-lg bg-white border border-gray-200 p-3 shadow-sm hover:shadow-md hover:border-indigo-300 cursor-grab active:cursor-grabbing transition-all ${saving ? 'opacity-50' : ''}`}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide rounded-full ${pri.bg} ${pri.text}`}>
          {s.priorita === 'URGENTE' && <AlertTriangle className="w-2.5 h-2.5" />}
          {pri.label}
        </span>
        {saving && <Loader2 className="w-3 h-3 animate-spin text-gray-400" />}
      </div>

      <p className="font-medium text-gray-900 text-sm leading-tight line-clamp-1 mb-1.5">{s.titolo}</p>

      <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-2">
        <Wrench className="w-3 h-3" />
        <span className="truncate">
          {s.unita?.nome ?? s.struttura?.nome ?? 'Nessuna camera'}
        </span>
      </div>

      <div className="flex items-center gap-2 text-[11px] text-gray-500 flex-wrap">
        <span className="inline-flex items-center gap-1">
          <Clock className="w-3 h-3" /> {s.stato === 'RISOLTA' && dataRisoluzione ? dataRisoluzione : dataApertura}
        </span>
        <span className="inline-flex items-center gap-1">
          <User className="w-3 h-3" />
          {s.assegnatoA ? s.assegnatoA : <span className="italic text-gray-400">Non assegnato</span>}
        </span>
      </div>

      {s.stato === 'RISOLTA' && s.costoReale != null && (
        <div className="mt-2 inline-flex items-center gap-1 text-xs text-emerald-700 font-medium">
          <Euro className="w-3 h-3" /> {s.costoReale.toFixed(2)}
        </div>
      )}

      {fotoCount > 0 && (
        <div className="mt-2 flex items-center gap-1.5">
          {fotoPreview && (
            <img src={fotoPreview} alt="" className="w-12 h-12 rounded object-cover" />
          )}
          {fotoCount > 1 && (
            <span className="inline-flex items-center gap-1 text-xs text-gray-500">
              <ImageIcon className="w-3 h-3" /> +{fotoCount - 1}
            </span>
          )}
        </div>
      )}

      {s.stato === 'RISOLTA' && (
        <div className="mt-2 inline-flex items-center gap-1 text-xs text-emerald-700">
          <CheckCircle2 className="w-3 h-3" /> Completata
        </div>
      )}
    </div>
  )
}
