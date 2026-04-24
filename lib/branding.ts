/**
 * Sistema white-label per le booking engine pubbliche (/book/[strutturaId]/*).
 *
 * Trasforma i campi branding della `Struttura` in:
 *  1. `BrandTheme` — oggetto normalizzato con tutti i default applicati
 *  2. CSS custom properties — iniettate come `style` sul container root
 *
 * Uso tipico:
 *   const theme = getBrandTheme(struttura, host)
 *   const cssVars = brandThemeToCssVars(theme)
 *   <div style={cssVars}>...</div>
 *
 * I componenti figli consumano le variabili via:
 *   <button style={{ background: 'var(--brand-primary)', color: 'var(--brand-on-primary)' }}>
 *
 * NB: i campi `coloreSfondo`, `coloreTesto`, `fontFamily`, `borderRadius` non sono
 *     ancora presenti nello schema Prisma — attualmente si usano sempre i default.
 *     Quando verranno aggiunti come colonne opzionali su `Struttura`, basterà
 *     estendere `BrandingStrutturaInput` e la select in `get-struttura-pubblica.ts`.
 */

// ───────────────────────────────────────────────────────────────────────────
// Tipi
// ───────────────────────────────────────────────────────────────────────────

export type BrandTheme = {
  colorePrimario: string // hex
  coloreSecondario: string // hex
  coloreSfondo: string // hex (default: #ffffff)
  coloreTesto: string // hex (default: #18181b)
  fontFamily: string // default: 'Inter, system-ui, sans-serif'
  borderRadius: string // default: '8px'
  logo: string | null // URL
  fotoHero: string | null // URL
  nomeStruttura: string
}

/**
 * Input minimale per `getBrandTheme` — sottoinsieme dei campi `Struttura`.
 * Usiamo un tipo strutturale così da essere compatibili sia con il modello
 * Prisma completo sia con `StrutturaPubblica` (versione ridotta SELECT).
 */
export type BrandingStrutturaInput = {
  nome: string
  logo?: string | null
  fotoHero?: string | null
  colorePrimario?: string | null
  coloreSecondario?: string | null
  // Campi futuri (non ancora nello schema): usano default se non presenti
  coloreSfondo?: string | null
  coloreTesto?: string | null
  fontFamily?: string | null
  borderRadius?: string | null
}

export type BrandingHostInput = {
  logo?: string | null
}

// ───────────────────────────────────────────────────────────────────────────
// Default (fallback quando i campi sono null o non forniti)
// ───────────────────────────────────────────────────────────────────────────

const DEFAULTS = {
  colorePrimario: '#6366f1',
  coloreSecondario: '#818cf8',
  coloreSfondo: '#ffffff',
  coloreTesto: '#18181b',
  fontFamily: 'Inter, system-ui, sans-serif',
  borderRadius: '8px',
} as const

// ───────────────────────────────────────────────────────────────────────────
// API principale
// ───────────────────────────────────────────────────────────────────────────

export function getBrandTheme(
  struttura: BrandingStrutturaInput,
  host?: BrandingHostInput,
): BrandTheme {
  return {
    colorePrimario: struttura.colorePrimario || DEFAULTS.colorePrimario,
    coloreSecondario: struttura.coloreSecondario || DEFAULTS.coloreSecondario,
    coloreSfondo: struttura.coloreSfondo || DEFAULTS.coloreSfondo,
    coloreTesto: struttura.coloreTesto || DEFAULTS.coloreTesto,
    fontFamily: struttura.fontFamily || DEFAULTS.fontFamily,
    borderRadius: struttura.borderRadius || DEFAULTS.borderRadius,
    logo: struttura.logo || host?.logo || null,
    fotoHero: struttura.fotoHero ?? null,
    nomeStruttura: struttura.nome,
  }
}

/**
 * Genera il record di CSS custom properties dal tema.
 * Ritorna stringa-keyed object compatibile con `React.CSSProperties` tramite cast.
 */
