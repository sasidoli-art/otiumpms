import * as Sentry from '@sentry/nextjs'

const release = process.env.VERCEL_GIT_COMMIT_SHA
  || process.env.NEXT_PUBLIC_COMMIT_SHA
  || undefined

// Percorsi e chiavi da non tracciare (PII / rumore)
const IGNORE_URL_PATTERNS = [
  /_next\/static\//,
  /favicon\.ico/,
  /\/api\/auth\/session/,
]

const PII_KEYS = /password|token|secret|authorization|cookie|api[_-]?key|smtp|sdi/i
// Chiavi ospite da scrubbare nei breadcrumbs `data` (GDPR — no nome/telefono nei logs)
const GUEST_PII_KEYS = /^guest(Nome|Cognome|Email|Telefono|DataNascita|NumeroDocumento|CodiceFiscale)$/

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  release,
  environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV,

  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // Performance sampling piu` aggressivo per cron/webhook (diagnosi incident)
  tracesSampler: (ctx) => {
    const name = ctx.transactionContext?.name ?? ''
    if (name.includes('/api/cron/')) return 1.0
    if (name.includes('/api/webhooks/')) return 0.5
    if (process.env.NODE_ENV !== 'production') return 1.0
    return 0.1
  },

  enabled: process.env.NODE_ENV === 'production',

  // Scrub PII prima di inviare (email/numeri/cf/secret)
  beforeSend(event) {
    if (event.request) {
      // Scrub URL query string
      if (event.request.url) {
        try {
          const u = new URL(event.request.url)
          if (IGNORE_URL_PATTERNS.some((p) => p.test(u.pathname))) return null
          u.searchParams.forEach((_, key) => {
            if (PII_KEYS.test(key)) u.searchParams.set(key, '[scrubbed]')
          })
          event.request.url = u.toString()
        } catch { /* noop */ }
      }
      // Scrub headers
      if (event.request.headers) {
        for (const k of Object.keys(event.request.headers)) {
          if (PII_KEYS.test(k)) event.request.headers[k] = '[scrubbed]'
        }
      }
      // Rimuovi body (puo` contenere PII/secret)
      delete event.request.data
    }

    // Scrub breadcrumbs con URL sensibili + scrub PII ospite nei data
    if (event.breadcrumbs) {
      event.breadcrumbs = event.breadcrumbs
        .filter((b) => {
          const url = b.data?.url
          if (typeof url === 'string' && IGNORE_URL_PATTERNS.some((p) => p.test(url))) return false
          return true
        })
        .map((b) => {
          if (b.data && typeof b.data === 'object') {
            const cleaned: Record<string, unknown> = {}
            for (const [k, v] of Object.entries(b.data)) {
              cleaned[k] = GUEST_PII_KEYS.test(k) || PII_KEYS.test(k) ? '[scrubbed]' : v
            }
            return { ...b, data: cleaned }
          }
          return b
        })
    }

    return event
  },

  ignoreErrors: [
    // Errori noti non-bloccanti
    'NEXT_NOT_FOUND',
    'NEXT_REDIRECT',
    'AbortError',
    'ResizeObserver loop',
  ],
})
