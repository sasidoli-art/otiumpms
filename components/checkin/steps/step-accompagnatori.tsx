'use client'

import {
  useState,
  useCallback,
  useImperativeHandle,
  forwardRef,
  type ForwardedRef,
} from 'react'
import { ChevronDown, Check, Plus, User, AlertCircle } from 'lucide-react'
import { PROVINCE_ITALIANE } from '@/lib/nazionalita'

// ─── Types ──────────────────────────────────────────────────────────────────

export interface AccompagnatoreForm {
  nome: string
  cognome: string
  sesso: string
  giornoNascita: string
  meseNascita: string
  annoNascita: string
  luogoNascita: string
  provinciaNascita: string
  isMinore: boolean
  tipoDocumento: string
  numeroDocumento: string
}

export interface StepAccompagnatoriRef {
  validate: () => boolean
}

interface Props {
  numOspiti: number
  accompagnatori?: AccompagnatoreForm[]
  onChange: (accompagnatori: AccompagnatoreForm[]) => void
  accentColor?: string
}

// ─── Helpers ────────────────────────────────────────────────────────────────

const MESI = ['Gen','Feb','Mar','Apr','Mag','Giu','Lug','Ago','Set','Ott','Nov','Dic']
const currentYear = new Date().getFullYear()
const ANNI = Array.from({ length: 100 }, (_, i) => currentYear - i)

const TIPI_DOC = [
  { value: 'IDENTE', label: "Carta d'identità" },
  { value: 'PPORT', label: 'Passaporto' },
  { value: 'PATEN', label: 'Patente' },
]

function emptyAcc(): AccompagnatoreForm {
  return {
    nome: '', cognome: '', sesso: '', giornoNascita: '', meseNascita: '', annoNascita: '',
    luogoNascita: '', provinciaNascita: '', isMinore: false, tipoDocumento: '', numeroDocumento: '',
  }
}

function isComplete(a: AccompagnatoreForm): boolean {
  if (!a.nome.trim() || !a.cognome.trim() || !a.sesso) return false
  if (!a.giornoNascita || !a.meseNascita || !a.annoNascita) return false
  if (!a.isMinore && !a.tipoDocumento) return false
  if (!a.isMinore && !a.numeroDocumento.trim()) return false
  return true
}

function calcIsMinore(g: string, m: string, a: string): boolean {
  if (!g || !m || !a) return false
  const nascita = new Date(Number(a), Number(m) - 1, Number(g))
  const oggi = new Date()
  const eta = oggi.getFullYear() - nascita.getFullYear()
  const mesePassato = oggi.getMonth() > nascita.getMonth() ||
    (oggi.getMonth() === nascita.getMonth() && oggi.getDate() >= nascita.getDate())
  return (eta < 18) || (eta === 18 && !mesePassato)
}

// ─── Component ──────────────────────────────────────────────────────────────

