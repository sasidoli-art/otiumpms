'use client'

import { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChevronRight, ChevronLeft, Check, Loader2,
  Building2, BedDouble, UserCog, Rocket,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { CATALOGO_MODULI } from '@/lib/moduli'
import { StepStruttura, type StrutturaData } from './steps/step-struttura'
import { StepUnita, emptyUnita, type UnitaRow } from './steps/step-unita'
import { StepDatiHost, type DatiHostData } from './steps/step-dati-host'
import { StepConferma } from './steps/step-conferma'

// ─── Step config ────────────────────────────────────────────────────────────

const STEPS = [
  { id: 1, label: 'Struttura', icon: Building2 },
  { id: 2, label: 'Camere', icon: BedDouble },
  { id: 3, label: 'Dati', icon: UserCog },
  { id: 4, label: 'Conferma', icon: Rocket },
]

// ─── Module category labels ─────────────────────────────────────────────────

const CAT_LABELS: Record<string, string> = {
  base: 'Moduli base',
  operativo: 'Operativo',
  avanzato: 'Avanzato',
  integrazioni: 'Integrazioni',
}

// ─── Saved state shape ──────────────────────────────────────────────────────

interface SavedState {
  step: number
  struttura: StrutturaData
  unita: UnitaRow[]
  datiHost: DatiHostData
  moduli: Record<string, boolean>
}

// ─── Props ──────────────────────────────────────────────────────────────────

interface Props {
  userName: string
  userEmail: string
  currentCompanyName: string
  /** Saved onboarding data from host.onboardingData (for resume) */
  savedData?: SavedState | null
  /** Current onboarding step from host.onboardingStep (for resume) */
  savedStep?: number
}

// ─── Component ──────────────────────────────────────────────────────────────

export function OnboardingWizard({
  userName, userEmail, currentCompanyName,
  savedData, savedStep,
}: Props) {
  const router = useRouter()
  const { update: updateSession } = useSession()
  const initialStep = savedData?.step || (savedStep && savedStep > 0 && savedStep < 5 ? savedStep : 1)
  const [step, setStep] = useState(initialStep)
  const [direction, setDirection] = useState(1)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const saveTimerRef = useRef<ReturnType<typeof setTimeout>>()

  // ── Step 1: Struttura ──
  const [struttura, setStruttura] = useState<StrutturaData>(
    savedData?.struttura ?? { nome: '', tipo: 'ALLOGGIO', indirizzo: '', citta: '', regione: '' },
  )

  // ── Step 2: Unità ──
  const [unita, setUnita] = useState<UnitaRow[]>(
    savedData?.unita?.length ? savedData.unita : [emptyUnita()],
  )

  // ── Step 3: Dati host ──
  const [datiHost, setDatiHost] = useState<DatiHostData>(
    savedData?.datiHost ?? {
      nomeAzienda: currentCompanyName || '',
      partitaIva: '',
      telefono: '',
      email: userEmail || '',
      fattDiversa: false,
      fattNomeAzienda: '',
      fattPartitaIva: '',
      fattIndirizzo: '',
      fattCitta: '',
      fattCap: '',
      fattProvincia: '',
    },
  )

  // ── Moduli (collapsed section in step 3) ──
  const [moduli, setModuli] = useState<Record<string, boolean>>(
    savedData?.moduli ?? (() => {
      const init: Record<string, boolean> = {}
      for (const m of CATALOGO_MODULI) init[m.id] = m.defaultAttivo
      return init
    })(),
  )

  const [showModuli, setShowModuli] = useState(false)

  // ── Validation ──
  const [errors, setErrors] = useState<Record<string, string>>({})

  function validateStep(s: number): boolean {
    const e: Record<string, string> = {}
    if (s === 1) {
      if (!struttura.nome.trim()) e.nome = 'Il nome è obbligatorio'
    }
    if (s === 2) {
      const valid = unita.filter(u => u.nome.trim() && parseFloat(u.prezzo.replace(',', '.')) > 0)
      if (valid.length === 0) e.unita = `Aggiungi almeno una ${struttura.tipo === 'ALLOGGIO' ? 'camera' : 'unità'} con nome e prezzo`
    }
    if (s === 3) {
      if (!datiHost.nomeAzienda.trim()) e.nomeAzienda = 'Il nome azienda è obbligatorio'
      if (!datiHost.email.trim()) e.email = "L'email è obbligatoria"
    }
    setErrors(e)
    return Object.keys(e).length === 0
  }

  // ── Auto-save on step change (debounced) ──
  const saveProgress = useCallback(async (currentStep: number) => {
    try {
      const payload: SavedState = { step: currentStep, struttura, unita, datiHost, moduli }
      await fetch('/api/host/onboarding/save', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ step: currentStep, data: payload }),
      })
    } catch {
      // silent — saving progress is best-effort
    }
  }, [struttura, unita, datiHost, moduli])

  useEffect(() => {
    clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => saveProgress(step), 1000)
    return () => clearTimeout(saveTimerRef.current)
  }, [step, saveProgress])

  // ── Navigation ──
  const goNext = useCallback(() => {
    if (!validateStep(step)) return
    setDirection(1)
    setStep(s => Math.min(s + 1, 4))
  }, [step, struttura, unita, datiHost])

  const goBack = useCallback(() => {
    setDirection(-1)
    setStep(s => Math.max(s - 1, 1))
  }, [])

  // ── Final submit ──
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
      const res = await fetch('/api/host/onboarding/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          strutturaNome: struttura.nome,
          strutturaTipo: struttura.tipo,
          strutturaIndirizzo: struttura.indirizzo || undefined,
          strutturaCitta: struttura.citta || undefined,
          strutturaRegione: struttura.regione || undefined,
          unita: validUnita,
          nomeAzienda: datiHost.nomeAzienda,
          partitaIva: datiHost.partitaIva || undefined,
          telefono: datiHost.telefono || undefined,
          email: datiHost.email || undefined,
          fattDiversa: datiHost.fattDiversa,
          fattNomeAzienda: datiHost.fattNomeAzienda || undefined,
          fattPartitaIva: datiHost.fattPartitaIva || undefined,
          fattIndirizzo: datiHost.fattIndirizzo || undefined,
          fattCitta: datiHost.fattCitta || undefined,
          fattCap: datiHost.fattCap || undefined,
          fattProvincia: datiHost.fattProvincia || undefined,
          moduliAttivi: moduli,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error || 'Errore durante il salvataggio')
        setSaving(false)
        return
      }

      // Refresh JWT token so middleware picks up onboardingStep = 5
      await updateSession()
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

  const step2Label = struttura.tipo === 'ALLOGGIO' ? 'Camere' : 'Spazi'
  const firstName = userName.split(' ')[0] || userName

  // ════════════════════════════════════════════════════════════════════════════
  // RENDER
  // ════════════════════════════════════════════════════════════════════════════

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* ═══ Stepper ════════════════════════════════════════════════════ */}
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

        {/* ═══ Card ═══════════════════════════════════════════════════════ */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="px-6 md:px-10 py-8 min-h-[420px]">
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
                  <div className="space-y-6">
                    <StepDatiHost data={datiHost} onChange={setDatiHost} errors={errors} />

                    {/* Moduli — toggle collapsible */}
                    <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                      <button
                        type="button"
                        onClick={() => setShowModuli(v => !v)}
                        className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                      >
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                          Moduli attivi ({Object.values(moduli).filter(Boolean).length})
                        </span>
                        <span className="text-xs text-blue-600 dark:text-blue-400">
                          {showModuli ? 'Chiudi' : 'Personalizza'}
                        </span>
                      </button>
                      {showModuli && (
                        <div className="px-4 pb-4 pt-1 border-t border-slate-100 dark:border-slate-800">
                          <StepModuli moduli={moduli} setModuli={setModuli} groups={moduliGrouped} />
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {step === 4 && (
                  <StepConferma
                    struttura={struttura}
                    unita={unita}
                    datiHost={datiHost}
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
                  <><Rocket size={16} /> Vai alla dashboard</>
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

// ─── Moduli sub-component ───────────────────────────────────────────────────

function StepModuli({ moduli, setModuli, groups }: {
  moduli: Record<string, boolean>
  setModuli: (m: Record<string, boolean>) => void
  groups: Record<string, typeof CATALOGO_MODULI>
}) {
  return (
    <div className="space-y-4 mt-2">
      {Object.entries(groups).map(([cat, items]) => (
        <div key={cat}>
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
            {CAT_LABELS[cat] || cat}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
            {items.map(m => {
              const on = moduli[m.id] ?? false
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setModuli({ ...moduli, [m.id]: !on })}
                  className={cn(
                    'flex items-center gap-2.5 px-3 py-2 rounded-lg border text-left transition-all text-xs',
                    on
                      ? 'border-blue-300 dark:border-blue-600 bg-blue-50 dark:bg-blue-950/20'
                      : 'border-slate-200 dark:border-slate-700 hover:border-slate-300',
                  )}
                >
                  <div className={cn(
                    'w-3.5 h-3.5 rounded border-2 flex items-center justify-center shrink-0',
                    on ? 'bg-blue-600 border-blue-600' : 'border-slate-300 dark:border-slate-600',
                  )}>
                    {on && <Check size={8} className="text-white" />}
                  </div>
                  <span className="font-medium text-slate-700 dark:text-slate-300 truncate">{m.nome}</span>
                </button>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
