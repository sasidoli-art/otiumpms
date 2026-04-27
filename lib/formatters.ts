/**
 * Formatters — locale `it-IT` per ogni dato visualizzato all'utente.
 *
 * Convenzioni:
 *   - Valute: "€1.234,56" (Intl.NumberFormat IT)
 *   - Date "short": "21 apr 2026"   →  formatData(d)
 *   - Date "long":  "Mercoledì 21 aprile 2026" → formatDataLunga(d)
 *   - Date "relative": "2 min fa" / "ieri" / "3 giorni fa"
 *   - Ore: "14:30" (24h)
 *   - Percentuali: "78%" (no decimali se intero, max 1 decimale)
 *   - Numeri: "1.234"
 *   - Durate: "1h 20min", "45min", "3h"
 *
 * I formatter di lib/utils.ts sono re-esportati qui per centralizzare
 * l'import (`import { formatValuta } from '@/lib/formatters'`). Lib/utils
 * mantiene gli alias per back-compat — 21 file esistenti continuano a
 * funzionare.
 */
import { format, formatDistanceToNow } from 'date-fns'
import { it } from 'date-fns/locale'

// ────────────────────────────────────────────────────────────────────────────
// Valute
// ────────────────────────────────────────────────────────────────────────────

const EUR = new Intl.NumberFormat('it-IT', {
  style: 'currency',
  currency: 'EUR',
})

const EUR_NO_DECIMALS = new Intl.NumberFormat('it-IT', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
})

/** "€1.234,56" — formato italiano standard. */
export function formatValuta(amount: number | null | undefined): string {
  if (amount == null || Number.isNaN(amount)) return '—'
  return EUR.format(amount)
}

/** "€1.234" — senza decimali, per importi grandi/arrotondati. */
export function formatValutaCompatta(amount: number | null | undefined): string {
  if (amount == null || Number.isNaN(amount)) return '—'
  return EUR_NO_DECIMALS.format(amount)
}

// ────────────────────────────────────────────────────────────────────────────
// Date
// ────────────────────────────────────────────────────────────────────────────

type DateInput = Date | string | number | null | undefined

function toDate(d: DateInput): Date | null {
  if (d == null) return null
  const dt = d instanceof Date ? d : new Date(d)
  return Number.isNaN(dt.getTime()) ? null : dt
}

/**
 * Formatta una data secondo lo stile richiesto.
 *
 *   formatData(d)             → "21 apr 2026"   (default 'short')
 *   formatData(d, 'long')     → "Mercoledì 21 aprile 2026"
 *   formatData(d, 'relative') → "2 min fa" / "ieri"
 *   formatData(d, 'iso')      → "2026-04-21" (per query string / API)
 *   formatData(d, 'time')     → "14:30"
 *   formatData(d, 'datetime') → "21 apr 2026, 14:30"
 */
export function formatData(
  d: DateInput,
  variant: 'short' | 'long' | 'relative' | 'iso' | 'time' | 'datetime' = 'short',
): string {
  const dt = toDate(d)
  if (!dt) return '—'

  switch (variant) {
    case 'short':    return format(dt, 'd LLL yyyy', { locale: it })           // "21 apr 2026"
    case 'long':     return capitalize(format(dt, 'EEEE d LLLL yyyy', { locale: it })) // "Mercoledì 21 aprile 2026"
    case 'relative': return formatDistanceToNow(dt, { addSuffix: true, locale: it })
    case 'iso':      return format(dt, 'yyyy-MM-dd')
    case 'time':     return format(dt, 'HH:mm')
    case 'datetime': return format(dt, 'd LLL yyyy, HH:mm', { locale: it })
  }
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

// ────────────────────────────────────────────────────────────────────────────
// Numeri / percentuali / durate
// ────────────────────────────────────────────────────────────────────────────

const NUM = new Intl.NumberFormat('it-IT')

/** "1.234" — separatore migliaia italiano. */
export function formatNumero(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return '—'
  return NUM.format(n)
}

/**
 * "78%" — interi diretti, decimali con max 1 cifra dopo la virgola.
 *   formatPercentuale(78)      → "78%"
 *   formatPercentuale(78.4567) → "78,5%"
 *   formatPercentuale(0.78, { fromUnit: true }) → "78%"
 */
export function formatPercentuale(
  value: number | null | undefined,
  opts: { fromUnit?: boolean; decimali?: number } = {},
): string {
  if (value == null || Number.isNaN(value)) return '—'
  const v = opts.fromUnit ? value * 100 : value
  const dec = opts.decimali ?? (Number.isInteger(v) ? 0 : 1)
  const fmt = new Intl.NumberFormat('it-IT', {
    minimumFractionDigits: dec,
    maximumFractionDigits: dec,
  })
  return `${fmt.format(v)}%`
}

/**
 * Durata in minuti → stringa human-readable.
 *   formatDurata(30)  → "30min"
 *   formatDurata(60)  → "1h"
 *   formatDurata(80)  → "1h 20min"
 *   formatDurata(180) → "3h"
 */
export function formatDurata(minuti: number | null | undefined): string {
  if (minuti == null || Number.isNaN(minuti) || minuti < 0) return '—'
  if (minuti < 60) return `${Math.round(minuti)}min`
  const h = Math.floor(minuti / 60)
  const m = Math.round(minuti - h * 60)
  if (m === 0) return `${h}h`
  return `${h}h ${m}min`
}

// ────────────────────────────────────────────────────────────────────────────
// Truncation
// ────────────────────────────────────────────────────────────────────────────

/** Tronca preservando ellissi a fine. `null` se input vuoto. */
export function truncate(s: string | null | undefined, max: number): string {
  if (!s) return ''
  if (s.length <= max) return s
  return s.slice(0, Math.max(0, max - 1)).trimEnd() + '…'
}

/** Tronca un nome a 25 char (default). */
export function truncateNome(s: string | null | undefined, max = 25): string {
  return truncate(s, max)
}

/** Tronca un'email a 30 char preservando il dominio quando possibile. */
export function truncateEmail(s: string | null | undefined, max = 30): string {
  if (!s) return ''
  if (s.length <= max) return s
  const at = s.indexOf('@')
  if (at < 0) return truncate(s, max)
  const domain = s.slice(at) // include "@"
  // Se il dominio da solo è già lungo, fai un truncate semplice
  if (domain.length >= max - 3) return truncate(s, max)
  const localBudget = max - domain.length - 1 // -1 per ellissi
  return s.slice(0, Math.max(1, localBudget)) + '…' + domain
}
