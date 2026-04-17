'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  Coffee, Sun, Moon, Loader2, Check, UtensilsCrossed,
  AlertCircle, MapPin, Clock, ChevronRight, Leaf, WheatOff,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { format, addDays, differenceInCalendarDays } from 'date-fns'
import { it } from 'date-fns/locale'

// ─── Types ──────────────────────────────────────────────────────────────────

type TipoPasto = 'COLAZIONE' | 'PRANZO' | 'CENA'

interface Piatto {
  id: string
  categoria: string
  nome: string
  descrizione: string | null
  allergeni: string[]
  prezzo: number | null
  vegetariano?: boolean
  vegano?: boolean
  senzaGlutine?: boolean
}

interface MenuPasto {
  id: string
  nome: string | null
  note: string | null
  piatti: Piatto[]
}

interface GiornoMenu {
  data: string
  pasti: Array<{
    tipoPasto: TipoPasto
    incluso: boolean
    menu: MenuPasto | null
  }>
}

interface SceltaSalvata {
  data: string
  tipoPasto: string
  piattoId: string
  guestNome: string
  quantita: number
}

interface ApiResponse {
  prenotazione: {
    id: string
    guestNome: string
    numOspiti: number
    strutturaNome: string
    piano: string
    pastiInclusi: string[]
  }
  giorni: GiornoMenu[]
  scelteEsistenti: SceltaSalvata[]
  configPasti?: Array<{
    tipoPasto: string
    orarioInizio: string | null
    orarioFine: string | null
    luogo: string | null
  }>
}

// Map: "data|tipoPasto|categoria" → piattoId
type SceltaMap = Record<string, string>

// ─── Constants ──────────────────────────────────────────────────────────────

const TIPO_ICON: Record<TipoPasto, typeof Coffee> = {
  COLAZIONE: Coffee, PRANZO: Sun, CENA: Moon,
}
const TIPO_LABEL: Record<TipoPasto, string> = {
  COLAZIONE: 'Colazione', PRANZO: 'Pranzo', CENA: 'Cena',
}
const TIPO_COLOR: Record<TipoPasto, string> = {
  COLAZIONE: 'text-amber-600 bg-amber-50 border-amber-200',
  PRANZO: 'text-orange-600 bg-orange-50 border-orange-200',
  CENA: 'text-indigo-600 bg-indigo-50 border-indigo-200',
}
const PIANO_LABEL: Record<string, string> = {
  SOLO_PERNOTTAMENTO: 'Solo pernottamento',
  PERNOTTAMENTO_COLAZIONE: 'B&B (colazione inclusa)',
  MEZZA_PENSIONE: 'Mezza pensione',
  PENSIONE_COMPLETA: 'Pensione completa',
  ALL_INCLUSIVE: 'All inclusive',
}
const CAT_LABEL: Record<string, string> = {
  ANTIPASTO: 'Antipasto', PRIMO: 'Primo piatto', SECONDO: 'Secondo piatto',
  CONTORNO: 'Contorno', DOLCE: 'Dolce', BEVANDA: 'Bevanda', FRUTTA: 'Frutta',
  COLAZIONE_DOLCE: 'Dolce', COLAZIONE_SALATA: 'Salato', COLAZIONE_BEVANDA: 'Bevanda',
  ALTRO: 'Altro',
}
const CAT_ORDER = [
  'COLAZIONE_DOLCE', 'COLAZIONE_SALATA', 'COLAZIONE_BEVANDA',
  'ANTIPASTO', 'PRIMO', 'SECONDO', 'CONTORNO', 'DOLCE', 'FRUTTA', 'BEVANDA', 'ALTRO',
]

// ─── Props ──────────────────────────────────────────────────────────────────

interface Props {
  prenotazioneId: string
  guestNome: string
  logo?: string | null
  strutturaNome: string
  colorePrimario?: string | null
  dataArrivo: string
  dataPartenza: string
  numOspiti: number
  pianoPasto: string
}

