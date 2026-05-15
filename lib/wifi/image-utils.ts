/**
 * Client-side image utilities per il welcome page editor.
 * Resize + compressione via Canvas API, conversione a data URI per embed
 * direttamente in splashConfig (no storage esterno).
 */

export interface ResizeOpts {
  /** Lato massimo (proporzioni preservate). Default 800. */
  maxDimension?: number
  /** Qualità JPEG/WebP 0-1. Default 0.85. */
  quality?: number
  /** MIME type output ('image/jpeg' | 'image/webp' | 'image/png'). Default mantiene se PNG, altrimenti jpeg. */
  outputType?: 'image/jpeg' | 'image/webp' | 'image/png'
}

const DEFAULT_MAX_DIM = 800
const DEFAULT_QUALITY = 0.85
const MAX_BYTES_LOGO = 80 * 1024     // 80 KB
const MAX_BYTES_BG = 400 * 1024      // 400 KB

/** Legge File come Image element */
function fileToImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const img = new Image()
      img.onload = () => resolve(img)
      img.onerror = () => reject(new Error('Immagine non valida'))
      img.src = String(reader.result)
    }
    reader.onerror = () => reject(new Error('Lettura file fallita'))
    reader.readAsDataURL(file)
  })
}

/** Resize + compress + ritorna data URI */
export async function processImage(
  file: File,
  opts: ResizeOpts = {},
): Promise<{ dataUri: string; bytes: number; width: number; height: number }> {
  const {
    maxDimension = DEFAULT_MAX_DIM,
    quality = DEFAULT_QUALITY,
    outputType,
  } = opts

  // SVG: passa direttamente come data URI (no canvas, preserva vettore)
  if (file.type === 'image/svg+xml') {
    const text = await file.text()
    if (text.length > MAX_BYTES_LOGO * 2) {
      throw new Error('SVG troppo grande (max 160 KB)')
    }
    const b64 = typeof window !== 'undefined' ? btoa(text) : Buffer.from(text, 'utf8').toString('base64')
    return {
      dataUri: `data:image/svg+xml;base64,${b64}`,
      bytes: text.length,
      width: 0,
      height: 0,
    }
  }

  const img = await fileToImage(file)
  const ratio = Math.min(1, maxDimension / Math.max(img.width, img.height))
  const w = Math.round(img.width * ratio)
  const h = Math.round(img.height * ratio)

  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(img, 0, 0, w, h)

  const mime = outputType ?? (file.type === 'image/png' ? 'image/png' : 'image/jpeg')
  const dataUri = canvas.toDataURL(mime, quality)
  // Calcola size approssimato (data URI overhead ~33%)
  const bytes = Math.round((dataUri.length - dataUri.indexOf(',') - 1) * 0.75)

  return { dataUri, bytes, width: w, height: h }
}

/** Validazione pre-process per fast-fail su file enormi */
export function validateImage(file: File, kind: 'logo' | 'background'): string | null {
  const maxFile = kind === 'logo' ? 2 * 1024 * 1024 : 10 * 1024 * 1024 // 2MB logo, 10MB bg
  if (file.size > maxFile) {
    return `File troppo grande (max ${maxFile / 1024 / 1024} MB)`
  }
  const okTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/svg+xml']
  if (!okTypes.includes(file.type)) {
    return `Tipo non supportato (PNG/JPG/WebP/SVG)`
  }
  return null
}

/** Limite massimo data URI risultante */
export function checkOutputSize(bytes: number, kind: 'logo' | 'background'): string | null {
  const max = kind === 'logo' ? MAX_BYTES_LOGO : MAX_BYTES_BG
  if (bytes > max) {
    return `Risultato troppo grande dopo compressione (${(bytes / 1024).toFixed(0)} KB > ${max / 1024} KB)`
  }
  return null
}
