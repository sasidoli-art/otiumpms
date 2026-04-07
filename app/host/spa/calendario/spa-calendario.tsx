'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { format, addDays, subDays, startOfWeek, endOfWeek } from 'date-fns'
import { it } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, CalendarClock, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import Link from 'next/link'

interface Terapista { id: string; nome: string; cognome: string; colore: string }
interface Cabina { id: string; nome: string; colore: string }
interface Appt {
  id: string
  guestNome: string
  guestCognome: string
  dataOra: string
  durata: number
  stato: string
  colore?: string
  terapista: Terapista | null
  cabina: Cabina | null
  trattamento: { id: string; nome: string; colore: string } | null
  percorso: { id: string; nome: string } | null
}
interface DispoSlot { orarioInizio: string; orarioFine: string }

const STATO_BG: Record<string, string> = {
  PRENOTATO: 'bg-yellow-200 border-yellow-400',
  CONFERMATO: 'bg-green-200 border-green-400',
  IN_CORSO: 'bg-blue-200 border-blue-400',
  COMPLETATO: 'bg-gray-200 border-gray-400',
  ANNULLATO: 'bg-red-200 border-red-400',
  NO_SHOW: 'bg-orange-200 border-orange-400',
}

const ORA_INIZIO = 8
const ORA_FINE = 21
const ALTEZZA_ORA_PX = 60 // pixel per ora
const TOTALE_ORE = ORA_FINE - ORA_INIZIO