const StepAccompagnatori = forwardRef(function StepAccompagnatori(
  { numOspiti, accompagnatori: initial, onChange, accentColor }: Props,
  ref: ForwardedRef<StepAccompagnatoriRef>,
) {
  const accent = accentColor || '#4f46e5'
  const numRequired = Math.max(0, numOspiti - 1)

  const [accs, setAccs] = useState<AccompagnatoreForm[]>(() => {
    if (initial && initial.length > 0) return initial
    return Array.from({ length: numRequired }, () => emptyAcc())
  })

  const [expanded, setExpanded] = useState<number>(0)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const update = useCallback((index: number, key: keyof AccompagnatoreForm, value: string | boolean) => {
    setAccs(prev => {
      const next = [...prev]
      next[index] = { ...next[index], [key]: value }

      // Auto-calc isMinore dalla data di nascita
      if (key === 'giornoNascita' || key === 'meseNascita' || key === 'annoNascita') {
        const a = next[index]
        next[index].isMinore = calcIsMinore(a.giornoNascita, a.meseNascita, a.annoNascita)
      }

      onChange(next)
      return next
    })
    setErrors(prev => { const n = { ...prev }; delete n[`${index}-${key}`]; return n })
  }, [onChange])

  const addAccompagnatore = useCallback(() => {
    setAccs(prev => {
      const next = [...prev, emptyAcc()]
      onChange(next)
      setExpanded(next.length - 1)
      return next
    })
  }, [onChange])

  const removeAccompagnatore = useCallback((index: number) => {
    if (accs.length <= numRequired) return // non rimuovere i richiesti
    setAccs(prev => {
      const next = prev.filter((_, i) => i !== index)
      onChange(next)
      return next
    })
  }, [accs.length, numRequired, onChange])

  const validate = useCallback((): boolean => {
    const e: Record<string, string> = {}
    accs.forEach((a, i) => {
      if (!a.nome.trim()) e[`${i}-nome`] = 'obbligatorio'
      if (!a.cognome.trim()) e[`${i}-cognome`] = 'obbligatorio'
      if (!a.sesso) e[`${i}-sesso`] = 'obbligatorio'
      if (!a.giornoNascita || !a.meseNascita || !a.annoNascita) e[`${i}-data`] = 'obbligatoria'
      // Documento obbligatorio solo per maggiorenni e >= 14 anni
      const eta14 = a.annoNascita && (currentYear - Number(a.annoNascita)) >= 14
      if (!a.isMinore && eta14 && !a.numeroDocumento.trim()) e[`${i}-doc`] = 'obbligatorio per maggiorenni'
    })
    setErrors(e)
    return Object.keys(e).length === 0
  }, [accs])

  useImperativeHandle(ref, () => ({ validate }))

  const inp = 'w-full border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 bg-gray-50 focus:bg-white transition-colors'
  const inpOk = 'border-gray-200 focus:ring-indigo-400'
  const inpErr = 'border-red-400 bg-red-50'
  const errMsg = 'text-[10px] text-red-500 mt-0.5'

  return (
    <div className="space-y-4 pb-4">
      <div>
        <p className="text-sm font-bold text-gray-900 mb-1">Accompagnatori</p>
        <p className="text-xs text-gray-500 mb-4">
          Prenotazione per <strong>{numOspiti}</strong> ospiti.
          {numRequired > 0 ? ` Registra ${numRequired} accompagnator${numRequired === 1 ? 'e' : 'i'}.` : ' Nessun accompagnatore da registrare.'}
        </p>
      </div>

      {accs.map((acc, i) => {
        const isOpen = expanded === i
        const complete = isComplete(acc)
        const hasErr = Object.keys(errors).some(k => k.startsWith(`${i}-`))

        return (
          <div
            key={i}
            className={`border rounded-2xl overflow-hidden transition-all duration-200 ${
              isOpen ? 'border-gray-300 shadow-sm' : complete ? 'border-green-200 bg-green-50/30' : hasErr ? 'border-red-200' : 'border-gray-200'
            }`}
          >
            {/* Header */}
            <button
              type="button"
              onClick={() => setExpanded(isOpen ? -1 : i)}
              className="w-full flex items-center gap-3 p-4 text-left"
            >
              {/* Status dot */}
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                complete ? 'bg-green-100 text-green-600' : hasErr ? 'bg-red-100 text-red-500' : 'bg-gray-100 text-gray-400'
              }`}>
                {complete ? <Check className="w-4 h-4" /> : <User className="w-4 h-4" />}
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-800">
                  Accompagnatore {i + 1}
                  {acc.isMinore && (
                    <span className="ml-2 text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">Minore</span>
                  )}
                </p>
                {complete && !isOpen && (
                  <p className="text-xs text-gray-500 truncate">
                    {acc.nome} {acc.cognome}
                    {acc.giornoNascita && ` · ${acc.giornoNascita}/${acc.meseNascita}/${acc.annoNascita}`}
                  </p>
                )}
              </div>

              <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Form (espanso) */}
            {isOpen && (
              <div className="px-4 pb-4 space-y-3 border-t border-gray-100 pt-3">
                {/* Nome + Cognome */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-semibold text-gray-600 mb-1">Nome *</label>
                    <input type="text" value={acc.nome} onChange={e => update(i, 'nome', e.target.value)}
                      placeholder="Nome" className={`${inp} ${errors[`${i}-nome`] ? inpErr : inpOk}`} />
                    {errors[`${i}-nome`] && <p className={errMsg}>{errors[`${i}-nome`]}</p>}
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-gray-600 mb-1">Cognome *</label>
                    <input type="text" value={acc.cognome} onChange={e => update(i, 'cognome', e.target.value)}
                      placeholder="Cognome" className={`${inp} ${errors[`${i}-cognome`] ? inpErr : inpOk}`} />
                    {errors[`${i}-cognome`] && <p className={errMsg}>{errors[`${i}-cognome`]}</p>}
                  </div>
                </div>

                {/* Sesso */}
                <div>
                  <label className="block text-[10px] font-semibold text-gray-600 mb-1">Sesso *</label>
                  <div className="grid grid-cols-2 gap-2">
                    {(['M', 'F'] as const).map(s => (
                      <button key={s} type="button" onClick={() => update(i, 'sesso', s)}
                        className={`py-2 rounded-xl text-xs font-semibold transition-all ${
                          acc.sesso === s ? 'text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                        style={acc.sesso === s ? { backgroundColor: accent } : undefined}>
                        {s === 'M' ? 'Maschio' : 'Femmina'}
                      </button>
                    ))}
                  </div>
                  {errors[`${i}-sesso`] && <p className={errMsg}>{errors[`${i}-sesso`]}</p>}
                </div>

                {/* Data di nascita */}
                <div>
                  <label className="block text-[10px] font-semibold text-gray-600 mb-1">Data di nascita *</label>
                  <div className="grid grid-cols-3 gap-2">
                    <select value={acc.giornoNascita} onChange={e => update(i, 'giornoNascita', e.target.value)}
                      className={`${inp} ${errors[`${i}-data`] ? inpErr : inpOk} text-xs`}>
                      <option value="">GG</option>
                      {Array.from({ length: 31 }, (_, j) => <option key={j+1} value={String(j+1)}>{j+1}</option>)}
                    </select>
                    <select value={acc.meseNascita} onChange={e => update(i, 'meseNascita', e.target.value)}
                      className={`${inp} ${errors[`${i}-data`] ? inpErr : inpOk} text-xs`}>
                      <option value="">MM</option>
                      {MESI.map((m, j) => <option key={j+1} value={String(j+1)}>{m}</option>)}
                    </select>
                    <select value={acc.annoNascita} onChange={e => update(i, 'annoNascita', e.target.value)}
                      className={`${inp} ${errors[`${i}-data`] ? inpErr : inpOk} text-xs`}>
                      <option value="">AAAA</option>
                      {ANNI.map(a => <option key={a} value={String(a)}>{a}</option>)}
                    </select>
                  </div>
                  {errors[`${i}-data`] && <p className={errMsg}>{errors[`${i}-data`]}</p>}
                  {acc.isMinore && (
                    <p className="text-[10px] text-amber-600 mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" /> Minorenne — documento non obbligatorio se &lt; 14 anni
                    </p>
                  )}
                </div>

                {/* Luogo nascita */}
                <div>
                  <label className="block text-[10px] font-semibold text-gray-600 mb-1">Luogo di nascita</label>
                  <input type="text" value={acc.luogoNascita} onChange={e => update(i, 'luogoNascita', e.target.value)}
                    placeholder="Comune o città" className={`${inp} ${inpOk}`} />
                </div>

                <div>
                  <label className="block text-[10px] font-semibold text-gray-600 mb-1">Provincia nascita</label>
                  <select value={acc.provinciaNascita} onChange={e => update(i, 'provinciaNascita', e.target.value)}
                    className={`${inp} ${inpOk} text-xs`}>
                    <option value="">Seleziona</option>
                    {PROVINCE_ITALIANE.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>

                {/* Documento (solo maggiorenni o >= 14 anni) */}
                {!acc.isMinore && (
                  <>
                    <div className="border-t border-gray-100 pt-3 mt-1">
                      <label className="block text-[10px] font-semibold text-gray-600 mb-1">Tipo documento *</label>
                      <select value={acc.tipoDocumento} onChange={e => update(i, 'tipoDocumento', e.target.value)}
                        className={`${inp} ${inpOk} text-xs`}>
                        <option value="">Seleziona</option>
                        {TIPI_DOC.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-gray-600 mb-1">Numero documento *</label>
                      <input type="text" value={acc.numeroDocumento}
                        onChange={e => update(i, 'numeroDocumento', e.target.value.toUpperCase())}
                        placeholder="Es. CA12345AB"
                        className={`${inp} ${errors[`${i}-doc`] ? inpErr : inpOk} uppercase font-mono tracking-wider`} />
                      {errors[`${i}-doc`] && <p className={errMsg}>{errors[`${i}-doc`]}</p>}
                    </div>
                  </>
                )}

                {/* Rimuovi (solo se extra) */}
                {i >= numRequired && (
                  <button type="button" onClick={() => removeAccompagnatore(i)}
                    className="text-xs text-red-500 hover:text-red-700 font-medium mt-2">
                    Rimuovi accompagnatore
                  </button>
                )}

                {/* Avanti nel accordion */}
                {i < accs.length - 1 && (
                  <button type="button" onClick={() => setExpanded(i + 1)}
                    className="w-full py-2 mt-2 text-xs font-semibold rounded-xl transition-all text-white"
                    style={{ backgroundColor: accent }}>
                    Prossimo accompagnatore →
                  </button>
                )}
              </div>
            )}
          </div>
        )
      })}

      {/* Aggiungi extra */}
      <button type="button" onClick={addAccompagnatore}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-gray-300 text-sm font-medium text-gray-500 hover:border-gray-400 hover:text-gray-700 transition-colors">
        <Plus className="w-4 h-4" /> Aggiungi accompagnatore
      </button>
    </div>
  )
})

export default StepAccompagnatori
