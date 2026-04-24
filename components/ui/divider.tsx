/**
 * Divider — linea orizzontale separatrice, con label opzionale centrata.
 *
 *   <Divider />
 *   <Divider spacing="lg" />
 *   <Divider label="oppure" />
 *   <Divider label="Dettagli avanzati" spacing="md" />
 *
 * Quando c'è una label, la linea passa dietro il testo e la label ha uno
 * sfondo `surface-primary` che la "taglia" otticamente.
 */
import { cn } from '@/lib/utils'

export type DividerSpacing = 'sm' | 'md' | 'lg'

export type DividerProps = {
  label?: string
  spacing?: DividerSpacing
  className?: string
}

const SPACING_CLASSES: Record<DividerSpacing, string> = {
  sm: 'my-2', // 8px
  md: 'my-4', // 16px
  lg: 'my-6', // 24px
}

export function Divider({ label, spacing = 'md', className }: DividerProps) {
  if (!label) {
    return (
      <hr
        aria-hidden="true"
        className={cn('border-0 border-t border-neutral-150', SPACING_CLASSES[spacing], className)}
      />
    )
  }

  return (
    <div
      role="separator"
      aria-label={label}
      className={cn('relative flex items-center', SPACING_CLASSES[spacing], className)}
    >
      <span className="flex-1 border-t border-neutral-150" aria-hidden="true" />
      <span className="px-3 text-[12px] leading-[1.4] text-neutral-400 bg-white">
        {label}
      </span>
      <span className="flex-1 border-t border-neutral-150" aria-hidden="true" />
    </div>
  )
}

export default Divider
