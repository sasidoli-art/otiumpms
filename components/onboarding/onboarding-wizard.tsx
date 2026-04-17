'use client'

import { useState, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChevronRight, ChevronLeft, Check, Loader2,
  Building2, BedDouble, Puzzle, Rocket,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { CATALOGO_MODULI } from '@/lib/moduli'
import { StepStruttura, type StrutturaData } from './steps/step-struttura'
import { StepUnita, emptyUnita, type UnitaRow } from './steps/step-unita'

// ─── Step config ────────────────────────────────────────────────────────────

const STEPS = [
  { id: 1, label: 'Struttura', icon: Building2 },
  { id: 2, label: 'Camere', icon: BedDouble },
  { id: 3, label: 'Moduli', icon: Puzzle },
  { id: 4, label: 'Conferma', icon: Rocket },
]

// ─── Module category labels ─────────────────────────────────────────────────

const CAT_LABELS: Record<string, string> = {
  base: 'Moduli base',
  operativo: 'Operativo',
  avanzato: 'Avanzato',
  integrazioni: 'Integrazioni',
}

// ─── Props ──────────────────────────────────────────────────────────────────

interface Props {
  userName: string
  currentCompanyName: string
}

// ─── Component ──────────────────────────────────────────────────────────────

export function OnboardingWizard({ userName, currentCompanyName }: Props) {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [direction, setDirection] = useState(1)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // ── Step 1: Struttura ──
  const [struttura, setStruttura] = useState<StrutturaData>({
    nome: '',
    tipo: 'ALLOGGIO',
    indirizzo: '',
    citta: '',
    regione: '',
  })

  // ── Step 2: Unità ──
  const [unita, setUnita] = useState<UnitaRow[]>([emptyUnita()])

  // ── Step 3: Moduli ──
  const [moduli, setModuli] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {}
    for (const m of CATALOGO_MODULI) init[m.id] = m.defaultAttivo
    return init
  })

  // ── Validation ──
  const [errors, setErrors] = useState<Record<string, string>>({})

  function validateStep(s: number): boolean {
    const e: Record<string, string> = {}

    if (s === 1) {
      if (!struttura.nome.trim()) e.nome = 'Il nome è obbligatorio'
      if (!struttura.tipo) e.tipo = 'Seleziona un tipo'
    }

    if (s === 2) {
      const valid = unita.filter(u => u.nome.trim() && parseFloat(u.prezzo.replace(',', '.')) > 0)
      if (valid.length === 0) e.unita = `Aggiungi almeno una ${struttura.tipo === 'ALLOGGIO' ? 'camera' : 'unità'} con nome e prezzo`
    }

    setErrors(e)
    return Object.keys(e).length === 0
  }

  // ── Navigation ──
  const goNext = useCallback(() => {
    if (!validateStep(step)) return
    setDirection(1)
    setStep(s => Math.min(s + 1, 4))
  }, [step, struttura, unita])

  const goBack = useCallback(() => {
    setDirection(-1)
    setStep(s => Math.max(s - 1, 1))
  }, [])

  // ── Submit ──
  async function handleFinish() {
    setSaving(true)
    setError('')

    const validUnita = unita
      .filter(u => u.nome.trim())
      .map(u => ({
        nome: u.nome.trim(),
        capacita: u.capacita,
        prezzo: parseFloat(u.prezzo.replace(',', '.')) || 0,
      }))

    try {
      const res = await fetch('/api/host/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nomeAzienda: currentCompanyName || struttura.nome,
          indirizzo: struttura.indirizzo || undefined,
          citta: struttura.citta || undefined,
          regione: struttura.regione || undefined,
          strutturaNome: struttura.nome,
          strutturaTipo: struttura.tipo,
          strutturaCapacita: validUnita.reduce((sum, u) => sum + u.capacita, 0),
          strutturaPrezzo: validUnita[0]?.prezzo ?? 0,
          strutturaCitta: struttura.citta || undefined,
          moduliAttivi: moduli,
          // Extra: unità da creare (il backend le gestirà se supporta, altrimenti creiamo solo la struttura)
          unita: validUnita,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error || 'Errore durante il salvataggio')
        setSaving(false)
        return
      }

      router.push('/host/dashboard')
      router.refresh()
    } catch {
      setError('Errore di connessione. Riprova.')
      setSaving(false)
    }
  }

  // ── Moduli grouped by category ──
  const moduliGrouped = useMemo(() => {
    const groups: Record<string, typeof CATALOGO_MODULI> = {}
    for (const m of CATALOGO_MODULI) {
      if (!groups[m.categoria]) groups[m.categoria] = []
      groups[m.categoria].push(m)
    }
    return groups
  }, [])

  // ── Dynamic step 2 label ──
  const step2Label = struttura.tipo === 'ALLOGGIO' ? 'Camere' : 'Spazi'

  const firstName = userName.split(' ')[0] || userName

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* ═══ Progress bar ═══════════════════════════════════════════════ */}
        <div className="mb-8">
          <div className="flex items-center justify-between max-w-md mx-auto">
            {STEPS.map((s, i) => {
              const Icon = s.icon
              const isActive = step === s.id
              const isDone = step > s.id
              return (
                <div key={s.id} className="flex items-center flex-1">
                  {i > 0 && (
                    <div className={cn(
                      'flex-1 h-0.5 mx-2 transition-colors duration-300',
                      isDone ? 'bg-blue-500' : 'bg-slate-200 dark:bg-slate-700',
                    )} />
                  )}
                  <div className="flex flex-col items-center gap-1">
                    <div className={cn(
                      'w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 shrink-0',
                      isActive ? 'bg-blue-600 text-white shadow-lg scale-110'
                        : isDone ? 'bg-blue-600 text-white'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-400',
                    )}>
                      {isDone ? <Check size={16} /> : <Icon size={16} />}
                    </div>
                    <span className={cn(
                      'text-[10px] font-medium',
                      isActive ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400',
                    )}>
                      {s.id === 2 ? step2Label : s.label}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* ═══ Card ════════════════════════════════════════════════════════ */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          {/* Content */}
          <div className="px-6 md:px-10 py-8 min-h-[400px]">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={step}
                initial={{ x: direction > 0 ? 40 : -40, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: direction > 0 ? -40 : 40, opacity: 0 }}
                transition={{ duration: 0.2, ease: 'easeInOut' }}
              >
                {step === 1 && (
                  <StepStruttura data={struttura} onChange={setStruttura} errors={errors} />
                )}

                {step === 2 && (
                  <StepUnita unita={unita} onChange={setUnita} tipoStruttura={struttura.tipo} errors={errors} />
                )}

                {step === 3 && (
                  <StepModuli moduli={moduli} setModuli={setModuli} groups={moduliGrouped} />
                )}

                {step === 4 && (
                  <StepConferma
                    struttura={struttura}
                    unita={unita}
                    moduli={moduli}
                    firstName={firstName}
                    error={error}
                  />
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-6 md:px-10 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
            <button
              onClick={goBack}
              disabled={step === 1}
              className={cn(
                'flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                step === 1 ? 'invisible' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700',
              )}
            >
              <ChevronLeft size={16} />
              Indietro
            </button>

            <span className="text-xs text-slate-400">{step} / {STEPS.length}</span>

            {step < 4 ? (
              <button
                onClick={goNext}
                className="flex items-center gap-1.5 px-6 py-2.5 rounded-lg text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 shadow-sm transition-all"
              >
                Avanti
                <ChevronRight size={16} />
              </button>
            ) : (
              <button
                onClick={handleFinish}
                disabled={saving}
                className="flex items-center gap-1.5 px-6 py-2.5 rounded-lg text-sm font-semibold bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm transition-all disabled:opacity-50"
              >
                {saving ? (
                  <><Loader2 size={16} className="animate-spin" /> Salvataggio...</>
                ) : (
                  <><Check size={16} /> Inizia a usare Otium</>
                )}
              </button>
            )}
          </div>
        </div>

        <p className="text-center text-[11px] text-slate-400 mt-4">
          Potrai modificare tutto in seguito dalle impostazioni.
        </p>
      </div>
    </div>
  )
}

// ─── Step 3: Moduli ─────────────────────────────────────────────────────────

function StepModuli({ moduli, setModuli, groups }: {
  moduli: Record<string, boolean>
  setModuli: (m: Record<string, boolean>) => void
  groups: Record<string, typeof CATALOGO_MODULI>
}) {
  function toggle(id: string) {
    setModuli({ ...moduli, [id]: !moduli[id] })
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Scegli i tuoi moduli</h2>
        <p className="text-sm text-slate-500 mt-1">
          Attiva solo quello che ti serve. Potrai sempre aggiungerne altri.
        </p>
      </div>

      {Object.entries(groups).map(([cat, items]) => (
        <div key={cat}>
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
            {CAT_LABELS[cat] || cat}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {items.map(m => {
              const on = moduli[m.id] ?? false
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => toggle(m.id)}
                  className={cn(
                    'flex items-center gap-3 p-3 rounded-xl border text-left transition-all',
                    on
                      ? 'border-blue-300 dark:border-blue-600 bg-blue-50 dark:bg-blue-950/20'
                      : 'border-slate-200 dark:border-slate-700 hover:border-slate-300',
                  )}
                >
                  <div className={cn(
                    'w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors',
                    on ? 'bg-blue-600 border-blue-600' : 'border-slate-300 dark:border-slate-600',
                  )}>
                    {on && <Check size={10} className="text-white" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{m.nome}</p>
                    <p className="text-[11px] text-slate-500 truncate">{m.descrizione}</p>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Step 4: Conferma ───────────────────────────────────────────────────────

function StepConferma({ struttura, unita, moduli, firstName, error }: {
  struttura: StrutturaData
  unita: UnitaRow[]
  moduli: Record<string, boolean>
  firstName: string
  error: string
}) {
  const validUnita = unita.filter(u => u.nome.trim())
  const activeModuli = Object.entries(moduli).filter(([, v]) => v).length

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
          <Rocket size={28} className="text-emerald-600 dark:text-emerald-400" />
        </div>
        <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
          Tutto pronto, {firstName}!
        </h2>
        <p className="text-sm text-slate-500 mt-1">Controlla il riepilogo e lancia la tua struttura.</p>
      </div>

      <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-5 space-y-4">
        <div>
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Struttura</p>
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 mt-1">
            {struttura.nome} <span className="text-slate-400 font-normal">({struttura.tipo})</span>
          </p>
          {struttura.citta && (
            <p className="text-xs text-slate-500">{struttura.indirizzo ? `${struttura.indirizzo}, ` : ''}{struttura.citta}</p>
          )}
        </div>

        <div className="border-t border-slate-200 dark:border-slate-700 pt-3">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            {struttura.tipo === 'ALLOGGIO' ? 'Camere' : 'Spazi'} ({validUnita.length})
          </p>
          <div className="mt-1 space-y-1">
            {validUnita.map(u => (
              <p key={u.key} className="text-sm text-slate-700 dark:text-slate-300">
                {u.nome} — {u.capacita} ospiti — €{u.prezzo || '0'}
              </p>
            ))}
          </div>
        </div>

        <div className="border-t border-slate-200 dark:border-slate-700 pt-3">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Moduli attivi ({activeModuli})
          </p>
          <p className="text-sm text-slate-500 mt-1">
            {Object.entries(moduli)
              .filter(([, v]) => v)
              .map(([k]) => CATALOGO_MODULI.find(m => m.id === k)?.nome || k)
              .join(', ') || 'Nessuno'}
          </p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-xl px-4 py-3">
          <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
        </div>
      )}
    </div>
  )
}
