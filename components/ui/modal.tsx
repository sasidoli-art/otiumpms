'use client'

import { useEffect, useRef, useId, type ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useFocusTrap } from '@/hooks/use-focus-trap'

// ─── Props ──────────────────────────────────────────────────────────────────

interface Props {
  open: boolean
  onClose: () => void
  title?: string
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
  mobileSheet?: boolean
  footer?: ReactNode
  children: ReactNode
  className?: string
}

const SIZES: Record<string, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  full: 'max-w-[95vw]',
}

// ─── Component ──────────────────────────────────────────────────────────────

export function Modal({ open, onClose, title, size = 'md', mobileSheet, footer, children, className }: Props) {
  const contentRef = useRef<HTMLDivElement>(null)
  const titleId = useId()

  // Focus trap (handles Tab cycling + focus restore on close)
  useFocusTrap(contentRef, open)

  // Escape to close
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  // Lock body scroll
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
      return () => { document.body.style.overflow = '' }
    }
  }, [open])

  return (
    <AnimatePresence>
      {open && (
        <div className={cn(
          'fixed inset-0 z-[80]',
          mobileSheet
            ? 'flex items-end md:items-center md:justify-center md:p-4'
            : 'flex items-center justify-center p-4',
        )}>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Dialog */}
          <motion.div
            ref={contentRef}
            initial={mobileSheet ? { opacity: 0, y: 100 } : { opacity: 0, scale: 0.95 }}
            animate={mobileSheet ? { opacity: 1, y: 0 } : { opacity: 1, scale: 1 }}
            exit={mobileSheet ? { opacity: 0, y: 100 } : { opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className={cn(
              'relative w-full bg-[var(--bg-elevated)] shadow-[var(--shadow-xl)] border border-[var(--border-default)] overflow-hidden',
              mobileSheet
                ? 'rounded-t-[var(--radius-2xl)] md:rounded-[var(--radius-xl)] max-h-[85vh]'
                : 'rounded-[var(--radius-xl)]',
              mobileSheet ? cn('md:' + SIZES[size].replace('max-w-', 'max-w-')) : SIZES[size],
              !mobileSheet && SIZES[size],
              className,
            )}
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? titleId : undefined}
          >
            {/* Header */}
            {title && (
              <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border-default)]">
                <h2 id={titleId} className="text-base font-semibold text-[var(--text-primary)]">{title}</h2>
                <button onClick={onClose} className="btn-icon -mr-1" aria-label="Chiudi dialogo">
                  <X size={18} />
                </button>
              </div>
            )}

            {/* Body */}
            <div className="px-5 py-4 overflow-y-auto" style={{ maxHeight: '70vh' }}>
              {children}
            </div>

            {/* Footer */}
            {footer && (
              <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-[var(--border-default)] bg-[var(--bg-secondary)]">
                {footer}
              </div>
            )}

            {/* Close button (no title variant) */}
            {!title && (
              <button onClick={onClose} className="absolute top-3 right-3 btn-icon" aria-label="Chiudi dialogo">
                <X size={18} />
              </button>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
