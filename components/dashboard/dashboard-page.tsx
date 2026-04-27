'use client'

import { useRef, useEffect, useState, type ReactNode } from 'react'
import { Loader2, AlertCircle, RotateCcw, Rocket, ChevronDown, Check } from 'lucide-react'
import Link from 'next/link'
import { useDashboard } from '@/hooks/use-dashboard'
import { useStruttura } from '@/components/layout/host-layout'
import { cn } from '@/lib/utils'
import { SezioneQuickActions } from './sezione-quick-actions'
import { SezioneAzioni } from './sezione-azioni'
import { SezioneOggi } from './sezione-oggi'
import { SezioneSpaOggi } from './sezione-spa-oggi'
import { SezioneAttivita } from './sezione-attivita'
import { OnboardingChecklistBanner } from '@/components/onboarding/onboarding-checklist'
import type { OnboardingChecklist } from '@/lib/onboarding'

// ─── Props ──────────────────────────────────────────────────────────────────

interface Props {
  nomeUtente: string
  moduliAttivi: Record<string, boolean>
  checklist?: OnboardingChecklist | null
  hostId?: string | null
}

// ─── Greeting ───────────────────────────────────────────────────────────────

function getGreeting(): string {
  const h = new Date().getHours()
  if (h < 12) return 'Buongiorno'
  if (h < 18) return 'Buon pomeriggio'
  return 'Buonasera'
}

// ─── Component ──────────────────────────────────────────────────────────────

export function DashboardPage({ nomeUtente, moduliAttivi, checklist, hostId }: Props) {
  const { strutturaCorrente } = useStruttura()
  const strutturaId = strutturaCorrente?.id ?? undefined
  const { data, isLoading, error, refresh } = useDashboard(strutturaId)

  const firstName = nomeUtente.split(' ')[0] || nomeUtente
  const greeting = getGreeting()
  const spaAttivo = moduliAttivi.spa === true

  // ── Loading state ──
  if (isLoading && !data) {
    return (
      <div className="space-y-6 animate-pulse">
        <DashboardHeader greeting={greeting} firstName={firstName} />
        <div className="flex gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="w-20 h-16 rounded-md bg-neutral-100" />
          ))}
        </div>
        <div className="flex gap-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-10 flex-1 rounded-md bg-neutral-100" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-64 rounded-lg bg-neutral-100" />
          ))}
        </div>
      </div>
    )
  }

  // ── Error state ──
  if (error && !data) {
    return (
      <div className="space-y-6">
        <DashboardHeader greeting={greeting} firstName={firstName} />
        <div className="flex flex-col items-center justify-center py-16 gap-4">
          <div className="w-14 h-14 rounded-full bg-error-50 flex items-center justify-center">
            <AlertCircle size={24} className="text-error-600" />
          </div>
          <p className="text-[14px] text-neutral-600">
            Impossibile caricare la dashboard. Riprova.
          </p>
          <button
            onClick={refresh}
            className="flex items-center gap-2 px-4 py-2 rounded-md bg-primary-600 text-white text-[13px] font-semibold hover:bg-primary-700 transition-colors"
          >
            <RotateCcw size={14} /> Riprova
          </button>
        </div>
      </div>
    )
  }

  // ── Empty state (new host, zero data) ──
  if (data && data.oggi.arrivi.totale === 0 && data.oggi.partenze.totale === 0 && data.oggi.inHouse === 0 && data.occupazione.unitaTotali === 0) {
    return (
      <div className="space-y-6">
        <DashboardHeader greeting={greeting} firstName={firstName} />
        <div className="flex flex-col items-center justify-center py-20 gap-5 text-center">
          <div className="w-16 h-16 rounded-xl bg-primary-50 flex items-center justify-center">
            <Rocket size={28} className="text-primary-600" />
          </div>
          <div>
            <h2 className="font-serif text-[22px] text-neutral-900 mb-1">
              Benvenuto su Otium
            </h2>
            <p className="text-[14px] text-neutral-500 max-w-sm">
              Inizia configurando la tua prima struttura. Poi potrai gestire prenotazioni, check-in e molto altro.
            </p>
          </div>
          <Link
            href="/host/onboarding"
            className="px-6 py-3 rounded-md bg-primary-600 text-white font-semibold text-[14px] hover:bg-primary-700 transition-colors"
          >
            Configura la tua struttura
          </Link>
        </div>
      </div>
    )
  }

  if (!data) return null

  return (
    <div className="space-y-6">
      {/* 1. Header */}
      <DashboardHeader greeting={greeting} firstName={firstName} />

      {/* Onboarding checklist (only if not 100% and not dismissed) */}
      {checklist && hostId && checklist.percentualeCompletamento < 100 && (
        <OnboardingChecklistBanner checklist={checklist} hostId={hostId} />
      )}

      {/* 2. Quick actions */}
      <section aria-label="Azioni rapide">
        <SezioneQuickActions spaAttivo={spaAttivo} />
      </section>

      {/* 3. Azioni richieste */}
      <section aria-label="Azioni richieste">
        <SezioneAzioni azioni={data.azioni} />
      </section>

      {/* 4. Oggi */}
      <section aria-label="Situazione odierna">
        <SezioneOggi oggi={data.oggi} occupazione={data.occupazione} />
      </section>

      {/* 5. Secondary row: SPA + Attività */}
      <LazySection>
        <section aria-label="Dettagli aggiuntivi">
          <div className={spaAttivo && data.spaOggi
            ? 'grid grid-cols-1 lg:grid-cols-2 gap-4'
            : ''
          }>
            {spaAttivo && data.spaOggi && (
              <SezioneSpaOggi spaOggi={data.spaOggi} />
            )}
            <SezioneAttivita attivita={data.attivitaRecente} />
          </div>
        </section>
      </LazySection>

      {/* Polling indicator — subtle dot in bottom right when refreshing */}
      {isLoading && data && (
        <div className="fixed bottom-4 right-4 z-10">
          <Loader2 size={14} className="animate-spin text-slate-300 dark:text-slate-600" />
        </div>
      )}
    </div>
  )
}