export default function SpaCalendario() {
  const [data, setData] = useState(() => new Date())
  const [view, setView] = useState<'day' | 'week'>('day')
  const [raggruppamento, setRaggruppamento] = useState<'cabine' | 'terapisti'>('cabine')
  const [cabine, setCabine] = useState<Cabina[]>([])
  const [terapisti, setTerapisti] = useState<Terapista[]>([])
  const [appuntamenti, setAppuntamenti] = useState<Appt[]>([])
  const [disponibilitaDelGiorno, setDisponibilitaDelGiorno] = useState<Record<string, DispoSlot[]>>({})
  const [loading, setLoading] = useState(true)
  const [dettaglio, setDettaglio] = useState<Appt | null>(null)
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState<{ risorsaId: string; minutes: number } | null>(null)
  const [savingMove, setSavingMove] = useState(false)
  const dragOffsetRef = useRef<number>(0) // pixel offset all'interno dell'appt al drag start

  const dataStr = format(data, 'yyyy-MM-dd')

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch(`/api/host/spa/calendario?data=${dataStr}&view=${view}`)
    if (res.ok) {
      const json = await res.json()
      setCabine(json.cabine ?? [])
      setTerapisti(json.terapisti ?? [])
      setAppuntamenti(json.appuntamenti ?? [])
      setDisponibilitaDelGiorno(json.disponibilitaDelGiorno ?? {})
    }
    setLoading(false)
  }, [dataStr, view])

  useEffect(() => { load() }, [load])

  const risorse = raggruppamento === 'cabine' ? cabine : terapisti
  const nomeRisorsa = (r: Cabina | Terapista) => raggruppamento === 'cabine' ? (r as Cabina).nome : `${(r as Terapista).nome} ${(r as Terapista).cognome}`

  // Ore grid
  const ore = Array.from({ length: TOTALE_ORE * 2 }, (_, i) => {
    const minsTotali = i * 30 + ORA_INIZIO * 60
    const h = Math.floor(minsTotali / 60).toString().padStart(2, '0')
    const m = (minsTotali % 60).toString().padStart(2, '0')
    return `${h}:${m}`
  })

  const apptTop = (appt: Appt) => {
    const d = new Date(appt.dataOra)
    const mins = (d.getHours() - ORA_INIZIO) * 60 + d.getMinutes()
    return (mins / 60) * ALTEZZA_ORA_PX
  }
  const apptHeight = (appt: Appt) => Math.max((appt.durata / 60) * ALTEZZA_ORA_PX, 20)

  const timeToTop = (time: string) => {
    const [h, m] = time.split(':').map(Number)
    const mins = (h - ORA_INIZIO) * 60 + m
    return Math.max(0, (mins / 60) * ALTEZZA_ORA_PX)
  }
  const timeToHeight = (inizio: string, fine: string) => {
    const [hi, mi] = inizio.split(':').map(Number)
    const [hf, mf] = fine.split(':').map(Number)
    const mins = (hf - hi) * 60 + (mf - mi)
    return Math.max(0, (mins / 60) * ALTEZZA_ORA_PX)
  }

  const dispoForRisorsa = (risorsaId: string): DispoSlot[] => {
    if (raggruppamento !== 'terapisti' || view !== 'day') return []
    return disponibilitaDelGiorno[risorsaId] ?? []
  }

  const apptPerRisorsa = (risorsaId: string) => appuntamenti.filter(a =>
    raggruppamento === 'cabine' ? a.cabina?.id === risorsaId : a.terapista?.id === risorsaId
  )

  // ─── Drag & Drop ─────────────────────────────────────────────────────────
  const SNAP_MIN = 15 // snap a 15 minuti
  const PX_PER_MIN = ALTEZZA_ORA_PX / 60

  function onDragStart(e: React.DragEvent, appt: Appt) {
    if (savingMove) { e.preventDefault(); return }
    setDraggingId(appt.id)
    // calcola offset Y nel box appt per drag preciso
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    dragOffsetRef.current = e.clientY - rect.top
    e.dataTransfer.effectAllowed = 'move'
    // necessario su firefox
    try { e.dataTransfer.setData('text/plain', appt.id) } catch {}
  }

  function onDragEnd() {
    setDraggingId(null)
    setDragOver(null)
  }

  function calcMinutesFromEvent(e: React.DragEvent, columnEl: HTMLElement): number {
    const rect = columnEl.getBoundingClientRect()
    const y = e.clientY - rect.top - dragOffsetRef.current
    const totMin = Math.max(0, (y / PX_PER_MIN)) + ORA_INIZIO * 60
    // snap
    const snapped = Math.round(totMin / SNAP_MIN) * SNAP_MIN
    // clamp dentro la giornata
    const max = ORA_FINE * 60 - 15
    return Math.min(Math.max(snapped, ORA_INIZIO * 60), max)
  }

  function onColumnDragOver(e: React.DragEvent, risorsaId: string) {
    if (!draggingId) return
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    const columnEl = e.currentTarget as HTMLElement
    const minutes = calcMinutesFromEvent(e, columnEl)
    if (!dragOver || dragOver.risorsaId !== risorsaId || dragOver.minutes !== minutes) {
      setDragOver({ risorsaId, minutes })
    }
  }

  async function onColumnDrop(e: React.DragEvent, risorsaId: string) {
    e.preventDefault()
    if (!draggingId) return
    const appt = appuntamenti.find(a => a.id === draggingId)
    if (!appt) { onDragEnd(); return }

    const columnEl = e.currentTarget as HTMLElement
    const minutes = calcMinutesFromEvent(e, columnEl)

    // Calcola nuova dataOra (preservando il giorno corrente dell'appt)
    const oldDate = new Date(appt.dataOra)
    const newDate = new Date(oldDate)
    newDate.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0)

    const oldRisorsaId = raggruppamento === 'cabine' ? appt.cabina?.id : appt.terapista?.id
    const samePosition = oldRisorsaId === risorsaId && oldDate.getTime() === newDate.getTime()
    if (samePosition) { onDragEnd(); return }

    // Optimistic update
    setSavingMove(true)
    const prev = appuntamenti
    setAppuntamenti(list => list.map(a => {
      if (a.id !== appt.id) return a
      const updated = { ...a, dataOra: newDate.toISOString() }
      if (raggruppamento === 'cabine') {
        const cab = cabine.find(c => c.id === risorsaId)
        if (cab) updated.cabina = { id: cab.id, nome: cab.nome, colore: cab.colore }
      } else {
        const ter = terapisti.find(t => t.id === risorsaId)
        if (ter) updated.terapista = { id: ter.id, nome: ter.nome, cognome: ter.cognome, colore: ter.colore }
      }
      return updated
    }))
    onDragEnd()

    try {
      const body: Record<string, unknown> = { dataOra: newDate.toISOString() }
      if (raggruppamento === 'cabine') body.cabinaId = risorsaId
      else body.terapistaId = risorsaId

      const res = await fetch(`/api/host/spa/appuntamenti/${appt.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        // rollback
        setAppuntamenti(prev)
        alert('Spostamento non riuscito')
      } else {
        // refresh per essere sicuri
        await load()
      }
    } catch {
      setAppuntamenti(prev)
      alert('Errore di rete')
    } finally {
      setSavingMove(false)
    }
  }

  const navPrev = () => setData(d => view === 'week' ? subDays(d, 7) : subDays(d, 1))
  const navNext = () => setData(d => view === 'week' ? addDays(d, 7) : addDays(d, 1))

  const titoloData = view === 'day'
    ? format(data, "EEEE d MMMM yyyy", { locale: it })
    : `${format(startOfWeek(data, { weekStartsOn: 1 }), "d MMM", { locale: it })} – ${format(endOfWeek(data, { weekStartsOn: 1 }), "d MMM yyyy", { locale: it })}`

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-4 px-6 py-3 border-b border-gray-200 bg-white shrink-0 flex-wrap gap-y-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center">
            <CalendarClock className="w-4 h-4 text-violet-600" />
          </div>
          <span className="font-bold text-gray-800 text-sm hidden sm:block">Calendario SPA</span>
        </div>

        {/* Nav data */}
        <div className="flex items-center gap-2">
          <button onClick={navPrev} className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50"><ChevronLeft className="w-4 h-4" /></button>
          <button onClick={() => setData(new Date())} className="px-3 py-1.5 text-xs font-medium border border-gray-200 rounded-lg hover:bg-gray-50">Oggi</button>
          <button onClick={navNext} className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50"><ChevronRight className="w-4 h-4" /></button>
          <span className="text-sm font-semibold text-gray-700 capitalize ml-1">{titoloData}</span>
        </div>

        <div className="ml-auto flex items-center gap-2">
          {/* View toggle */}
          <div className="flex rounded-lg border border-gray-200 overflow-hidden text-xs font-medium">
            {(['day', 'week'] as const).map(v => (
              <button key={v} onClick={() => setView(v)}
                className={cn('px-3 py-1.5', view === v ? 'bg-brand-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50')}>
                {v === 'day' ? 'Giorno' : 'Settimana'}
              </button>
            ))}
          </div>
          {/* Raggruppamento */}
          <div className="flex rounded-lg border border-gray-200 overflow-hidden text-xs font-medium">
            {(['cabine', 'terapisti'] as const).map(r => (
              <button key={r} onClick={() => setRaggruppamento(r)}
                className={cn('px-3 py-1.5 capitalize', raggruppamento === r ? 'bg-violet-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50')}>
                {r}
              </button>
            ))}
          </div>
          <Link href={`/host/spa/appuntamenti?nuova=1`}
            className="flex items-center gap-1.5 bg-brand-600 hover:bg-brand-700 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-colors">
            <Plus className="w-3.5 h-3.5" /> Nuovo
          </Link>
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center text-gray-400">Caricamento...</div>
      ) : risorse.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-gray-400 gap-2">
          <p>Nessuna {raggruppamento === 'cabine' ? 'cabina' : 'terapista'} attiva/o.</p>
          <Link href={raggruppamento === 'cabine' ? '/host/spa/cabine' : '/host/spa/terapisti'}
            className="text-sm text-brand-600 hover:underline">Configura →</Link>
        </div>
      ) : (
        <div className="flex-1 overflow-auto">
          <div className="flex" style={{ minWidth: `${risorse.length * 160 + 60}px` }}>
            {/* Colonna ora */}
            <div className="w-15 shrink-0 sticky left-0 bg-white z-10 border-r border-gray-200">
              <div className="h-10 border-b border-gray-200" /> {/* header filler */}
              {ore.map((o, i) => (
                <div key={o} className="flex items-start justify-end pr-2 text-xs text-gray-400"
                  style={{ height: `${ALTEZZA_ORA_PX / 2}px`, paddingTop: '2px' }}>
                  {i % 2 === 0 ? o : ''}
                </div>
              ))}
            </div>

            {/* Colonne risorse */}
            {risorse.map(r => (
              <div key={r.id} className="flex-1 min-w-[160px] border-r border-gray-200 relative">
                {/* Header risorsa */}
                <div className="h-10 flex items-center justify-center border-b border-gray-200 sticky top-0 bg-white z-10">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: r.colore }} />
                    <span className="text-xs font-semibold text-gray-700 truncate max-w-[120px]">{nomeRisorsa(r)}</span>
                  </div>
                </div>

                {/* Timeline */}
                <div
                  className="relative"
                  style={{ height: `${TOTALE_ORE * ALTEZZA_ORA_PX}px` }}
                  onDragOver={(e) => onColumnDragOver(e, r.id)}
                  onDrop={(e) => onColumnDrop(e, r.id)}
                  onDragLeave={() => { if (dragOver?.risorsaId === r.id) setDragOver(null) }}
                >
                  {/* Drop indicator */}
                  {dragOver?.risorsaId === r.id && draggingId && (
                    <div
                      className="absolute left-0 right-0 border-t-2 border-dashed border-violet-500 bg-violet-100/40 pointer-events-none z-10"
                      style={{
                        top: `${((dragOver.minutes - ORA_INIZIO * 60) / 60) * ALTEZZA_ORA_PX}px`,
                        height: `${(((appuntamenti.find(a => a.id === draggingId)?.durata) ?? 60) / 60) * ALTEZZA_ORA_PX}px`,
                      }}
                    />
                  )}
                  {/* Grid lines ogni 30 min */}
                  {ore.map((o, i) => (
                    <div key={o} className={cn('absolute left-0 right-0 border-t', i % 2 === 0 ? 'border-gray-200' : 'border-gray-100')}
                      style={{ top: `${(i * ALTEZZA_ORA_PX) / 2}px` }} />
                  ))}

                  {/* Disponibilità terapista backdrop */}
                  {dispoForRisorsa(r.id).map((slot, i) => (
                    <div
                      key={i}
                      className="absolute left-0 right-0 bg-green-100 opacity-60 pointer-events-none"
                      style={{ top: `${timeToTop(slot.orarioInizio)}px`, height: `${timeToHeight(slot.orarioInizio, slot.orarioFine)}px` }}
                    />
                  ))}

                  {/* Appointments */}
                  {apptPerRisorsa(r.id).map(a => (
                    <div
                      key={a.id}
                      draggable={!savingMove}
                      onDragStart={(e) => onDragStart(e, a)}
                      onDragEnd={onDragEnd}
                      onClick={() => setDettaglio(a)}
                      className={cn(
                        'absolute left-1 right-1 rounded-md border-l-2 px-1.5 py-1 cursor-grab active:cursor-grabbing overflow-hidden text-xs hover:brightness-95 transition-opacity select-none',
                        STATO_BG[a.stato],
                        draggingId === a.id && 'opacity-30'
                      )}
                      style={{
                        top: `${apptTop(a)}px`,
                        height: `${apptHeight(a)}px`,
                        borderLeftColor: a.trattamento?.colore ?? a.terapista?.colore ?? '#8b5cf6',
                      }}
                    >
                      <div className="font-semibold truncate text-gray-800">{a.guestNome} {a.guestCognome}</div>
                      <div className="truncate text-gray-600">{a.trattamento?.nome ?? a.percorso?.nome ?? '—'}</div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Dettaglio modale */}
      {dettaglio && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setDettaglio(null)}>
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm space-y-3" onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between">
              <h3 className="font-bold text-gray-900">{dettaglio.guestNome} {dettaglio.guestCognome}</h3>
              <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', STATO_BG[dettaglio.stato])}>{dettaglio.stato}</span>
            </div>
            <div className="text-sm text-gray-600 space-y-1">
              <div><span className="text-gray-400">Servizio:</span> {dettaglio.trattamento?.nome ?? dettaglio.percorso?.nome ?? '—'}</div>
              <div><span className="text-gray-400">Orario:</span> {format(new Date(dettaglio.dataOra), 'HH:mm', { locale: it })} · {dettaglio.durata} min</div>
              {dettaglio.terapista && <div><span className="text-gray-400">Terapista:</span> {dettaglio.terapista.nome} {dettaglio.terapista.cognome}</div>}
              {dettaglio.cabina && <div><span className="text-gray-400">Cabina:</span> {dettaglio.cabina.nome}</div>}
            </div>
            <div className="flex gap-2 pt-2">
              <button onClick={() => setDettaglio(null)} className="flex-1 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">Chiudi</button>
              <Link href={`/host/spa/appuntamenti?id=${dettaglio.id}`}
                className="flex-1 py-2 text-sm text-center bg-brand-600 text-white font-medium rounded-lg hover:bg-brand-700">
                Gestisci
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
