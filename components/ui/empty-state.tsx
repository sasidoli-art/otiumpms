import Link from 'next/link'
import { cn } from '@/lib/utils'
import {
  BookOpen, Users, Sparkles, Calendar, FileText, MessageSquare,
  Package, Wrench, Clock, Search, type LucideIcon,
} from 'lucide-react'

// ─── Icon registry ──────────────────────────────────────────────────────────

const ICONS: Record<string, LucideIcon> = {
  BookOpen, Users, Sparkles, Calendar, FileText, MessageSquare,
  Package, Wrench, Clock, Search,
}

// ─── Props ──────────────────────────────────────────────────────────────────

interface Props {
  icon?: string | LucideIcon
  titolo: string
  descrizione?: string
  azione?: {
    label: string
    href?: string
    onClick?: () => void
  }
  compact?: boolean
  className?: string
}

// ─── Component ──────────────────────────────────────────────────────────────

export function EmptyState({ icon, titolo, descrizione, azione, compact, className }: Props) {
  const Icon = typeof icon === 'string' ? (ICONS[icon] || Package) : (icon || Package)

  return (
    <div className={cn(
      'flex flex-col items-center text-center',
      compact ? 'py-8 gap-2' : 'py-14 gap-3',
      className,
    )}>
      <div className={cn(
        'rounded-2xl flex items-center justify-center',
        compact ? 'w-10 h-10' : 'w-14 h-14',
        'bg-[var(--bg-tertiary)]',
      )}>
        <Icon size={compact ? 20 : 24} className="text-[var(--text-tertiary)]" />
      </div>

      <div>
        <p className={cn(
          'font-semibold',
          compact ? 'text-sm' : 'text-base',
          'text-[var(--text-primary)]',
        )}>
          {titolo}
        </p>
        {descrizione && (
          <p className={cn(
            'mt-1 max-w-xs mx-auto',
            compact ? 'text-xs' : 'text-sm',
            'text-[var(--text-secondary)]',
          )}>
            {descrizione}
          </p>
        )}
      </div>

      {azione && (
        azione.href ? (
          <Link
            href={azione.href}
            className="btn-primary text-sm mt-1"
          >
            {azione.label}
          </Link>
        ) : (
          <button
            onClick={azione.onClick}
            className="btn-primary text-sm mt-1"
          >
            {azione.label}
          </button>
        )
      )}
    </div>
  )
}
