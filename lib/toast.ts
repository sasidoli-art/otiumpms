import { toast as sonner } from 'sonner'

/**
 * Unified toast API wrapping sonner.
 *
 * Usage:
 *   import { toast } from '@/lib/toast'
 *   toast.success('Prenotazione confermata')
 *   toast.error('Errore nel salvataggio')
 *   toast.promise(saveData(), { loading: '...', success: '...', error: '...' })
 */

interface ToastAction {
  label: string
  onClick: () => void
}

function success(message: string, action?: ToastAction) {
  sonner.success(message, {
    duration: 4000,
    ...(action && { action: { label: action.label, onClick: action.onClick } }),
  })
}

function error(message: string, action?: ToastAction) {
  sonner.error(message, {
    duration: 6000,
    ...(action && { action: { label: action.label, onClick: action.onClick } }),
  })
}

function warning(message: string, action?: ToastAction) {
  sonner.warning(message, {
    duration: 6000,
    ...(action && { action: { label: action.label, onClick: action.onClick } }),
  })
}

function info(message: string, action?: ToastAction) {
  sonner.info(message, {
    duration: 4000,
    ...(action && { action: { label: action.label, onClick: action.onClick } }),
  })
}

function loading(message: string) {
  return sonner.loading(message)
}

function dismiss(id?: string | number) {
  sonner.dismiss(id)
}

function promise<T>(
  p: Promise<T>,
  messages: { loading: string; success: string; error: string },
) {
  return sonner.promise(p, {
    loading: messages.loading,
    success: messages.success,
    error: messages.error,
  })
}

export const toast = {
  success,
  error,
  warning,
  info,
  loading,
  dismiss,
  promise,
}
