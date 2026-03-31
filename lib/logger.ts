/**
 * Logger strutturato per Otium Week Gestionale.
 * In produzione ogni log include timestamp, livello e contesto.
 * Può essere esteso per inviare a un servizio esterno (Sentry, Datadog, ecc.).
 */

type LogLevel = 'info' | 'warn' | 'error'

function log(level: LogLevel, message: string, context?: string, data?: unknown): void {
  const timestamp = new Date().toISOString()
  const prefix = `[${timestamp}] [${level.toUpperCase()}]${context ? ` [${context}]` : ''}`

  if (level === 'error') {
    console.error(prefix, message, data !== undefined ? data : '')
  } else if (level === 'warn') {
    console.warn(prefix, message, data !== undefined ? data : '')
  } else {
    if (process.env.NODE_ENV !== 'production') {
      console.log(prefix, message, data !== undefined ? data : '')
    }
  }
}

export const logger = {
  info: (message: string, contextOrData?: string | Record<string, unknown>, data?: unknown) =>
    typeof contextOrData === 'string'
      ? log('info', message, contextOrData, data)
      : log('info', message, undefined, contextOrData),

  warn: (message: string, contextOrData?: string | Record<string, unknown>, data?: unknown) =>
    typeof contextOrData === 'string'
      ? log('warn', message, contextOrData, data)
      : log('warn', message, undefined, contextOrData),

  error: (message: string, contextOrData?: string | Record<string, unknown>, data?: unknown) =>
    typeof contextOrData === 'string'
      ? log('error', message, contextOrData, data)
      : log('error', message, undefined, contextOrData),
}
