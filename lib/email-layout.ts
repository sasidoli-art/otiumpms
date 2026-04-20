import { prisma } from '@/lib/db'
import { buildPrivacyFooterHtml, type PrivacyFooterContext } from '@/lib/email-privacy-footer'

export interface EmailBranding {
  nome: string
  logo?: string | null
  colorePrimario?: string | null
  coloreSecondario?: string | null
  fotoHero?: string | null
  messaggioChiusura?: string | null
  linkFacebook?: string | null
  linkInstagram?: string | null
  linkSitoWeb?: string | null
}

/**
 * Carica branding della struttura per le email.
 * Ritorna null se strutturaId non e' fornito o la struttura non esiste.
 */
export async function getBranding(strutturaId?: string | null): Promise<EmailBranding | null> {
  if (!strutturaId) return null
  try {
    const s = await prisma.struttura.findUnique({
      where: { id: strutturaId },
      select: {
        nome: true, logo: true, colorePrimario: true, coloreSecondario: true,
        fotoHero: true, messaggioChiusura: true,
        linkFacebook: true, linkInstagram: true, linkSitoWeb: true,
      },
    })
    return s
  } catch { return null }
}

/**
 * Helper: costruisce privacy footer context se tutti i campi necessari ci sono.
 */
export function privacyCtxFrom(params: {
  guestEmail?: string | null
  hostId?: string | null
  strutturaNome?: string | null
  marketing?: boolean
}): PrivacyFooterContext | null {
  if (!params.guestEmail || !params.hostId || !params.strutturaNome) return null
  return {
    guestEmail: params.guestEmail,
    hostId: params.hostId,
    nomeStruttura: params.strutturaNome,
    marketing: params.marketing ?? false,
  }
}

/**
 * Layout HTML responsive table-based (compatibile Gmail/Outlook/Apple Mail).
 * Header: logo/nome struttura. Body: contenuto. Footer: brand + social + privacy.
 * Usa struttura.colorePrimario per CTA e header.
 */
export function renderLayout(
  contenuto: string,
  branding?: EmailBranding | null,
  privacy?: PrivacyFooterContext | null,
): string {
  const color = branding?.colorePrimario ?? '#4f46e5'
  const nome = branding?.nome ?? 'Otium Week'
  const logo = branding?.logo
  const hero = branding?.fotoHero
  const chiusura = branding?.messaggioChiusura
  const fb = branding?.linkFacebook
  const ig = branding?.linkInstagram
  const sito = branding?.linkSitoWeb

  const headerContent = logo
    ? `<img src="${logo}" alt="${escape(nome)}" style="max-height:60px;max-width:280px;" />`
    : `<h1 style="color:#ffffff;margin:0;font-size:20px;font-weight:700;">${escape(nome)}</h1>`

  const socialLinks = [
    fb ? `<a href="${fb}" style="display:inline-block;margin:0 6px;"><img src="https://cdn-icons-png.flaticon.com/24/733/733547.png" width="24" height="24" alt="Facebook" /></a>` : '',
    ig ? `<a href="${ig}" style="display:inline-block;margin:0 6px;"><img src="https://cdn-icons-png.flaticon.com/24/2111/2111463.png" width="24" height="24" alt="Instagram" /></a>` : '',
  ].filter(Boolean).join('')

  return `<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f4f4f5; margin: 0; padding: 0; }
    .wrapper { max-width: 560px; margin: 32px auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,.12); }
    .header { background: ${color}; padding: 24px 32px; text-align: center; }
    .body { padding: 28px 32px; color: #374151; line-height: 1.6; }
    .body p { margin: 0 0 14px; }
    .table { width: 100%; border-collapse: collapse; margin: 16px 0; }
    .table th { background: #f9fafb; text-align: left; padding: 8px 12px; font-size: 12px; text-transform: uppercase; color: #6b7280; border-bottom: 1px solid #e5e7eb; }
    .table td { padding: 10px 12px; border-bottom: 1px solid #f3f4f6; font-size: 14px; }
    .btn { display: inline-block; background: ${color}; color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 700; font-size: 14px; margin: 8px 0; text-transform: uppercase; letter-spacing: 0.5px; }
    .footer { padding: 20px 32px; background: #f9fafb; font-size: 12px; color: #9ca3af; text-align: center; }
    .badge { display: inline-block; padding: 2px 10px; border-radius: 12px; font-size: 12px; font-weight: 600; }
    .badge-yellow { background: #fef9c3; color: #854d0e; }
    .badge-green { background: #dcfce7; color: #166534; }
    .badge-red { background: #fee2e2; color: #991b1b; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">${headerContent}</div>
    ${hero ? `<img src="${hero}" alt="${escape(nome)}" style="width:100%;height:auto;display:block;" />` : ''}
    <div class="body">${contenuto}${privacy ? buildPrivacyFooterHtml(privacy) : ''}</div>
    <div class="footer">
      ${chiusura ? `<p style="font-style:italic;color:#6b7280;margin:0 0 8px;">${escape(chiusura)}</p>` : ''}
      <p style="margin:0 0 8px;font-weight:600;">${escape(nome)}</p>
      ${sito ? `<p style="margin:0 0 8px;"><a href="${sito}" style="color:${color};text-decoration:none;">${escape(sito.replace(/^https?:\/\//, ''))}</a></p>` : ''}
      ${socialLinks ? `<p style="margin:8px 0;">${socialLinks}</p>` : ''}
      <p style="margin:12px 0 0;font-size:10px;color:#c0c0c0;">Powered by <a href="https://otiumpms.com" style="color:#c0c0c0;text-decoration:underline;">OtiumPMS</a></p>
    </div>
  </div>
</body>
</html>`
}

function escape(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}
