/**
 * Helper minimali di sanitizzazione per input utente.
 * Usati per evitare XSS nelle email HTML e nelle notifiche.
 * Nessuna dipendenza esterna (no DOMPurify server-side).
 */

const HTML_ESCAPE_MAP: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
  '/': '&#x2F;',
}

/**
 * Escape HTML entities e tronca a `maxLen`. Sicuro per embedding in HTML email.
 * Preserva newline come `\n`.
 */
export function sanitizeText(s: string, maxLen = 1000): string {
  if (!s) return ''
  const escaped = s.replace(/[&<>"'/]/g, (c) => HTML_ESCAPE_MAP[c] ?? c)
  return escaped.length > maxLen ? `${escaped.slice(0, maxLen)}…` : escaped
}

/** Come sanitizeText, ma converte newline in `<br>`. */
export function sanitizeTextToHtml(s: string, maxLen = 1000): string {
  return sanitizeText(s, maxLen).replace(/\n/g, '<br>')
}

/** Strip tutti i tag HTML. Uso: testo-plain per SMS/log/subject email. */
export function stripHtml(s: string): string {
  if (!s) return ''
  return s.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim()
}
