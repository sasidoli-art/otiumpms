/**
 * Token chart per Recharts — light + dark mode.
 *
 * Recharts non legge CSS variables runtime (i prop `stroke`/`fill` sono
 * valutati al render, non come token CSS). Per supportare dark mode i chart
 * devono ricevere hex differenti.
 *
 * Uso (componente client):
 *   const tokens = useChartTokens()       // → light o dark in base a html.dark
 *   <Line stroke={tokens.colors.primary} />
 *   <CartesianGrid stroke={tokens.style.gridStroke} />
 *
 * Le constanti `CHART_*` (light) restano export-named per back-compat
 * con codice che le usa direttamente senza hook.
 */
'use client'

import { useEffect, useState } from 'react'

// ────────────────────────────────────────────────────────────────────────────
// Light mode (default — back-compat exports)
// ────────────────────────────────────────────────────────────────────────────

/** Palette categorica per `dataKey` multipli — light. */
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

/** Colori semantici per chart — light. */
export const CHART_COLORS = {
  primary:  '#6366f1',
  accent:   '#f59e0b',
  success:  '#10b981',
  warning:  '#f59e0b',
  error:    '#ef4444',
  neutral:  '#a8a29e',
  /** Periodo precedente / baseline (de-emphasize) */
  previous: '#d1d5db',
} as const

/** Stili comuni Cartesian/Pie/Radial — light. */
export const CHART_STYLE = {
  gridStroke:    '#e5e7eb',
  axisStroke:    '#a8a29e',
  axisFontSize:  11,
  tooltipBg:     '#ffffff',
  tooltipBorder: '#e5e7eb',
  tooltipText:   '#1c1917',
  tooltipRadius: 8,
} as const

// ────────────────────────────────────────────────────────────────────────────
// Dark mode — palette saturata + stroke più chiari per contrasto
// ────────────────────────────────────────────────────────────────────────────

export const CHART_PALETTE_DARK = [
  '#818cf8', // primary indigo (lighter)
  '#fbbf24', // amber (lighter)
  '#34d399', // success
  '#f87171', // error
  '#a78bfa', // purple
  '#22d3ee', // teal
  '#f472b6', // pink
  '#a3e635', // lime
] as const

export const CHART_COLORS_DARK = {
  primary:  '#818cf8',
  accent:   '#fbbf24',
  success:  '#34d399',
  warning:  '#fbbf24',
  error:    '#f87171',
  neutral:  '#78716c',
  previous: '#44403c',
} as const

export const CHART_STYLE_DARK = {
  gridStroke:    '#44403c',  // neutral-700
  axisStroke:    '#78716c',  // neutral-500
  axisFontSize:  11,
  tooltipBg:     '#1c1917',  // neutral-900
  tooltipBorder: '#44403c',
  tooltipText:   '#fafaf9',
  tooltipRadius: 8,
} as const

// ────────────────────────────────────────────────────────────────────────────
// Hook: ritorna i token correnti in base a html.dark
// ────────────────────────────────────────────────────────────────────────────

export type ChartColors = {
  primary:  string
  accent:   string
  success:  string
  warning:  string
  error:    string
  neutral:  string
  previous: string
}
export type ChartStyle = {
  gridStroke:    string
  axisStroke:    string
  axisFontSize:  number
  tooltipBg:     string
  tooltipBorder: string
  tooltipText:   string
  tooltipRadius: number
}
export type ChartTokens = {
  palette: readonly string[]
  colors: ChartColors
  style: ChartStyle
}

const LIGHT_TOKENS: ChartTokens = {
  palette: CHART_PALETTE,
  colors: CHART_COLORS,
  style: CHART_STYLE,
}
const DARK_TOKENS: ChartTokens = {
  palette: CHART_PALETTE_DARK,
  colors: CHART_COLORS_DARK,
  style: CHART_STYLE_DARK,
}

/**
 * Hook reactive: ritorna LIGHT_TOKENS o DARK_TOKENS in base alla
 * presenza della classe `dark` su `<html>`. Si re-renderizza quando
 * il tema cambia (MutationObserver su documentElement.class).
 *
 * Usa questo dentro componenti chart per supportare dark mode.
 */
export function useChartTokens(): ChartTokens {
  const [isDark, setIsDark] = useState(() => {
    if (typeof document === 'undefined') return false
    return document.documentElement.classList.contains('dark')
  })

  useEffect(() => {
    const html = document.documentElement
    const observer = new MutationObserver(() => {
      setIsDark(html.classList.contains('dark'))
    })
    observer.observe(html, { attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [])

  return isDark ? DARK_TOKENS : LIGHT_TOKENS
}

/** Helper: prendi N colori dalla palette in modo stabile. */
export function chartColors(n: number, dark = false): string[] {
  const palette = dark ? CHART_PALETTE_DARK : CHART_PALETTE
  return Array.from({ length: n }, (_, i) => palette[i % palette.length])
}