export function brandThemeToCssVars(theme: BrandTheme): Record<string, string> {
  const primaryHSL = hexToHSL(theme.colorePrimario)

  return {
    '--brand-primary': theme.colorePrimario,
    '--brand-primary-light': hslToHex(
      primaryHSL.h,
      primaryHSL.s,
      Math.min(primaryHSL.l + 30, 95),
    ),
    '--brand-primary-dark': hslToHex(
      primaryHSL.h,
      primaryHSL.s,
      Math.max(primaryHSL.l - 15, 20),
    ),
    '--brand-secondary': theme.coloreSecondario,
    '--brand-bg': theme.coloreSfondo,
    '--brand-text': theme.coloreTesto,
    '--brand-font': theme.fontFamily,
    '--brand-radius': theme.borderRadius,
    '--brand-on-primary': getContrastColor(theme.colorePrimario),
  }
}

// ───────────────────────────────────────────────────────────────────────────
// Color utilities
// ───────────────────────────────────────────────────────────────────────────

/**
 * Calcola se il testo su un colore dovrebbe essere bianco o nero (WCAG-ish).
 * Usa la luminanza percepita (coefficienti YIQ).
 */
function getContrastColor(hexColor: string): string {
  const { r, g, b } = hexToRgb(hexColor)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return luminance > 0.5 ? '#18181b' : '#ffffff'
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const clean = normalizeHex(hex)
  return {
    r: parseInt(clean.slice(1, 3), 16),
    g: parseInt(clean.slice(3, 5), 16),
    b: parseInt(clean.slice(5, 7), 16),
  }
}

/** Normalizza `#abc` -> `#aabbcc`. Se input invalido, fallback al default primario. */
function normalizeHex(hex: string): string {
  if (!hex || typeof hex !== 'string') return DEFAULTS.colorePrimario
  let h = hex.trim()
  if (!h.startsWith('#')) h = '#' + h
  if (h.length === 4) {
    // #abc -> #aabbcc
    h = '#' + h[1]! + h[1]! + h[2]! + h[2]! + h[3]! + h[3]!
  }
  if (!/^#[0-9a-fA-F]{6}$/.test(h)) return DEFAULTS.colorePrimario
  return h.toLowerCase()
}

export function hexToHSL(hex: string): { h: number; s: number; l: number } {
  const { r, g, b } = hexToRgb(hex)
  const rn = r / 255
  const gn = g / 255
  const bn = b / 255
  const max = Math.max(rn, gn, bn)
  const min = Math.min(rn, gn, bn)
  const delta = max - min

  let h = 0
  if (delta !== 0) {
    if (max === rn) h = ((gn - bn) / delta) % 6
    else if (max === gn) h = (bn - rn) / delta + 2
    else h = (rn - gn) / delta + 4
    h = Math.round(h * 60)
    if (h < 0) h += 360
  }

  const l = (max + min) / 2
  const s = delta === 0 ? 0 : delta / (1 - Math.abs(2 * l - 1))

  return { h, s: Math.round(s * 100), l: Math.round(l * 100) }
}

export function hslToHex(h: number, s: number, l: number): string {
  const sN = s / 100
  const lN = l / 100
  const c = (1 - Math.abs(2 * lN - 1)) * sN
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = lN - c / 2

  let r = 0
  let g = 0
  let b = 0
  if (h < 60) [r, g, b] = [c, x, 0]
  else if (h < 120) [r, g, b] = [x, c, 0]
  else if (h < 180) [r, g, b] = [0, c, x]
  else if (h < 240) [r, g, b] = [0, x, c]
  else if (h < 300) [r, g, b] = [x, 0, c]
  else [r, g, b] = [c, 0, x]

  const toHex = (v: number) =>
    Math.round((v + m) * 255)
      .toString(16)
      .padStart(2, '0')

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}
