'use client'

import { useState, type ReactNode } from 'react'
import { Check, AlertTriangle, AlertCircle, Info, X } from 'lucide-react'
import { cn } from '@/lib/utils'

type Variant = 'success' | 'warning' | 'error' | 'info'

const CONFIG: Record<Variant, { icon: typeof Info; bg: string; border: string; text: string; iconColor: string }> = {
  success: {
    icon: Check,
    bg: 'bg-emerald-50 dark:bg-emerald-950/20',
    border: 'border-l-emerald-500',
    text: 'text-emerald-800 dark:text-emerald-300',
    iconColor: 'text-emerald-500',
  },
  warning: {
    icon: AlertTriangle,
    bg: 'bg-amber-50 dark:bg-amber-950/20',
    border: 'border-l-amber-500',
    text: 'text-amber-800 dark:text-amber-300',
    iconColor: 'text-amber-500',
  },
  error: {
    icon: AlertCircle,
    bg: 'bg-red-50 dark:bg-red-950/20',
    border: 'border-l-red-500',
    text: 'text-red-800 dark:text-red-300',
    iconColor: 'text-red-500',
  },
  info: {
    icon: Info,
    bg: 'bg-blue-50 dark:bg-blue-950/20',
    border: 'border-l-blue-500',
    text: 'text-blue-800 dark:text-blue-300',
    iconColor: 'text-blue-500',
  },
}

interface Props {
  variant: Variant
  title?: string
  children: ReactNode
  dismissible?: boolean
  action?: { label: string; onClick: () => void }
  className?: string
}

export function InlineAlert({ variant, title, children, dismissible, action, className }: Props) {
  const [visible, setVisible] = useState(true)
  if (!visible) return null

  const c = CONFIG[variant]
  const Icon = c.icon

  return (
    <div className={cn(
      'flex gap-3 px-4 py-3 rounded-[var(--radius-lg)] border-l-[3px]',
      c.bg, c.border,
      className,
    )}>
      <Icon size={18} className={cn(c.iconColor, 'shrink-0 mt-0.5')} />
      <div className="flex-1 min-w-0">
        {title && (
          <p className={cn('text-sm font-semibold', c.text)}>{title}</p>
        )}
        <div className={cn('text-sm', c.text, title && 'mt-0.5')}>
          {children}
        </div>
        {action && (
          <button
            onClick={action.onClick}
            className={cn('text-sm font-semibold mt-2 hover:underline', c.text)}
          >
            {action.label}
          </button>
        )}
      </div>
      {dismissible && (
        <button
          onClick={() => setVisible(false)}
          className={cn('shrink-0 p-0.5 rounded hover:bg-black/5 dark:hover:bg-white/5 transition-colors', c.iconColor)}
          aria-label="Chiudi"
        >
          <X size={14} />
        </button>
      )}
    </div>
  )
}
