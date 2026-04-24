'use client'

import { useEffect, useMemo, useState } from 'react'
import { format } from 'date-fns'
import { it } from 'date-fns/locale'
import { Calendar, Clock, Users, Minus, Plus, Loader2, ArrowRight } from 'lucide-react'

export type Slot = {
  ora: string
  disponibile: boolean
  copertiResidui: number | null
  tipoPasto: 'PRANZO' | 'CENA'
}

export type RistoranteSel = {
  data: string // YYYY-MM-DD
  ora: string // HH:mm
  numPersone: number
  note: string
}

type Props = {
  strutturaId: string
  onAvanti: (sel: RistoranteSel) => void
}

// Prossimi 14 giorni, a partire da oggi
function nextDays(n: number): Date[] {
  const out: Date[] = []
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  for (let i = 0; i < n; i++) {
    out.push(new Date(d))
    d.setDate(d.getDate() + 1)
  }
  return out
}

function ymd(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export default function StepPrenotazione({ strutturaId, onAvanti }: Props) {
  const days = useMemo(() => nextDays(14), [])
  const [selectedDate, setSelectedDate] = useState<Date>(days[0])
  const [numPersone, setNumPersone] = useState(2)
  const [ora, setOra] = useState<string | null>(null)
  const [note, setNote] = useState('')

  const [slots, setSlots] = useState<Slot[]>([])
  const [loading, setLoading] = useState(false)
  const [errore, setErrore] = useState<string | null>(null)

  useEffect(() => {
    let abort = false
    async function load() {
      setLoading(true)
      setErrore(null)
      try {
        const params = new URLSearchParams({
          data: ymd(selectedDate),
          numPersone: String(numPersone),
        })
        const res = await fetch(`/api/book/${strutturaId}/ristorante/disponibilita?${params}`)
        const data = await res.json()
        if (abort) return
        if (!res.ok) {
          setErrore(data.error ?? 'Errore caricamento orari')
          setSlots([])
        } else {
          setSlots(data.slots ?? [])
        }
      } catch {
        if (!abort) setErrore('Errore di rete')
      } finally {
        if (!abort) setLoading(false)
      }
    }
    load()
    setOra(null) // reset slot selezionato al cambio data/persone
    return () => { abort = true }
  }, [strutturaId, selectedDate, numPersone])

  const slotsPranzo = slots.filter((s) => s.tipoPasto === 'PRANZO')
  const slotsCena = slots.filter((s) => s.tipoPasto === 'CENA')

  const canContinue = ora != null && !loading

  return (
    <div className="space-y-6">
      {/* ─── Data ──────────────────────────────────────────────── */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Calendar className="w-4 h-4" style={{ color: 'var(--brand-primary)' }} />
          <h2 className="text-sm font-bold text-gray-900">Quando vuoi venire?</h2>
        </div>
        <div className="flex gap-2 overflow-x-auto -mx-4 px-4 pb-1">
          {days.map((d) => {
            const isSelected = ymd(d) === ymd(selectedDate)
            const isToday = ymd(d) === ymd(new Date())
            return (
              <button
                key={d.toISOString()}
                type="button"
                onClick={() => setSelectedDate(d)}
                className={`flex flex-col items-center shrink-0 w-14 py-2.5 rounded-xl transition-all duration-200 ${
                  isSelected ? 'shadow-md' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                }`}
                style={
                  isSelected
                    ? { backgroundColor: 'var(--brand-primary)', color: 'var(--brand-on-primary)', minHeight: 44 }
                    : { minHeight: 44 }
                }
              >
                <span className="text-[9px] font-medium uppercase tracking-wider opacity-70">
                  {isToday ? 'Oggi' : format(d, 'EEE', { locale: it })}
                </span>
                <span className="text-lg font-bold leading-tight">{d.getDate()}</span>
                <span className="text-[9px] opacity-70">{format(d, 'MMM', { locale: it })}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* ─── Persone ────────────────────────────────────────────── */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Users className="w-4 h-4 text-gray-500" />
          <h2 className="text-sm font-bold text-gray-900">Quante persone?</h2>
        </div>
        <div className="flex items-center justify-between bg-white border border-gray-200 rounded-xl px-4 py-3">
          <p className="text-sm text-gray-700">
            {numPersone} {numPersone === 1 ? 'persona' : 'persone'}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setNumPersone((n) => Math.max(1, n - 1))}
              disabled={numPersone <= 1}
              className="w-9 h-9 rounded-full border border-gray-200 flex items-center justify-center disabled:opacity-30 hover:bg-gray-50"
              aria-label="Diminuisci"
            >
              <Minus className="w-4 h-4" />
            </button>
            <span className="text-base font-semibold w-6 text-center">{numPersone}</span>
            <button
              type="button"
              onClick={() => setNumPersone((n) => Math.min(20, n + 1))}
              disabled={numPersone >= 20}
              className="w-9 h-9 rounded-full border border-gray-200 flex items-center justify-center disabled:opacity-30 hover:bg-gray-50"
              aria-label="Aumenta"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ─── Orari ──────────────────────────────────────────────── */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Clock className="w-4 h-4 text-gray-500" />
          <h2 className="text-sm font-bold text-gray-900">Scegli un orario</h2>
        </div>

        {loading && (
          <div className="py-10 flex items-center justify-center">
            <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
          </div>
        )}
        {errore && !loading && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
            {errore}
          </div>
        )}
        {!loading && !errore && slots.length === 0 && (
          <p className="text-sm text-gray-500 py-6 text-center">
            Il ristorante non è configurato per prenotazioni online in questa data.
          </p>
        )}

        {slotsPranzo.length > 0 && (
          <SlotGroup
            label="Pranzo"
            slots={slotsPranzo}
            ora={ora}
            onPick={setOra}
          />
        )}
        {slotsCena.length > 0 && (
          <SlotGroup
            label="Cena"
            slots={slotsCena}
            ora={ora}
            onPick={setOra}
            className={slotsPranzo.length > 0 ? 'mt-4' : undefined}
          />
        )}
      </div>

      {/* ─── Note ───────────────────────────────────────────────── */}
      <div>
        <label className="block text-sm font-bold text-gray-900 mb-2">
          Note (opzionale)
        </label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value.slice(0, 500))}
          rows={2}
          placeholder="Es. tavolo esterno, compleanno, allergia arachidi…"
          className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400 transition-colors resize-none"
        />
      </div>

      {/* ─── CTA ────────────────────────────────────────────────── */}
      <button
        type="button"
        disabled={!canContinue}
        onClick={() => {
          if (!ora) return
          onAvanti({
            data: ymd(selectedDate),
            ora,
            numPersone,
            note: note.trim(),
          })
        }}
        className="w-full py-3 text-sm font-semibold flex items-center justify-center gap-2 hover:brightness-110 disabled:opacity-40 transition-all"
        style={{
          backgroundColor: 'var(--brand-primary)',
          color: 'var(--brand-on-primary)',
          borderRadius: 'var(--brand-radius)',
        }}
      >
        Continua <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  )
}

function SlotGroup({
  label, slots, ora, onPick, className,
}: {
  label: string
  slots: Slot[]
  ora: string | null
  onPick: (o: string) => void
  className?: string
}) {
  return (
    <div className={className}>
      <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-2">{label}</p>
      <div className="flex flex-wrap gap-2">
        {slots.map((s) => {
          const active = ora === s.ora
          const disabled = !s.disponibile
          return (
            <button
              key={s.ora}
              type="button"
              onClick={() => !disabled && onPick(s.ora)}
              disabled={disabled}
              className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
                active
                  ? 'shadow-md'
                  : disabled
                    ? 'bg-gray-100 text-gray-300 cursor-not-allowed line-through'
                    : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
              }`}
              style={
                active
                  ? { backgroundColor: 'var(--brand-primary)', color: 'var(--brand-on-primary)', minHeight: 44 }
                  : { minHeight: 44 }
              }
              title={
                disabled
                  ? 'Completo'
                  : s.copertiResidui != null
                    ? `${s.copertiResidui} coperti residui`
                    : undefined
              }
            >
              {s.ora}
            </button>
          )
        })}
      </div>
    </div>
  )
}
