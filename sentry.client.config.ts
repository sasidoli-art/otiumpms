import * as Sentry from '@sentry/nextjs'

const release = process.env.NEXT_PUBLIC_COMMIT_SHA
  || process.env.VERCEL_GIT_COMMIT_SHA
  || undefined

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  release,
  environment: process.env.NEXT_PUBLIC_VERCEL_ENV ?? process.env.NODE_ENV,

  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // Session Replay: 10% delle sessioni, 100% su errore
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,

  integrations: [
    Sentry.replayIntegration({
      // Maschera testo per privacy — importante per PMS con dati ospiti
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],

  enabled: process.env.NODE_ENV === 'production',

  ignoreErrors: [
    'NEXT_NOT_FOUND',
    'NEXT_REDIRECT',
    'AbortError',
    'ResizeObserver loop',
    'Non-Error promise rejection captured',
    // Errori browser quirks / estensioni
    /^ChunkLoadError/,
    /Loading chunk \d+ failed/,
    /Network request failed/,
  ],

  beforeSend(event) {
    // In dev, log solo in console (enabled=false blocca comunque invio)
    return event
  },
})