// ─── Dashboard header ───────────────────────────────────────────────────────
//
// Sobrio — niente gradient fancy. "{Saluto}, {nome}" in text-page-title, data
// estesa sotto come caption, struttura selector a destra se multi-struttura.

function DashboardHeader({ greeting, firstName }: { greeting: string; firstName: string }) {
  const { strutturaCorrente, strutture, setStruttura } = useStruttura()
  const [open, setOpen] = useState(false)

  const oggi = new Date().toLocaleDateString('it-IT', {
    weekday: 'long', day: 'numeric', month: 'long',
  })

  return (
    <div className="flex items-start justify-between gap-4 flex-wrap">
      <div className="min-w-0 flex-1">
        <h1 className="text-[22px] font-semibold text-neutral-900 tracking-[-0.02em] leading-tight">
          {greeting}, {firstName}
        </h1>
        <p className="mt-1 text-[13px] text-neutral-500 capitalize">{oggi}</p>
      </div>

      {strutture.length >= 2 && strutturaCorrente && (
        <div className="relative shrink-0">
          <button
            type="button"
            onClick={() => setOpen(v => !v)}
            className={cn(
              'inline-flex items-center gap-1.5 h-9 px-3 text-[13px] font-medium',
              'bg-white text-neutral-700 border border-neutral-200 rounded-md',
              'hover:bg-neutral-50 hover:border-neutral-300 transition-colors',
            )}
          >
            <span className="truncate max-w-[180px]">{strutturaCorrente.nome}</span>
            <ChevronDown size={14} className="text-neutral-400 shrink-0" />
          </button>

          {open && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
              <div className="absolute right-0 top-full mt-2 z-50 min-w-[220px] bg-white border border-neutral-200 rounded-md shadow-lg py-1">
                <div className="px-3 py-1.5 border-b border-neutral-100">
                  <p className="text-[10px] uppercase tracking-[0.02em] text-neutral-400 font-semibold">
                    Cambia struttura
                  </p>
                </div>
                {strutture.map(s => (
                  <button
                    key={s.id}
                    onClick={() => { setStruttura(s.id); setOpen(false) }}
                    className="w-full flex items-center justify-between gap-2 px-3 py-2 text-[13px] text-neutral-700 hover:bg-neutral-100 transition-colors"
                  >
                    <span className="truncate">{s.nome}</span>
                    {s.id === strutturaCorrente.id && <Check size={14} className="text-primary-600 shrink-0" />}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Lazy section (Intersection Observer) ───────────────────────────────────

function LazySection({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true)
          observer.disconnect()
        }
      },
      { rootMargin: '200px' },
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <div ref={ref}>
      {visible ? children : <div className="h-48" />}
    </div>
  )
}
