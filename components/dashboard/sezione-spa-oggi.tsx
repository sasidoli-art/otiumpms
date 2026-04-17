'use client'

import Link from 'next/link'
import { Flower2, Clock, User, ChevronRight } from 'lucide-react'
import type { DashboardData } from '@/hooks/use-dashboard'

interface Props {
  spaOggi: NonNullable<DashboardData['spaOggi']>
}

export function SezioneSpaOggi({ spaOggi }: Props) {
  const { appuntamenti, completati, prossimo } = spaOggi
  const pct = appuntamenti > 0 ? Math.round((completati / appuntamenti) * 100) : 0

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <Flower2 size={16} className="text-violet-500" />
          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">SPA oggi</h3>
        </div>
        <Link
          href="/host/spa/calendario"
          className="text-xs text-slate-400 hover:text-violet-600 dark:hover:text-violet-400 transition-colors"
        >
          Calendario <ChevronRight size={12} className="inline" />
        </Link>
      </div>

      <div className="px-4 py-4">
        {appuntamenti === 0 ? (
          <div className="text-center py-4">
            <p className="text-sm text-slate-400 mb-2">Nessun appuntamento oggi</p>
            <Link
              href="/host/spa"
              className="text-xs font-semibold text-violet-600 dark:text-violet-400 hover:underline"
            >
              Gestisci SPA
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Stats line */}
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-700 dark:text-slate-300">
                <span className="font-bold">{appuntamenti}</span> appuntament{appuntamenti === 1 ? 'o' : 'i'},
                {' '}<span className="font-bold text-emerald-600 dark:text-emerald-400">{completati}</span> completat{completati === 1 ? 'o' : 'i'}
              </p>
              <span className="text-xs font-semibold text-slate-400">{pct}%</span>
            </div>

            {/* Progress bar */}
            <div className="h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-violet-500 rounded-full transition-all duration-500"
                style={{ width: `${pct}%` }}
              />
            </div>

            {/* Next appointment */}
            {prossimo && (
              <div className="flex items-start gap-3 pt-1">
                <div className="w-8 h-8 rounded-lg bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center shrink-0 mt-0.5">
                  <Clock size={14} className="text-violet-500" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-slate-800 dark:text-slate-200">
                    <span className="font-semibold">Prossimo:</span>{' '}
                    {prossimo.trattamentoNome} — {prossimo.guestNome} alle{' '}
                    <span className="font-semibold">{prossimo.oraInizio}</span>
                  </p>
                  {prossimo.terapistaNome && (
                    <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
                      <User size={10} /> con {prossimo.terapistaNome}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
