'use client'

import { useState, useEffect, useCallback } from 'react'
import { format, addDays, differenceInCalendarDays } from 'date-fns'
import { it } from 'date-fns/locale'
import {
  Calendar, Users, BedDouble, Minus, Plus, Loader2, Tag, ArrowRight,
  ChevronDown, ChevronUp,
} from 'lucide-react'
import DateRangePicker from './date-range-picker'

export type UnitaDisponibile = {
  unitaId: string
  nome: string
  descrizione: string | null
  immagine: string | null
  capacita: number
  lettiExtra: number
  piano: number | null
  prezzoNotte: number
  prezzoTotale: number
  prezzoLettoExtra: number | null
  tariffaNome: string | null
  scontoApplicato: { regola: string; percentuale?: number; nottiMinime: number } | null
  prezzoTotaleScontato: number | null
  tassaSoggiornoNotte: number | null
}

type Props = {
  strutturaId: string
  capacitaMax: number
  onConferma: (sel: {
    arrivo: Date
    partenza: Date
    adulti: number
    bambini: number
    etaBambini: number[]
    unita: UnitaDisponibile
    lettoExtra: boolean
  }) => void
}

export default function StepDateCamere({ strutturaId, capacitaMax, onConferma }: Props) {
  const [arrivo, setArrivo] = useState<Date | null>(null)
  const [partenza, setPartenza] = useState<Date | null>(null)
  const [adulti, setAdulti] = useState(2)
  const [bambini, setBambini] = useState(0)
  const [etaBambini, setEtaBambini] = useState<number[]>([])
  const [ordinamento, setOrdinamento] = useState<'prezzo' | 'capacita'>('prezzo')
  const [descrizioniAperte, setDescrizioniAperte] = useState<Set<string>>(new Set())

  const [loading, setLoading] = useState(false)
  const [unita, setUnita] = useState<UnitaDisponibile[]>([])
  const [errore, setErrore] = useState<string | null>(null)
  const [lettoExtraSel, setLettoExtraSel] = useState<Set<string>>(new Set())

  const notti = arrivo && partenza ? differenceInCalendarDays(partenza, arrivo) : 0
  const totOspiti = adulti + bambini

  // Sync etaBambini length to bambini count
  useEffect(() => {
    setEtaBambini((prev) => {
      if (prev.length === bambini) return prev
      if (bambini > prev.length) return [...prev, ...Array(bambini - prev.length).fill(5)]
      return prev.slice(0, bambini)
    })
  }, [bambini])

  const fetchDisponibilita = useCallback(async () => {
    if (!arrivo || !partenza) return
    setLoading(true)
    setErrore(null)
    try {
      const params = new URLSearchParams({
        arrivo: format(arrivo, 'yyyy-MM-dd'),
        partenza: format(partenza, 'yyyy-MM-dd'),
        adulti: String(adulti),
        bambini: String(bambini),
      })
      const res = await fetch(`/api/book/${strutturaId}/camere/disponibilita?${params}`)
      const data = await res.json()
      if (!res.ok) {
        setErrore(data.error ?? 'Errore caricamento disponibilità')
        setUnita([])
      } else {
        setUnita(data.unita ?? [])
      }
    } catch {
      setErrore('Errore di rete')
    } finally {
      setLoading(false)
    }
  }, [arrivo, partenza, adulti, bambini, strutturaId])

  useEffect(() => {
    if (arrivo && partenza) fetchDisponibilita()
  }, [arrivo, partenza, adulti, bambini, fetchDisponibilita])

  const unitaOrdinata = [...unita].sort((a, b) => {
    if (ordinamento === 'prezzo') {
      return (a.prezzoTotaleScontato ?? a.prezzoTotale) - (b.prezzoTotaleScontato ?? b.prezzoTotale)
    }
    return b.capacita - a.capacita
  })

  function toggleDescrizione(id: string) {
    setDescrizioniAperte((s) => {
      const next = new Set(s)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  function toggleLettoExtra(id: string) {
    setLettoExtraSel((s) => {
      const next = new Set(s)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  return (
    <div className="space-y-6">
      {/* Date + ospiti */}
      <div className="bg-white rounded-xl border border-gray-100 p-5 md:p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Calendar className="w-5 h-5" style={{ color: 'var(--brand-primary)' }} />
          Quando vuoi venire?
        </h2>

        <div className="grid grid-cols-2 gap-3 mb-5">
          <div className="border border-gray-200 rounded-lg p-3">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Arrivo</p>
            <p className="text-sm font-semibold text-gray-900 mt-0.5">
              {arrivo ? format(arrivo, 'EEE d LLL', { locale: it }) : 'Seleziona data'}
            </p>
          </div>
          <div className="border border-gray-200 rounded-lg p-3">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Partenza</p>
            <p className="text-sm font-semibold text-gray-900 mt-0.5">
              {partenza ? format(partenza, 'EEE d LLL', { locale: it }) : 'Seleziona data'}
            </p>
          </div>
        </div>

        <DateRangePicker
          arrivo={arrivo}
          partenza={partenza}
          onChange={(a, p) => { setArrivo(a); setPartenza(p) }}
        />

        {/* Ospiti */}
        <div className="mt-6 pt-6 border-t border-gray-100">
          <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Users className="w-4 h-4" /> Ospiti
          </h3>
          <div className="space-y-3">
            <StepperRow
              label="Adulti"
              min={1}
              max={capacitaMax}
              value={adulti}
              onChange={setAdulti}
            />
            <StepperRow
              label="Bambini"
              sublabel="Fino a 17 anni"
              min={0}
              max={Math.max(0, capacitaMax - adulti)}
              value={bambini}
              onChange={setBambini}
            />
            {bambini > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2">
                {etaBambini.map((eta, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    <label className="text-gray-500">Bambino {i + 1}:</label>
                    <select
                      value={eta}
                      onChange={(e) => {
                        const next = [...etaBambini]
                        next[i] = parseInt(e.target.value)
                        setEtaBambini(next)
                      }}
                      className="px-2 py-1 border border-gray-200 rounded text-xs"
                    >
                      {Array.from({ length: 18 }, (_, a) => a).map((a) => (
                        <option key={a} value={a}>{a} {a === 1 ? 'anno' : 'anni'}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Risultati camere */}
      {arrivo && partenza && (
        <div>
          <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
            <h2 className="text-lg font-bold text-gray-900">
              {notti} {notti === 1 ? 'notte' : 'notti'} · {totOspiti} {totOspiti === 1 ? 'ospite' : 'ospiti'}
            </h2>
            {unita.length > 0 && (
              <div className="flex items-center gap-1 text-xs">
                <span className="text-gray-500 mr-1">Ordina per:</span>
                <button
                  onClick={() => setOrdinamento('prezzo')}
                  className={`px-2 py-1 rounded ${ordinamento === 'prezzo' ? 'bg-gray-900 text-white' : 'text-gray-500 hover:bg-gray-100'}`}
                >
                  Prezzo
                </button>
                <button
                  onClick={() => setOrdinamento('capacita')}
                  className={`px-2 py-1 rounded ${ordinamento === 'capacita' ? 'bg-gray-900 text-white' : 'text-gray-500 hover:bg-gray-100'}`}
                >
                  Capacità
                </button>
              </div>
            )}
          </div>

          {loading && (
            <div className="py-16 text-center">
              <Loader2 className="w-6 h-6 animate-spin mx-auto text-gray-400" />
              <p className="text-xs text-gray-500 mt-2">Cerco disponibilità…</p>
            </div>
          )}

          {!loading && errore && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">
              {errore}
            </div>
          )}

          {!loading && !errore && unitaOrdinata.length === 0 && (
            <div className="bg-white rounded-xl border border-gray-100 p-8 text-center">
              <BedDouble className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-sm font-semibold text-gray-900">Nessuna camera disponibile per le date selezionate</p>
              <p className="text-xs text-gray-500 mt-1">Prova a cambiare le date o il numero di ospiti.</p>
            </div>
          )}

          {!loading && unitaOrdinata.length > 0 && (
            <div className="space-y-4">
              {unitaOrdinata.map((u) => {
                const descOpen = descrizioniAperte.has(u.unitaId)
                const lettoExtra = lettoExtraSel.has(u.unitaId)
                const necessitaLettoExtra = totOspiti > u.capacita && u.lettiExtra > 0
                const prezzoExtra = lettoExtra && u.prezzoLettoExtra ? u.prezzoLettoExtra * notti : 0
                const prezzoFinale = (u.prezzoTotaleScontato ?? u.prezzoTotale) + prezzoExtra

                return (
                  <div
                    key={u.unitaId}
                    className="bg-white rounded-xl border border-gray-100 overflow-hidden hover:shadow-md transition-shadow"
                  >
                    <div className="md:flex">
                      {/* Immagine */}
                      <div className="md:w-56 h-48 md:h-auto bg-gray-100 shrink-0 relative">
                        {u.immagine ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={u.immagine} alt={u.nome} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-300">
                            <BedDouble className="w-12 h-12" />
                          </div>
                        )}
                        {u.tariffaNome && (
                          <span
                            className="absolute top-2 left-2 px-2 py-1 text-[10px] font-bold uppercase tracking-wider"
                            style={{
                              backgroundColor: 'var(--brand-primary)',
                              color: 'var(--brand-on-primary)',
                              borderRadius: 'var(--brand-radius)',
                            }}
                          >
                            {u.tariffaNome}
                          </span>
                        )}
                      </div>

                      {/* Contenuto */}
                      <div className="flex-1 p-4 md:p-5 flex flex-col">
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <div>
                            <h3 className="font-semibold text-gray-900 text-base">{u.nome}</h3>
                            <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                              <span className="flex items-center gap-1">
                                <Users className="w-3.5 h-3.5" /> {u.capacita} {u.capacita === 1 ? 'ospite' : 'ospiti'}
                                {u.lettiExtra > 0 && ` · +${u.lettiExtra} letto extra`}
                              </span>
                              {u.piano !== null && <span>Piano {u.piano}</span>}
                            </div>
                          </div>
                        </div>

                        {u.descrizione && (
                          <div className="text-xs text-gray-600 mb-3">
                            <p className={descOpen ? '' : 'line-clamp-2'}>{u.descrizione}</p>
                            {u.descrizione.length > 140 && (
                              <button
                                onClick={() => toggleDescrizione(u.unitaId)}
                                className="text-[11px] font-semibold mt-1 flex items-center gap-0.5"
                                style={{ color: 'var(--brand-primary)' }}
                              >
                                {descOpen ? 'Mostra meno' : 'Leggi tutto'}
                                {descOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                              </button>
                            )}
                          </div>
                        )}

                        {/* Letto extra */}
                        {necessitaLettoExtra && u.prezzoLettoExtra != null && (
                          <label className="flex items-start gap-2 mb-3 p-2.5 bg-amber-50 border border-amber-200 rounded-lg cursor-pointer">
                            <input
                              type="checkbox"
                              checked={lettoExtra}
                              onChange={() => toggleLettoExtra(u.unitaId)}
                              className="mt-0.5"
                            />
                            <span className="text-xs text-amber-900">
                              <strong>Aggiungi letto extra</strong> (+€{u.prezzoLettoExtra}/notte) —
                              necessario per {totOspiti} ospiti
                            </span>
                          </label>
                        )}

                        {/* Prezzo + CTA */}
                        <div className="mt-auto flex items-end justify-between gap-3 pt-3 border-t border-gray-100">
                          <div>
                            {u.scontoApplicato && u.prezzoTotaleScontato !== null && (
                              <span
                                className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 mb-1"
                                style={{
                                  backgroundColor: 'var(--brand-primary)',
                                  color: 'var(--brand-on-primary)',
                                  borderRadius: 'var(--brand-radius)',
                                }}
                              >
                                <Tag className="w-2.5 h-2.5" />
                                Sconto {u.scontoApplicato.nottiMinime}+ notti
                              </span>
                            )}
                            <div className="flex items-baseline gap-2">
                              {u.prezzoTotaleScontato !== null && u.prezzoTotaleScontato < u.prezzoTotale && (
                                <span className="text-xs text-gray-400 line-through">€{u.prezzoTotale.toFixed(0)}</span>
                              )}
                              <span
                                className="text-2xl font-bold"
                                style={{ color: 'var(--brand-primary)' }}
                              >
                                €{prezzoFinale.toFixed(0)}
                              </span>
                            </div>
                            <p className="text-[11px] text-gray-500">
                              €{Math.round(prezzoFinale / notti)}/notte · {notti} {notti === 1 ? 'notte' : 'notti'}
                            </p>
                          </div>
                          <button
                            onClick={() => onConferma({
                              arrivo: arrivo!,
                              partenza: partenza!,
                              adulti,
                              bambini,
                              etaBambini,
                              unita: u,
                              lettoExtra,
                            })}
                            className="px-4 md:px-5 py-2.5 text-sm font-semibold flex items-center gap-1.5 hover:brightness-110 transition-all"
                            style={{
                              backgroundColor: 'var(--brand-primary)',
                              color: 'var(--brand-on-primary)',
                              borderRadius: 'var(--brand-radius)',
                            }}
                          >
                            Prenota <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function StepperRow({
  label, sublabel, min, max, value, onChange,
}: {
  label: string
  sublabel?: string
  min: number
  max: number
  value: number
  onChange: (v: number) => void
}) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-gray-900">{label}</p>
        {sublabel && <p className="text-[11px] text-gray-400">{sublabel}</p>}
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onChange(Math.max(min, value - 1))}
          disabled={value <= min}
          className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center disabled:opacity-30 hover:bg-gray-50"
        >
          <Minus className="w-3.5 h-3.5" />
        </button>
        <span className="text-sm font-semibold w-6 text-center">{value}</span>
        <button
          type="button"
          onClick={() => onChange(Math.min(max, value + 1))}
          disabled={value >= max}
          className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center disabled:opacity-30 hover:bg-gray-50"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}
