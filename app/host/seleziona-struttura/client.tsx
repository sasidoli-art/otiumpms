'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Building2, ArrowRight, Loader2, MapPin } from 'lucide-react'

interface StrutturaCard {
  id: string
  nome: string
  citta: string | null
  logo: string | null
  kpi: {
    arriviOggi: number
    partenzeOggi: number
    occupatiOggi: number
    totaleUnita: number
    prenotazioniMese: number
    fatturatoMese: number
  }
}

export function SelezioneStrutturaClient({ cards }: { cards: StrutturaCard[] }) {
  const router = useRouter()
  const [loadingId, setLoadingId] = useState<string | null>(null)

  async function seleziona(strutturaId: string) {
    setLoadingId(strutturaId)
    try {
      const res = await fetch('/api/host/struttura-attiva', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ strutturaId }),
      })
      if (!res.ok) {
        setLoadingId(null)
        return
      }
      router.push('/host/dashboard')
      router.refresh()
    } catch {
      setLoadingId(null)
    }
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {cards.map((c) => {
        const occ = c.kpi.totaleUnita > 0
          ? Math.round((c.kpi.occupatiOggi / c.kpi.totaleUnita) * 100)
          : 0
        const isLoading = loadingId === c.id
        return (
          <button
            key={c.id}
            onClick={() => seleziona(c.id)}
            disabled={loadingId !== null}
            className="group text-left bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-5 hover:shadow-lg hover:border-indigo-300 dark:hover:border-indigo-600 transition-all disabled:opacity-50"
          >
            <div className="flex items-start gap-3 mb-4">
              {c.logo ? (
                <img src={c.logo} alt={c.nome} className="w-12 h-12 rounded-lg object-cover" />
              ) : (
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center shrink-0">
                  <Building2 className="w-6 h-6 text-white" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-slate-900 dark:text-slate-100 truncate">{c.nome}</h3>
                {c.citta && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                    <MapPin className="w-3 h-3" /> {c.citta}
                  </p>
                )}
              </div>
              {isLoading ? (
                <Loader2 className="w-5 h-5 text-indigo-500 animate-spin shrink-0" />
              ) : (
                <ArrowRight className="w-5 h-5 text-slate-300 group-hover:text-indigo-500 group-hover:translate-x-1 transition-all shrink-0" />
              )}
            </div>

            <div className="grid grid-cols-3 gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
              <div>
                <p className="text-xs text-slate-400">Arrivi</p>
                <p className="text-lg font-bold text-slate-900 dark:text-slate-100">{c.kpi.arriviOggi}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Partenze</p>
                <p className="text-lg font-bold text-slate-900 dark:text-slate-100">{c.kpi.partenzeOggi}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Occup.</p>
                <p className="text-lg font-bold text-slate-900 dark:text-slate-100">{occ}%</p>
              </div>
            </div>

            <div className="mt-3 flex items-center justify-between text-xs">
              <span className="text-slate-500 dark:text-slate-400">
                {c.kpi.prenotazioniMese} prenot. mese
              </span>
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                € {c.kpi.fatturatoMese.toFixed(0)}
              </span>
            </div>
          </button>
        )
      })}
    </div>
  )
}
