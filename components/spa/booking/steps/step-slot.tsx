'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Loader2, Calendar, Clock, User } from 'lucide-react'
import { format, addDays, isBefore, startOfDay, isSameDay } from 'date-fns'
import { it } from 'date-fns/locale'

// ─── Types ──────────────────────────────────────────────────────────────────

interface SlotData {
  ora: string
  disponibile: boolean
  terapisti: number
}

interface Terapista {
  id: string
  nome: string
  cognome: string
  bio: string | null
  specializzazioni: string[]
}

interface Props {
  strutturaId: string
  trattamentoId?: string | null
  percorsoId?: string | null
  durata: number
  selectedSlot: { data: string; oraInizio: string; terapistaId?: string } | null
  onSelectSlot: (slot: { data: string; oraInizio: string; terapistaId?: string; terapistaNome?: string }) => void
  terapisti: Terapista[]
  /** Se l'ospite è in-house, mostra solo queste date */
  dateSoggiorno?: { arrivo: string; partenza: string } | null
  accentColor?: string
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function StepSlot({
  strutturaId, trattamentoId, percorsoId, durata,
  selectedSlot, onSelectSlot, terapisti,
  dateSoggiorno, accentColor,
}: Props) {
  const accent = accentColor || '#4f46e5'
  const today = startOfDay(new Date())

  // Date da mostrare: prossimi 14 gg o date soggiorno
  const dates = useMemo(() => {
    if (dateSoggiorno) {
      const arr = startOfDay(new Date(dateSoggiorno.arrivo))
      const par = startOfDay(new Date(dateSoggiorno.partenza))
      const days: Date[] = []
      let d = arr < today ? today : arr
      while (d <= par) {
        days.push(new Date(d))
        d = addDays(d, 1)
      }
      return days.length > 0 ? days : Array.from({ length: 14 }, (_, i) => addDays(today, i))
    }
    return Array.from({ length: 14 }, (_, i) => addDays(today, i))
  }, [dateSoggiorno, today])

  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [slots, setSlots] = useState<SlotData[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedOra, setSelectedOra] = useState<string | null>(selectedSlot?.oraInizio || null)
  const [selectedTerapista, setSelectedTerapista] = useState<string | null>(selectedSlot?.terapistaId || null)
  const [expandedBio, setExpandedBio] = useState<string | null>(null)
  const cache = useRef<Map<string, SlotData[]>>(new Map())

  // Fetch slots per data
  const fetchSlots = useCallback(async (date: Date) => {
    const key = format(date, 'yyyy-MM-dd')
    if (cache.current.has(key)) {
      setSlots(cache.current.get(key)!)
      return
    }

    setLoading(true)
    try {
      const params = new URLSearchParams({ data: key })
      if (trattamentoId) params.set('trattamentoId', trattamentoId)
      if (percorsoId) params.set('percorsoId', percorsoId)

      const res = await fetch(`/api/book/${strutturaId}/spa/disponibilita?${params}`)
      if (res.ok) {
        const data = await res.json()
        const available = (data.slots as SlotData[]).filter(s => s.disponibile)
        cache.current.set(key, available)
        setSlots(available)
      } else {
        setSlots([])
      }
    } catch {
      setSlots([])
    }
    setLoading(false)
  }, [strutturaId, trattamentoId, percorsoId])

  // Auto-select primo giorno con disponibilità
  useEffect(() => {
    if (selectedSlot?.data) {
      const d = startOfDay(new Date(selectedSlot.data))
      setSelectedDate(d)
      fetchSlots(d)
    } else if (dates.length > 0) {
      setSelectedDate(dates[0])
      fetchSlots(dates[0])
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleDateSelect = useCallback((date: Date) => {
    setSelectedDate(date)
    setSelectedOra(null)
    setSelectedTerapista(null)
    fetchSlots(date)
  }, [fetchSlots])

  const handleOraSelect = useCallback((ora: string) => {
    setSelectedOra(ora)
    setSelectedTerapista(null)
    if (selectedDate) {
      onSelectSlot({
        data: format(selectedDate, 'yyyy-MM-dd'),
        oraInizio: ora,
      })
    }
  }, [selectedDate, onSelectSlot])

  const handleTerapistaSelect = useCallback((tId: string | null, tNome?: string) => {
    setSelectedTerapista(tId)
    if (selectedDate && selectedOra) {
      onSelectSlot({
        data: format(selectedDate, 'yyyy-MM-dd'),
        oraInizio: selectedOra,
        terapistaId: tId || undefined,
        terapistaNome: tNome,
      })
    }
  }, [selectedDate, selectedOra, onSelectSlot])

  // Terapisti disponibili per lo slot selezionato
  const terapistiDisponibili = useMemo(() => {
    if (!selectedOra) return []
    const slotInfo = slots.find(s => s.ora === selectedOra)
    if (!slotInfo || slotInfo.terapisti <= 1) return []
    return terapisti.slice(0, slotInfo.terapisti)
  }, [selectedOra, slots, terapisti])

  return (
    <div className="pb-4">
      {/* ─── 1. Data pills ─────────────────────────────────────── */}
      <div className="px-4 pt-4 mb-5">
        <div className="flex items-center gap-2 mb-3">
          <Calendar className="w-4 h-4 text-gray-500" />
          <p className="text-sm font-bold text-gray-900">Scegli una data</p>
        </div>

        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
          {dates.map((date, i) => {
            const isSelected = selectedDate && isSameDay(date, selectedDate)
            const isToday = isSameDay(date, today)
            const dayName = format(date, 'EEE', { locale: it }).slice(0, 3)
            const dayNum = format(date, 'd')
            const showMonth = i === 0 || date.getDate() === 1

            return (
              <button
                key={date.toISOString()}
                type="button"
                onClick={() => handleDateSelect(date)}
                className={`flex flex-col items-center shrink-0 w-14 py-2.5 rounded-xl transition-all duration-200 ${
                  isSelected
                    ? 'text-white shadow-md'
                    : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                }`}
                style={isSelected ? { backgroundColor: accent, minHeight: 44 } : { minHeight: 44 }}
              >
                <span className="text-[9px] font-medium uppercase tracking-wider opacity-70">
                  {showMonth ? format(date, 'MMM', { locale: it }) : dayName}
                </span>
                <span className="text-lg font-bold leading-tight">{dayNum}</span>
                {isToday && !isSelected && (
                  <span className="w-1 h-1 rounded-full mt-0.5" style={{ backgroundColor: accent }} />
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* ─── 2. Slot orari ─────────────────────────────────────── */}
      {selectedDate && (
        <div className="px-4 mb-5">
          <div className="flex items-center gap-2 mb-3">
            <Clock className="w-4 h-4 text-gray-500" />
            <p className="text-sm font-bold text-gray-900">Scegli un orario</p>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
          ) : slots.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm text-gray-500">Nessun orario disponibile per questa data.</p>
              <p className="text-xs text-gray-400 mt-1">Prova un altro giorno.</p>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {slots.map((slot, i) => (
                <motion.button
                  key={slot.ora}
                  type="button"
                  onClick={() => handleOraSelect(slot.ora)}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className={`px-5 py-3 rounded-xl text-sm font-semibold transition-all duration-200 ${
                    selectedOra === slot.ora
                      ? 'text-white shadow-md'
                      : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                  }`}
                  style={selectedOra === slot.ora ? { backgroundColor: accent, minHeight: 44 } : { minHeight: 44 }}
                >
                  {slot.ora}
                </motion.button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── 3. Terapista (opzionale) ──────────────────────────── */}
      {terapistiDisponibili.length > 0 && selectedOra && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="px-4"
        >
          <div className="flex items-center gap-2 mb-3">
            <User className="w-4 h-4 text-gray-500" />
            <p className="text-sm font-bold text-gray-900">Preferenza terapista</p>
            <span className="text-[10px] text-gray-400">(opzionale)</span>
          </div>

          <div className="space-y-2">
            {/* Nessuna preferenza */}
            <button type="button"
              onClick={() => handleTerapistaSelect(null)}
              className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all duration-200 ${
                !selectedTerapista ? 'shadow-sm' : 'border-gray-100 opacity-60'
              }`}
              style={!selectedTerapista ? { borderColor: accent } : undefined}
            >
              <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-500">?</div>
              <span className="text-sm font-medium text-gray-800">Nessuna preferenza</span>
            </button>

            {terapistiDisponibili.map(t => {
              const isSelected = selectedTerapista === t.id
              return (
                <div key={t.id}>
                  <button type="button"
                    onClick={() => handleTerapistaSelect(t.id, `${t.nome} ${t.cognome}`)}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all duration-200 ${
                      isSelected ? 'shadow-sm' : 'border-gray-100 opacity-60'
                    }`}
                    style={isSelected ? { borderColor: accent } : undefined}
                  >
                    <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                      style={{ backgroundColor: accent }}>
                      {t.nome[0]}{t.cognome[0]}
                    </div>
                    <div className="flex-1 text-left min-w-0">
                      <p className="text-sm font-medium text-gray-800">{t.nome} {t.cognome}</p>
                      {t.specializzazioni.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-0.5">
                          {t.specializzazioni.slice(0, 3).map(s => (
                            <span key={s} className="text-[9px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">{s}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  </button>

                  {/* Bio espandibile */}
                  {t.bio && isSelected && (
                    <button type="button"
                      onClick={() => setExpandedBio(expandedBio === t.id ? null : t.id)}
                      className="ml-12 mt-1 text-[10px] font-semibold" style={{ color: accent }}>
                      {expandedBio === t.id ? 'Nascondi bio' : 'Leggi bio'}
                    </button>
                  )}
                  {expandedBio === t.id && t.bio && (
                    <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                      className="ml-12 text-xs text-gray-500 mt-1 leading-relaxed">
                      {t.bio}
                    </motion.p>
                  )}
                </div>
              )
            })}
          </div>
        </motion.div>
      )}
    </div>
  )
}
