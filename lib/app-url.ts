/**
 * Centralized base URL helper.
 *
 * Source of truth: NEXT_PUBLIC_APP_URL (env var).
 * Fallback: NEXTAUTH_URL, then deprecated otium-pms.vercel.app.
 *
 * IMPORTANTE: non hardcoddare mai `otium-pms.vercel.app` nel codice — usa SEMPRE
 * questo helper. Il dominio del prodotto può cambiare (white-label, custom domain
 * per cliente) e i link hardcoded sono un debito di migrazione.
 *
 * Per impostare il dominio: setta NEXT_PUBLIC_APP_URL su Vercel e in .env.local
 * es: NEXT_PUBLIC_APP_URL=https://book.otiumweek.it
 */
export function getAppUrl(): string {
  const fromEnv =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXTAUTH_URL ||
    ''
  if (fromEnv) return fromEnv.replace(/\/$/, '')
  // Ultimo fallback — da rimuovere quando NEXT_PUBLIC_APP_URL è configurato ovunque
  return 'https://otium-pms.vercel.app'
}

/**
 * Shortcut per costruire URL assoluti partendo da un path.
 * Es: absoluteUrl('/book/123') → 'https://book.otiumweek.it/book/123'
 */
export function absoluteUrl(path: string): string {
  const base = getAppUrl()
  const p = path.startsWith('/') ? path : `/${path}`
  return `${base}${p}`
}
