'use client'

/**
 * PriceSummary — card riepilogo prezzo con breakdown (sticky-friendly).
 *
 * Componente puro: riceve dati gia` calcolati. Nessuna fetch interna.
 * Usato dagli step di camere/SPA/ristorante per mostrare il subtotale
 * mentre l'ospite compila il flow.
 *
 * Stato vuoto: mostra messaggio invece del breakdown.
 */
import { cn } from '@/lib/utils'
import { formatValuta } from '@/lib/formatters'

export interface PriceSummaryRiga {
  label: string                  // "3 notti × €80"
  importo: number                // 240 (positivo) o -24 (sconto)
  highlight?: 'sconto' | 'tassa' // styling speciale
  hint?: string                  // "Alta stagione"
}

export interface PriceSummaryProps {
  intestazione?: {
    titolo: string               // "Suite Deluxe"
    sottotitolo?: string         // "21 apr → 24 apr · 3 notti"
    immagine?: string | null
  }
  righe: PriceSummaryRiga[]
  totale: number
  valuta?: string                // default "EUR"
  emptyMessage?: string          // se righe vuote
  className?: string
  sticky?: boolean               // bottom 80px su mobile
}

export function PriceSummary({
  intestazione,
  righe,
  totale,
  emptyMessage = 'Seleziona date e camera',
  className,
  sticky,
}: PriceSummaryProps) {
  const isEmpty = righe.length === 0

  return (
    <div
      className={cn(
        'bg-white border border-neutral-150 rounded-xl shadow-card overflow-hidden',
        'border-t-[3px] border-t-primary-500',
        sticky && 'sticky bottom-20 lg:bottom-0 lg:top-4',
        className,
      )}
    >
      {/* Intestazione */}
      {intestazione && (
        <div className="flex items-center gap-3 px-4 py-3 border-b border-neutral-150">
          {intestazione.immagine && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={intestazione.immagine}
              alt=""
              className="w-10 h-10 rounded-md object-cover shrink-0"
            />
          )}
          <div className="min-w-0">
            <div className="text-[14px] font-semibold text-neutral-900 truncate">
              {intestazione.titolo}
            </div>
            {intestazione.sottotitolo && (
              <div className="text-[12px] text-neutral-500 truncate">
                {intestazione.sottotitolo}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Body */}
      {isEmpty ? (
        <div className="px-4 py-8 text-center text-[13px] text-neutral-500">
          {emptyMessage}
        </div>
      ) : (
        <div className="px-4 py-3 space-y-2">
          {righe.map((r, i) => (
            <div key={i} className="flex items-baseline justify-between gap-3">
              <div className="min-w-0 text-[13px] text-neutral-600">
                <span className="truncate">{r.label}</span>
                {r.hint && (
                  <span className="ml-1.5 text-[11px] text-neutral-400">· {r.hint}</span>
                )}
              </div>
              <span
                className={cn(
                  'text-[13px] font-medium tabular-nums tracking-tight shrink-0',
                  r.highlight === 'sconto' && 'text-success-700',
                  r.highlight === 'tassa' && 'text-neutral-500',
                  !r.highlight && 'text-neutral-900',
                )}
              >
                {r.importo < 0 ? '−' : ''}{formatValuta(Math.abs(r.importo))}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Totale */}
      {!isEmpty && (
        <div className="px-4 py-3 border-t border-neutral-150 flex items-baseline justify-between gap-3 bg-neutral-50/50">
          <span className="text-[15px] font-semibold text-neutral-900">Totale</span>
          <span className="text-[20px] font-bold text-primary-700 tabular-nums tracking-tight">
            {formatValuta(totale)}
          </span>
        </div>
      )}
    </div>
  )
}
