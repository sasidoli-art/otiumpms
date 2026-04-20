/**
 * Privacy footer HTML per le email ospite.
 *
 * Genera:
 *  - Disclaimer GDPR ("Hai ricevuto questa email perché…")
 *  - Link "Gestisci i tuoi dati" → /privacy/{token} (token firmato HMAC)
 *  - Link "Annulla iscrizione" → /privacy/{token}?tab=consensi
 *    (solo nelle email marketing)
 */

import { generaPortaleToken } from './consent'

export type PrivacyFooterContext = {
  guestEmail: string
  hostId: string
  nomeStruttura: string
  /** true per email marketing (newsletter, offerte) → aggiunge "Annulla iscrizione" */
  marketing?: boolean
  /** override base URL, default process.env.NEXT_PUBLIC_APP_URL */
  baseUrl?: string
}

export function buildPrivacyFooterHtml(ctx: PrivacyFooterContext): string {
  const baseUrl = ctx.baseUrl ?? process.env.NEXT_PUBLIC_APP_URL ?? 'https://otiumpms.com'
  let token: string
  try {
    token = generaPortaleToken(ctx.guestEmail, ctx.hostId)
  } catch {
    // Se ENCRYPTION_KEY manca in prod, non bloccare l'invio email.
    // Meglio footer generico che niente.
    return renderFallback(ctx.nomeStruttura, baseUrl)
  }

  const managerUrl = `${baseUrl}/privacy/${token}`
  const unsubscribeUrl = `${baseUrl}/privacy/${token}?tab=consensi`

  return `
    <div style="margin-top:24px;padding-top:16px;border-top:1px solid #e5e7eb;font-size:11px;color:#9ca3af;line-height:1.5;">
      <p style="margin:0 0 6px;">
        Hai ricevuto questa email perché hai una prenotazione presso
        <strong style="color:#6b7280;">${escapeHtml(ctx.nomeStruttura)}</strong>.
        Puoi gestire i tuoi dati e i tuoi consensi in qualsiasi momento.
      </p>
      <p style="margin:0;">
        <a href="${managerUrl}" style="color:#6366f1;text-decoration:none;">Gestisci i tuoi dati</a>
        ${
          ctx.marketing
            ? `<span style="color:#d1d5db;"> · </span><a href="${unsubscribeUrl}" style="color:#6366f1;text-decoration:none;">Annulla iscrizione</a>`
            : ''
        }
      </p>
    </div>
  `
}

function renderFallback(nomeStruttura: string, baseUrl: string): string {
  return `
    <div style="margin-top:24px;padding-top:16px;border-top:1px solid #e5e7eb;font-size:11px;color:#9ca3af;line-height:1.5;">
      <p style="margin:0;">
        Hai ricevuto questa email perché hai una prenotazione presso
        <strong style="color:#6b7280;">${escapeHtml(nomeStruttura)}</strong>.
        Per gestire i tuoi dati contatta la struttura o visita
        <a href="${baseUrl}/privacy" style="color:#6366f1;">${baseUrl.replace(/^https?:\/\//, '')}/privacy</a>.
      </p>
    </div>
  `
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]!))
}
