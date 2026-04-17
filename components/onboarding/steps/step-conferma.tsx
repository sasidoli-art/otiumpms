'use client'

import { Rocket, Palette, Mail, CalendarPlus } from 'lucide-react'
import { CATALOGO_MODULI } from '@/lib/moduli'
import type { StrutturaData } from './step-struttura'
import type { UnitaRow } from './step-unita'
import type { DatiHostData } from './step-dati-host'

// ─── Props ──────────────────────────────────────────────────────────────────

interface Props {
  struttura: StrutturaData
  unita: UnitaRow[]
  datiHost: DatiHostData
  moduli: Record<string, boolean>
  firstName: string
  error: string
}

// ─── Component ──────────────────────────────────────────────────────────────

export function StepConferma({ struttura, unita, datiHost, moduli, firstName, error }: Props) {
  const validUnita = unita.filter(u => u.nome.trim())
  const prezzi = validUnita.map(u => parseFloat(u.prezzo.replace(',', '.')) || 0).filter(p => p > 0)
  const prezzoMin = prezzi.length > 0 ? Math.min(...prezzi) : 0
  const prezzoMax = prezzi.length > 0 ? Math.max(...prezzi) : 0
  const activeModuli = Object.entries(moduli).filter(([, v]) => v)
  const isAlloggio = struttura.tipo === 'ALLOGGIO'

  return (
    <div className="space-y-6">
      {/* Header celebrativo */}
      <div className="text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
          <Rocket size={28} className="text-emerald-600 dark:text-emerald-400" />
        </div>
        <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
          La tua struttura è pronta, {firstName}!
        </h2>
        <p className="text-sm text-slate-500 mt-1">Controlla il riepilogo, poi vai alla dashboard.</p>
      </div>

      {/* Card riepilogo */}
      <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-5 space-y-4">
        {/* Struttura */}
        <div>
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Struttura</p>
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 mt-1">
            {struttura.nome}
          </p>
          <p className="text-xs text-slate-500">
            {struttura.tipo}
            {struttura.citta && ` · ${struttura.citta}`}
          </p>
        </div>

        {/* Camere / Unità */}
        <div className="border-t border-slate-200 dark:border-slate-700 pt-3">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            {isAlloggio ? 'Camere' : 'Spazi'} ({validUnita.length})
          </p>
          {validUnita.length > 0 ? (
            <>
              <div className="mt-1 space-y-0.5">
                {validUnita.slice(0, 5).map(u => (
                  <p key={u.key} className="text-sm text-slate-700 dark:text-slate-300">
                    {u.nome} — {u.capacita} ospiti
                    {u.prezzo && ` — €${u.prezzo}`}
                  </p>
                ))}
                {validUnita.length > 5 && (
                  <p className="text-xs text-slate-400">...e altre {validUnita.length - 5}</p>
                )}
              </div>
              {prezzi.length > 0 && (
                <p className="text-xs text-slate-500 mt-1.5">
                  Prezzo: {prezzoMin === prezzoMax ? `€${prezzoMin}` : `da €${prezzoMin} a €${prezzoMax}`} / notte
                </p>
              )}
            </>
          ) : (
            <p className="text-sm text-slate-400 mt-1">Nessuna unità aggiunta</p>
          )}
        </div>

        {/* Dati azienda */}
        <div className="border-t border-slate-200 dark:border-slate-700 pt-3">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Azienda</p>
          <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mt-1">
            {datiHost.nomeAzienda}
          </p>
          <div className="text-xs text-slate-500 mt-0.5 space-y-0.5">
            {datiHost.partitaIva && <p>P.IVA: {datiHost.partitaIva}</p>}
            {datiHost.email && <p>{datiHost.email}</p>}
            {datiHost.telefono && <p>{datiHost.telefono}</p>}
          </div>
        </div>

        {/* Moduli */}
        <div className="border-t border-slate-200 dark:border-slate-700 pt-3">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Moduli attivi ({activeModuli.length})
          </p>
          <p className="text-sm text-slate-500 mt-1">
            {activeModuli
              .map(([k]) => CATALOGO_MODULI.find(m => m.id === k)?.nome || k)
              .join(', ') || 'Nessuno'}
          </p>
        </div>
      </div>

      {/* Prossimi passi suggeriti */}
      <div>
        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
          Prossimi passi (li troverai nella dashboard)
        </p>
        <div className="space-y-2">
          <NextStepHint
            icon={Palette}
            title="Personalizza il look"
            desc="Logo, colori e branding della tua struttura"
            color="text-violet-500"
          />
          <NextStepHint
            icon={Mail}
            title="Configura le email"
            desc="Per inviare conferme e reminder agli ospiti"
            color="text-blue-500"
          />
          <NextStepHint
            icon={CalendarPlus}
            title="Crea la prima prenotazione"
            desc="Inserisci una prenotazione di prova"
            color="text-emerald-500"
          />
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-xl px-4 py-3">
          <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
        </div>
      )}
    </div>
  )
}

// ─── Next step hint ─────────────────────────────────────────────────────────

function NextStepHint({ icon: Icon, title, desc, color }: {
  icon: typeof Rocket
  title: string
  desc: string
  color: string
}) {
  return (
    <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700/50">
      <Icon size={16} className={color} />
      <div className="min-w-0">
        <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{title}</p>
        <p className="text-[11px] text-slate-400">{desc}</p>
      </div>
    </div>
  )
}
