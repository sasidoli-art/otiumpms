'use client'

import { AlertTriangle, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Modal } from './modal'

interface Props {
  open: boolean
  onClose: () => void
  onConfirm: () => void | Promise<void>
  title: string
  description?: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'danger' | 'default'
  loading?: boolean
}

export function ConfirmDialog({
  open, onClose, onConfirm, title, description,
  confirmLabel = 'Conferma', cancelLabel = 'Annulla',
  variant = 'default', loading,
}: Props) {
  const isDanger = variant === 'danger'

  return (
    <Modal open={open} onClose={onClose} size="sm">
      <div className="flex flex-col items-center text-center gap-4 py-2">
        {/* Icon */}
        <div className={cn(
          'w-12 h-12 rounded-full flex items-center justify-center',
          isDanger ? 'bg-red-100 dark:bg-red-950/30' : 'bg-brand-100 dark:bg-brand-950/30',
        )}>
          <AlertTriangle size={22} className={isDanger ? 'text-red-500' : 'text-brand-500'} />
        </div>

        {/* Text */}
        <div>
          <h3 className="text-base font-semibold text-[var(--text-primary)]">{title}</h3>
          {description && (
            <p className="text-sm text-[var(--text-secondary)] mt-1.5 max-w-xs mx-auto">
              {description}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2 w-full mt-1">
          <button
            onClick={onClose}
            disabled={loading}
            className="btn-secondary flex-1"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={cn(
              'flex-1 flex items-center justify-center gap-2',
              isDanger ? 'btn-danger' : 'btn-primary',
            )}
          >
            {loading ? (
              <><Loader2 size={14} className="animate-spin" /> Attendi...</>
            ) : (
              confirmLabel
            )}
          </button>
        </div>
      </div>
    </Modal>
  )
}
