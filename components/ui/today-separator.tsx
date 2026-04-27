/**
 * TodaySeparator — divisore "Oggi" usato in liste cronologiche.
 *
 *   <TodaySeparator />
 *   <TodaySeparator label="Domani — 22 apr" tone="upcoming" />
 *
 * Pattern chat-style: linea orizzontale neutra con label centrata. Tone
 * `today` ha un sottile bg primary-50 per attirare l'attenzione.
 *
 * Uso tipico: tra elementi passati e futuri di una timeline (calendario,
 * feed prenotazioni, log attività). Render condizionale su detection
 * lato consumer (es. `prev.dataArrivo < oggi && curr.dataArrivo >= oggi`).
 */
import { cn } from '@/lib/utils'

export type TodaySeparatorProps = {
  /** Etichetta — default "Oggi". */
  label?: string
  /** `today` (bg primary-50) | `default` (solo linea) */
  tone?: 'today' | 'default'
  className?: string
}

export function TodaySeparator({
  label = 'Oggi',
  tone = 'today',
  className,
}: TodaySeparatorProps) {
  const isToday = tone === 'today'
  return (
    <div
      role="separator"
      aria-label={label}
      className={cn(
        'relative flex items-center my-3',
        isToday && '-mx-2 px-2 py-1.5 bg-primary-50/60 dark:bg-primary-500/5 rounded-md',
        className,
      )}
    >
      <span className="flex-1 border-t border-neutral-200 dark:border-neutral-700" aria-hidden="true" />
      <span
        className={cn(
          'mx-3 text-[11px] font-semibold uppercase tracking-[0.04em] tabular-nums',
          isToday
            ? 'text-primary-700 dark:text-primary-400'
            : 'text-neutral-400',
        )}
      >
        {label}
      </span>
      <span className="flex-1 border-t border-neutral-200 dark:border-neutral-700" aria-hidden="true" />
    </div>
  )
}

export default TodaySeparator
