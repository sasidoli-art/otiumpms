/**
 * Token chart per Recharts.
 *
 * Recharts non legge CSS variables runtime (i prop `stroke`/`fill` sono
 * valutati al render, non come token CSS). Per evitare che ogni chart
 * usi hex random e per supportare un futuro dark mode chart-aware,
 * centralizziamo qui i token.
 *
 * Migration: tutti i grafici del progetto importano da qui invece di
 * usare hex inline.
 */

/** Palette categorica (per `dataKey` multipli — line/bar/area chart). */
export const CHART_PALETTE = [
  '#6366f1', // primary indigo
  '#f59e0b', // accent amber
  '#10b981', // success
  '#ef4444', // error
  '#8b5cf6', // purple
  '#06b6d4', // teal
  '#ec4899', // pink
  '#84cc16', // lime
] as const

/** Colori semantici per chart (positivo, negativo, neutro). */
export const CHART_COLORS = {
  primary:  '#6366f1', // serie principale
  accent:   '#f59e0b', // serie comparativa
  success:  '#10b981', // crescita / positivo
  warning:  '#f59e0b',
  error:    '#ef4444', // calo / negativo
  neutral:  '#a8a29e', // serie passata / baseline
  /** Anno scorso / periodo precedente (grigio chiaro per de-emphasize) */
  previous: '#d1d5db',
} as const

/** Stili comuni a Cartesian/Pie/Radial chart. */
export const CHART_STYLE = {
  /** Griglia di sfondo */
  gridStroke:    '#e5e7eb',
  /** Asse X/Y */
  axisStroke:    '#a8a29e',
  axisFontSize:  11,
  /** Tooltip card */
  tooltipBg:     '#ffffff',
  tooltipBorder: '#e5e7eb',
  tooltipRadius: 8,
} as const

/** Helper: prendi N colori dalla palette in modo stabile. */
export function chartColors(n: number): string[] {
  return Array.from({ length: n }, (_, i) => CHART_PALETTE[i % CHART_PALETTE.length])
}
