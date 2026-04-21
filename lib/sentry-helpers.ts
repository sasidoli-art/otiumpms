import * as Sentry from '@sentry/nextjs'

/**
 * Helper per arricchire il contesto Sentry con dati del tenant/utente.
 * Da chiamare dopo auth middleware nelle route API critiche per tracciare
 * quale host/user ha subito l'errore (senza inviare PII come email).
 */
export function setSentryUser(user: { id: string; role?: string; hostId?: string | null } | null) {
  if (!user) {
    Sentry.setUser(null)
    return
  }
  Sentry.setUser({
    id: user.id,
    // Non inviamo email/name per privacy; se serve usare `ip_address: '{{auto}}'`
  })
  Sentry.setTag('role', user.role ?? 'unknown')
  if (user.hostId) Sentry.setTag('host_id', user.hostId)
}

/**
 * Wrapper per tracciare errori in route handler con contesto esteso.
 */
export function captureRouteError(
  err: unknown,
  context: {
    route: string
    hostId?: string | null
    userId?: string | null
    extra?: Record<string, unknown>
  },
): void {
  Sentry.withScope((scope) => {
    scope.setTag('route', context.route)
    if (context.hostId) scope.setTag('host_id', context.hostId)
    if (context.userId) scope.setUser({ id: context.userId })
    if (context.extra) scope.setContext('extra', context.extra)
    Sentry.captureException(err)
  })
}

/**
 * Breadcrumb strutturato (es. "cron.email_automatiche.started").
 */
export function breadcrumb(message: string, category: string, data?: Record<string, unknown>): void {
  Sentry.addBreadcrumb({
    message,
    category,
    level: 'info',
    data,
  })
}
