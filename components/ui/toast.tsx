'use client'

import { Toaster as SonnerToaster } from 'sonner'

/**
 * Toast provider — place in root layout.
 *
 * Renders the sonner Toaster with Otium design system styling.
 * Position: bottom-right desktop, bottom-center mobile.
 * Max 3 visible toasts.
 */
export function ToastProvider() {
  return (
    <SonnerToaster
      position="bottom-right"
      expand={false}
      visibleToasts={3}
      richColors
      toastOptions={{
        className: 'otium-toast',
        style: {
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-lg)',
          border: '1px solid var(--border-default)',
          background: 'var(--bg-elevated)',
          color: 'var(--text-primary)',
          fontSize: '14px',
        },
      }}
      offset={16}
      closeButton
    />
  )
}
