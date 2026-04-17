'use client'

import { useRef, useEffect, useState, type ReactNode } from 'react'
import { Loader2, AlertCircle, RotateCcw, Rocket } from 'lucide-react'
import Link from 'next/link'
import { useDashboard, type DashboardData } from '@/hooks/use-dashboard'
import { useStruttura } from '@/components/layout/host-layout'
import { SezioneQuickActions } from './sezione-quick-actions'
import { SezioneAzioni } from './sezione-azioni'
import { SezioneOggi } from './sezione-oggi'
import { SezioneSpaOggi } from './sezione-spa-oggi'
import { SezioneAttivita } from './sezione-attivita'

// ─── Props ──────────────────────────────────────────────────────────────────

interface Props {
  nomeUtente: string
  moduliAttivi: Record<string, boolean>
}

// ─── Greeting ───────────────────────────────────────────────────────────────

function getGreeting(): string {
  const h = new Date().getHours()
  if (h < 12) return 'Buongiorno'
  if (h < 18) return 'Buon pomeriggio'
  return 'Buonasera'
}

// ─── Component ──────────────────────────────────────────────────────────────

export function DashboardPage({ nomeUtente, moduliAttivi }: Props) {
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
        {/* Quick actions skeleton */}
        <div className="flex gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="w-20 h-16 rounded-xl bg-slate-200 dark:bg-slate-800" />
          ))}
        </div>
        {/* Azioni skeleton */}
        <div className="flex gap-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-12 flex-1 rounded-lg bg-slate-200 dark:bg-slate-800" />
          ))}
        </div>
        {/* Oggi skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-64 rounded-xl bg-slate-200 dark:bg-slate-800" />
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
          <div className="w-14 h-14 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
            <AlertCircle size={24} className="text-red-500" />
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Impossibile caricare la dashboard. Riprova.
          </p>
          <button
            onClick={refresh}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors"
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
          <div className="w-16 h-16 rounded-2xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
            <Rocket size={28} className="text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-1">
              Benvenuto su Otium!
            </h2>
            <p className="text-sm text-slate-500 max-w-sm">
              Inizia configurando la tua prima struttura. Poi potrai gestire prenotazioni, check-in e molto altro.
            </p>
          </div>
          <Link
            href="/host/onboarding"
            className="px-6 py-3 rounded-xl bg-blue-600 text-white font-semibold text-sm hover:bg-blue-700 transition-colors"
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

function DashboardHeader({ greeting, firstName }: { greeting: string; firstName: string }) {
  return (
    <div>
      <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
        {greeting},{' '}
        <span className="bg-gradient-to-r from-blue-600 to-violet-600 bg-clip-text text-transparent">
          {firstName}
        </span>!
      </h1>
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
