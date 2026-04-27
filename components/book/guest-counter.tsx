'use client'

/**
 * GuestCounter — stepper per adulti + bambini.
 *
 * Touch target 32px per i bottoni ±. Numero centrale tabular-nums per non
 * shiftare la riga al cambio. Min/max configurabili per supportare camere
 * piu` capienti.
 */
import { Minus, Plus, User, Baby } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface GuestCounterValue {
  adulti: number
  bambini: number
}

export interface GuestCounterProps {
  value: GuestCounterValue
  onChange: (v: GuestCounterValue) => void
  minAdulti?: number     // default 1
  maxAdulti?: number     // default 10
  maxBambini?: number    // default 8
  className?: string
}

export function GuestCounter({
  value,
  onChange,
  minAdulti = 1,
  maxAdulti = 10,
  maxBambini = 8,
  className,
}: GuestCounterProps) {
  return (
    <div className={cn('space-y-3', className)}>
      <Riga
        label="Adulti"
        sublabel="Da 18 anni"
        icon={User}
        value={value.adulti}
        min={minAdulti}
        max={maxAdulti}
        onChange={(adulti) => onChange({ ...value, adulti })}
      />
      <Riga
        label="Bambini"
        sublabel="0-17 anni"
        icon={Baby}
        value={value.bambini}
        min={0}
        max={maxBambini}
        onChange={(bambini) => onChange({ ...value, bambini })}
      />
    </div>
  )
}

// ───────────────────────────────────────────────────────────────────────────

function Riga({
  label, sublabel, icon: Icon, value, min, max, onChange,
}: {
  label: string
  sublabel: string
  icon: typeof User
  value: number
  min: number
  max: number
  onChange: (n: number) => void
}) {
  const dec = () => value > min && onChange(value - 1)
  const inc = () => value < max && onChange(value + 1)

  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-3 min-w-0">
        <div className="shrink-0 w-9 h-9 rounded-lg bg-neutral-100 flex items-center justify-center">
          <Icon className="w-4 h-4 text-neutral-600" />
        </div>
        <div className="min-w-0">
          <div className="text-[14px] font-medium text-neutral-900">{label}</div>
          <div className="text-[12px] text-neutral-500">{sublabel}</div>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={dec}
          disabled={value <= min}
          aria-label={`Diminuisci ${label.toLowerCase()}`}
          className={cn(
            'w-8 h-8 rounded-full border border-neutral-200 flex items-center justify-center',
            'transition-colors',
            value > min
              ? 'hover:bg-primary-50 hover:border-primary-300 text-neutral-700'
              : 'text-neutral-300 cursor-not-allowed',
          )}
        >
          <Minus className="w-3.5 h-3.5" />
        </button>
        <span className="min-w-[28px] text-center text-[16px] font-semibold tabular-nums text-neutral-900">
          {value}
        </span>
        <button
          type="button"
          onClick={inc}
          disabled={value >= max}
          aria-label={`Aumenta ${label.toLowerCase()}`}
          className={cn(
            'w-8 h-8 rounded-full border border-neutral-200 flex items-center justify-center',
            'transition-colors',
            value < max
              ? 'hover:bg-primary-50 hover:border-primary-300 text-neutral-700'
              : 'text-neutral-300 cursor-not-allowed',
          )}
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}