// ─── Storage key ────────────────────────────────────────────────────────────

function draftKey(prenotazioneId: string) {
  return `pasti-draft-${prenotazioneId}`
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function MenuOspite({
  prenotazioneId, guestNome, logo, strutturaNome, colorePrimario,
  dataArrivo, dataPartenza, numOspiti, pianoPasto,
}: Props) {
  const accent = colorePrimario || '#4f46e5'
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<ApiResponse | null>(null)
  const [error, setError] = useState('')
  const [selectedDay, setSelectedDay] = useState(0)
  const [scelte, setScelte] = useState<SceltaMap>({})
  const [saving, setSaving] = useState(false)
  const [savedDays, setSavedDays] = useState<Set<string>>(new Set())
  const [toast, setToast] = useState('')

  // Build day list
  const giorni = useMemo(() => {
    const arr = new Date(dataArrivo)
    const par = new Date(dataPartenza)
    const n = Math.max(1, differenceInCalendarDays(par, arr))
    return Array.from({ length: n }, (_, i) => {
      const d = addDays(arr, i)
      return {
        date: format(d, 'yyyy-MM-dd'),
        label: format(d, 'EEE d', { locale: it }),
        labelLong: format(d, 'EEEE d MMMM', { locale: it }),
      }
    })
  }, [dataArrivo, dataPartenza])

  // ── Fetch data ──
  const fetchMenu = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/book/pasto/${prenotazioneId}`)
      if (!res.ok) throw new Error()
      const json: ApiResponse = await res.json()
      setData(json)

      // Initialize scelte from saved choices
      const initial: SceltaMap = {}
      for (const s of json.scelteEsistenti) {
        const dataStr = typeof s.data === 'string' ? s.data.slice(0, 10) : new Date(s.data).toISOString().slice(0, 10)
        // Find which category this piatto belongs to
        const giorno = json.giorni.find(g => g.data === dataStr)
        if (!giorno) continue
        const pasto = giorno.pasti.find(p => p.tipoPasto === s.tipoPasto)
        if (!pasto?.menu) continue
        const piatto = pasto.menu.piatti.find(p => p.id === s.piattoId)
        if (piatto) {
          initial[`${dataStr}|${s.tipoPasto}|${piatto.categoria}`] = s.piattoId
        }
      }

      // Merge with draft from sessionStorage
      try {
        const draft = sessionStorage.getItem(draftKey(prenotazioneId))
        if (draft) {
          const parsed = JSON.parse(draft) as SceltaMap
          // Draft overrides saved, but only for unsaved days
          for (const [k, v] of Object.entries(parsed)) {
            if (!initial[k]) initial[k] = v
          }
        }
      } catch {}

      setScelte(initial)

      // Mark days that have saved choices
      const saved = new Set<string>()
      for (const s of json.scelteEsistenti) {
        const d = typeof s.data === 'string' ? s.data.slice(0, 10) : new Date(s.data).toISOString().slice(0, 10)
        saved.add(d)
      }
      setSavedDays(saved)

      // Auto-select first day without complete choices
      const firstIncomplete = giorni.findIndex(g => !saved.has(g.date))
      if (firstIncomplete >= 0) setSelectedDay(firstIncomplete)
    } catch {
      setError('Impossibile caricare il menu. Riprova.')
    }
    setLoading(false)
  }, [prenotazioneId, giorni])

  useEffect(() => { fetchMenu() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Save draft to sessionStorage on change ──
  useEffect(() => {
    try { sessionStorage.setItem(draftKey(prenotazioneId), JSON.stringify(scelte)) } catch {}
  }, [scelte, prenotazioneId])

  // ── Select piatto ──
  function selectPiatto(dayDate: string, tipoPasto: TipoPasto, categoria: string, piattoId: string) {
    const key = `${dayDate}|${tipoPasto}|${categoria}`
    setScelte(prev => {
      const next = { ...prev }
      if (next[key] === piattoId) { delete next[key] } // toggle off
      else { next[key] = piattoId }
      return next
    })
  }

  // ── Count choices for a day ──
  function dayChoiceStats(dayDate: string) {
    if (!data) return { done: 0, total: 0 }
    const giorno = data.giorni.find(g => g.data === dayDate)
    if (!giorno) return { done: 0, total: 0 }

    let total = 0
    let done = 0
    for (const pasto of giorno.pasti) {
      if (!pasto.menu) continue
      const cats = groupByCategory(pasto.menu.piatti)
      for (const { categoria } of cats) {
        total++
        const key = `${dayDate}|${pasto.tipoPasto}|${categoria}`
        if (scelte[key]) done++
      }
    }
    return { done, total }
  }

  // ── Save current day ──
  async function saveDay() {
    if (!data) return
    const dayDate = giorni[selectedDay]?.date
    if (!dayDate) return

    const giorno = data.giorni.find(g => g.data === dayDate)
    if (!giorno) return

    setSaving(true)
    setError('')

    // Build scelte array for this day
    const scelteDay: Array<{ data: string; tipoPasto: string; piattoId: string; guestNome: string; quantita: number }> = []
    for (const pasto of giorno.pasti) {
      if (!pasto.menu) continue
      const cats = groupByCategory(pasto.menu.piatti)
      for (const { categoria } of cats) {
        const key = `${dayDate}|${pasto.tipoPasto}|${categoria}`
        const piattoId = scelte[key]
        if (piattoId) {
          scelteDay.push({
            data: dayDate,
            tipoPasto: pasto.tipoPasto,
            piattoId,
            guestNome,
            quantita: 1,
          })
        }
      }
    }

    if (scelteDay.length === 0) {
      setError('Seleziona almeno un piatto prima di salvare.')
      setSaving(false)
      return
    }

    try {
      const res = await fetch(`/api/book/pasto/${prenotazioneId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scelte: scelteDay }),
      })
      if (!res.ok) {
        const d = await res.json()
        throw new Error(d.error || 'Errore nel salvataggio')
      }
      setSavedDays(prev => new Set(prev).add(dayDate))
      setToast('Scelte salvate!')
      setTimeout(() => setToast(''), 3000)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Errore nel salvataggio')
    }
    setSaving(false)
  }

  // ── All days complete? ──
  const allComplete = giorni.every(g => savedDays.has(g.date))

  // ── Current day data ──
  const currentGiorno = data?.giorni.find(g => g.data === giorni[selectedDay]?.date)
  const currentDate = giorni[selectedDay]?.date ?? ''
  const currentStats = dayChoiceStats(currentDate)

  // ════════════════════════════════════════════════════════════════════════════
  // RENDER
  // ════════════════════════════════════════════════════════════════════════════

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-slate-300" />
      </div>
    )
  }

  if (error && !data) {
    return (
      <div className="text-center py-16">
        <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
        <p className="text-sm text-slate-600">{error}</p>
        <button onClick={fetchMenu} className="mt-3 text-sm font-semibold text-blue-600 hover:underline">Riprova</button>
      </div>
    )
  }

  return (
    <div className="pb-28">
      {/* ═══ Header ═══ */}
      <div className="bg-white border-b border-slate-100 sticky top-0 z-20">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            {logo ? (
              <img src={logo} alt="" className="h-8 w-auto max-w-[100px] object-contain" />
            ) : (
              <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold"
                style={{ backgroundColor: accent }}>
                {strutturaNome.charAt(0)}
              </div>
            )}
            <div>
              <p className="text-sm font-semibold text-slate-900">Menu del tuo soggiorno</p>
              <p className="text-xs text-slate-500">{guestNome} · {strutturaNome}</p>
            </div>
          </div>
          <span className="inline-block mt-2 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full"
            style={{ backgroundColor: `${accent}15`, color: accent }}>
            {PIANO_LABEL[pianoPasto] || pianoPasto}
          </span>
        </div>
      </div>

      {/* ═══ All complete banner ═══ */}
      {allComplete && (
        <div className="max-w-2xl mx-auto px-4 mt-4">
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-emerald-50 border border-emerald-200">
            <Check className="w-5 h-5 text-emerald-600 shrink-0" />
            <p className="text-sm font-medium text-emerald-800">
              Hai completato tutte le scelte menu. Buon appetito!
            </p>
          </div>
        </div>
      )}

      {/* ═══ Day pills ═══ */}
      <div className="max-w-2xl mx-auto px-4 mt-4">
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
          {giorni.map((g, i) => {
            const stats = dayChoiceStats(g.date)
            const isSaved = savedDays.has(g.date)
            const isSelected = selectedDay === i

            return (
              <button
                key={g.date}
                onClick={() => setSelectedDay(i)}
                className={cn(
                  'flex flex-col items-center shrink-0 px-3 py-2 rounded-xl transition-all text-center min-w-[56px]',
                  isSelected
                    ? 'text-white shadow-md'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
                )}
                style={isSelected ? { backgroundColor: accent } : undefined}
              >
                <span className="text-[10px] font-medium uppercase">{g.label}</span>
                {/* Status dot */}
                <div className="mt-1">
                  {isSaved && stats.done === stats.total && stats.total > 0 ? (
                    <div className="w-2 h-2 rounded-full bg-emerald-400" />
                  ) : stats.done > 0 ? (
                    <div className="w-2 h-2 rounded-full bg-amber-400" />
                  ) : (
                    <div className="w-2 h-2 rounded-full bg-slate-300" />
                  )}
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* ═══ Day title ═══ */}
      <div className="max-w-2xl mx-auto px-4 mt-4">
        <p className="text-base font-semibold text-slate-900 capitalize">
          {giorni[selectedDay]?.labelLong}
        </p>
      </div>

      {/* ═══ Pasti del giorno ═══ */}
      <div className="max-w-2xl mx-auto px-4 mt-3 space-y-4">
        {currentGiorno?.pasti.map(pasto => {
          const Icon = TIPO_ICON[pasto.tipoPasto]
          const colorClass = TIPO_COLOR[pasto.tipoPasto]

          return (
            <div key={pasto.tipoPasto} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              {/* Pasto header */}
              <div className="px-4 py-3 border-b border-slate-50 flex items-center gap-2">
                <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border', colorClass)}>
                  <Icon size={13} />
                  {TIPO_LABEL[pasto.tipoPasto]}
                </span>
              </div>

              {/* Menu content */}
              {!pasto.menu || pasto.menu.piatti.length === 0 ? (
                <div className="px-4 py-8 text-center">
                  <UtensilsCrossed className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                  <p className="text-sm text-slate-400">Il menu sarà disponibile a breve</p>
                </div>
              ) : (
                <div className="px-4 py-3 space-y-5">
                  {groupByCategory(pasto.menu.piatti).map(({ categoria, piatti }) => (
                    <div key={categoria}>
                      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                        {CAT_LABEL[categoria] || categoria}
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {piatti.map(piatto => {
                          const key = `${currentDate}|${pasto.tipoPasto}|${categoria}`
                          const isSelected = scelte[key] === piatto.id
                          const tags = buildTags(piatto)

                          return (
                            <motion.button
                              key={piatto.id}
                              type="button"
                              onClick={() => selectPiatto(currentDate, pasto.tipoPasto, categoria, piatto.id)}
                              whileTap={{ scale: 0.98 }}
                              className={cn(
                                'text-left p-3.5 rounded-xl border-2 transition-all min-h-[60px]',
                                isSelected
                                  ? 'shadow-sm scale-[1.01]'
                                  : 'border-slate-100 hover:border-slate-200',
                              )}
                              style={isSelected ? { borderColor: accent } : undefined}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                  <p className={cn('text-sm font-semibold', isSelected ? 'text-slate-900' : 'text-slate-700')}>
                                    {piatto.nome}
                                  </p>
                                  {piatto.descrizione && (
                                    <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">{piatto.descrizione}</p>
                                  )}
                                  {tags.length > 0 && (
                                    <div className="flex flex-wrap gap-1 mt-1.5">
                                      {tags.map(tag => (
                                        <span key={tag.label} className={cn('text-[9px] font-medium px-1.5 py-0.5 rounded-full', tag.color)}>
                                          {tag.icon} {tag.label}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                </div>
                                {isSelected && (
                                  <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
                                    style={{ backgroundColor: accent }}>
                                    <Check size={12} className="text-white" />
                                  </div>
                                )}
                              </div>
                              {piatto.prezzo != null && piatto.prezzo > 0 && (
                                <p className="text-[10px] text-slate-400 mt-1">+€{piatto.prezzo.toFixed(2)}</p>
                              )}
                            </motion.button>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}

        {/* Multi-guest hint */}
        {numOspiti > 1 && (
          <p className="text-xs text-slate-400 text-center">
            Stai scegliendo per {numOspiti} persone. Ogni ospite potrà fare le sue scelte con il proprio link.
          </p>
        )}
      </div>

      {/* ═══ Sticky footer ═══ */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 shadow-lg z-30">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="text-sm text-slate-600">
            <span className="font-semibold" style={{ color: accent }}>{currentStats.done}</span>
            <span className="text-slate-400">/{currentStats.total} scelte</span>
          </div>

          <button
            onClick={saveDay}
            disabled={saving || currentStats.done === 0}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-semibold shadow-md hover:shadow-lg active:scale-[0.97] transition-all disabled:opacity-50"
            style={{ backgroundColor: accent }}
          >
            {saving ? (
              <><Loader2 size={14} className="animate-spin" /> Salvataggio...</>
            ) : (
              <><Check size={14} /> Salva scelte</>
            )}
          </button>
        </div>

        {/* Error */}
        {error && data && (
          <div className="max-w-2xl mx-auto px-4 pb-2">
            <p className="text-xs text-red-500">{error}</p>
          </div>
        )}
      </div>

      {/* ═══ Toast ═══ */}
      {toast && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className="fixed bottom-20 left-1/2 -translate-x-1/2 z-40 bg-emerald-600 text-white px-4 py-2 rounded-full text-sm font-semibold shadow-lg flex items-center gap-2"
        >
          <Check size={14} /> {toast}
        </motion.div>
      )}
    </div>
  )
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function groupByCategory(piatti: Piatto[]): { categoria: string; piatti: Piatto[] }[] {
  const map = new Map<string, Piatto[]>()
  for (const p of piatti) {
    if (!map.has(p.categoria)) map.set(p.categoria, [])
    map.get(p.categoria)!.push(p)
  }
  const result: { categoria: string; piatti: Piatto[] }[] = []
  for (const cat of CAT_ORDER) {
    const pp = map.get(cat)
    if (pp && pp.length > 0) result.push({ categoria: cat, piatti: pp })
  }
  for (const [cat, pp] of map) {
    if (!result.find(r => r.categoria === cat)) result.push({ categoria: cat, piatti: pp })
  }
  return result
}

interface Tag { label: string; icon: string; color: string }

function buildTags(piatto: Piatto): Tag[] {
  const tags: Tag[] = []
  if (piatto.vegano) tags.push({ label: 'Vegano', icon: '🌱', color: 'bg-green-100 text-green-800' })
  else if (piatto.vegetariano) tags.push({ label: 'Vegetariano', icon: '🌿', color: 'bg-green-100 text-green-700' })
  if (piatto.senzaGlutine) tags.push({ label: 'Senza glutine', icon: '🚫', color: 'bg-amber-100 text-amber-800' })
  for (const a of piatto.allergeni) {
    if (a === 'glutine' && piatto.senzaGlutine) continue
    tags.push({ label: a, icon: '⚠️', color: 'bg-slate-100 text-slate-600' })
  }
  return tags.slice(0, 4) // max 4 tags
}
