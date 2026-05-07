import nodemailer from 'nodemailer'
import { prisma } from '@/lib/db'
import { emailQueue } from '@/lib/email-queue'
import { getSmtpConfig } from '@/lib/host-config'
import { buildPrivacyFooterHtml, type PrivacyFooterContext } from '@/lib/email-privacy-footer'

/**
 * Restituisce un transporter Nodemailer e l'indirizzo "from" da usare.
 * Se `hostId` è fornito e il host ha credenziali SMTP configurate usa quelle,
 * altrimenti cade in fallback sulle variabili d'ambiente globali.
 */
async function getTransporterAndFrom(hostId?: string | null): Promise<{
  transporter: nodemailer.Transporter
  from: string
}> {
  if (hostId) {
    const cfg = await getSmtpConfig(hostId)
    if (cfg?.smtpUser && cfg.smtpPass && cfg.smtpHost) {
      const t = nodemailer.createTransport({
        host: cfg.smtpHost,
        port: cfg.smtpPort ?? 587,
        secure: (cfg.smtpPort ?? 587) === 465,
        auth: { user: cfg.smtpUser, pass: cfg.smtpPass },
      })
      return {
        transporter: t,
        from: cfg.emailMittente ?? cfg.smtpUser,
      }
    }
  }
  // Fallback: SMTP globale della piattaforma
  const port = Number(process.env.SMTP_PORT) || 587
  const t = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port,
    secure: port === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  })
  return {
    transporter: t,
    from: process.env.SMTP_FROM || process.env.SMTP_USER || '',
  }
}

/** Helper interno: invia una email usando il transporter corretto per il host. */
async function dispatchMail(
  opts: { to: string; subject: string; html: string; replyTo?: string },
  hostId?: string | null,
) {
  try {
    const { transporter, from } = await getTransporterAndFrom(hostId)
    console.log('[email] sending to:', opts.to, 'from:', from, 'host:', process.env.SMTP_HOST)
    await transporter.sendMail({ from, ...opts })
    console.log('[email] sent OK')
  } catch (err) {
    console.error('[email] FAILED:', err instanceof Error ? err.message : err)
    throw err
  }
}

/**
 * Queued version of dispatchMail — enqueues email for delivery with automatic retry.
 * Use this for non-blocking email sends (notifications, reminders).
 */
function queueMail(
  label: string,
  opts: { to: string; subject: string; html: string },
  hostId?: string | null,
) {
  emailQueue.enqueue(label, () => dispatchMail(opts, hostId))
}

/** Invia una email generica (testo libero) usando il transporter dell'host. */
export async function sendEmailGeneric(params: {
  to: string
  subject: string
  text: string
  hostId?: string | null
  strutturaId?: string | null
}) {
  const branding = await getBranding(params.strutturaId)
  const html = base(`<div style="white-space: pre-wrap; font-size: 14px; color: #374151;">${params.text.replace(/\n/g, '<br>')}</div>`, branding)
  await dispatchMail({ to: params.to, subject: params.subject, html }, params.hostId)
}

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
 * Helper: costruisce privacy footer context se tutti i campi necessari ci sono.
 * Usato nelle email ospite-facing.
 */
function privacyCtxFrom(params: {
  guestEmail?: string | null
  hostId?: string | null
  strutturaNome?: string | null
  nomeStruttura?: string | null
  marketing?: boolean
}): PrivacyFooterContext | null {
  const nome = params.strutturaNome ?? params.nomeStruttura
  if (!params.guestEmail || !params.hostId || !nome) return null
  return {
    guestEmail: params.guestEmail,
    hostId: params.hostId,
    nomeStruttura: nome,
    marketing: params.marketing ?? false,
  }
}

/** Genera HTML con branding caricato dalla struttura. */
async function baseWithBranding(
  contenuto: string,
  strutturaId?: string | null,
  privacy?: PrivacyFooterContext | null,
): Promise<string> {
  const branding = await getBranding(strutturaId)
  return base(contenuto, branding, privacy)
}

/** Carica branding della struttura per le email. */
async function getBranding(strutturaId?: string | null): Promise<EmailBranding | null> {
  if (!strutturaId) return null
  try {
    const s = await prisma.struttura.findUnique({
      where: { id: strutturaId },
      select: { nome: true, logo: true, colorePrimario: true, coloreSecondario: true, fotoHero: true, messaggioChiusura: true, linkFacebook: true, linkInstagram: true, linkSitoWeb: true },
    })
    return s
  } catch { return null }
}

/**
 * Genera HTML email con branding struttura.
 * Se branding è null, usa template standard OtiumPMS.
 */
function base(contenuto: string, branding?: EmailBranding | null, privacy?: PrivacyFooterContext | null): string {
  const color = branding?.colorePrimario ?? '#4f46e5'
  const nome = branding?.nome ?? 'Otium Week'
  const logo = branding?.logo
  const hero = branding?.fotoHero
  const chiusura = branding?.messaggioChiusura
  const fb = branding?.linkFacebook
  const ig = branding?.linkInstagram
  const sito = branding?.linkSitoWeb

  const headerContent = logo
    ? `<img src="${logo}" alt="${nome}" style="max-height:60px;max-width:280px;" />`
    : `<h1 style="color:#ffffff;margin:0;font-size:20px;font-weight:700;">${nome}</h1>`

  const socialLinks = [
    fb ? `<a href="${fb}" style="display:inline-block;margin:0 6px;"><img src="https://cdn-icons-png.flaticon.com/24/733/733547.png" width="24" height="24" alt="Facebook" /></a>` : '',
    ig ? `<a href="${ig}" style="display:inline-block;margin:0 6px;"><img src="https://cdn-icons-png.flaticon.com/24/2111/2111463.png" width="24" height="24" alt="Instagram" /></a>` : '',
  ].filter(Boolean).join('')

  return `
    <!DOCTYPE html>
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
      </style>
    </head>
    <body>
      <div class="wrapper">
        <div class="header">${headerContent}</div>
        <div class="body">${contenuto}${privacy ? buildPrivacyFooterHtml(privacy) : ''}</div>
        ${hero ? `<img src="${hero}" alt="${nome}" style="width:100%;height:auto;display:block;" />` : ''}
        <div class="footer">
          ${chiusura ? `<p style="font-style:italic;color:#6b7280;margin:0 0 8px;">${chiusura}</p>` : ''}
          <p style="margin:0 0 8px;font-weight:600;">${nome}</p>
          ${sito ? `<p style="margin:0 0 8px;"><a href="${sito}" style="color:${color};text-decoration:none;">${sito.replace(/^https?:\/\//, '')}</a></p>` : ''}
          ${socialLinks ? `<p style="margin:8px 0;">${socialLinks}</p>` : ''}
          <p style="margin:12px 0 0;font-size:10px;color:#c0c0c0;">Powered by <a href="https://otiumpms.com" style="color:#c0c0c0;text-decoration:underline;">OtiumPMS</a></p>
        </div>
      </div>
    </body>
    </html>
  `
}

// ─── Nuova Prenotazione (per host) ───────────────────────────────────────────

export async function sendEmailNuovaPrenotazione(params: {
  hostEmail: string
  hostNome: string
  prenotazioneId: string
  guestNome: string
  guestCognome: string
  guestEmail: string
  guestTelefono?: string | null
  strutturaNome: string
  dataArrivo: Date
  dataPartenza?: Date | null
  numOspiti: number
  guestNote?: string | null
  hostId?: string | null
}) {
  const {
    hostEmail, hostNome, prenotazioneId,
    guestNome, guestCognome, guestEmail, guestTelefono,
    strutturaNome, dataArrivo, dataPartenza, numOspiti, guestNote, hostId,
  } = params

  const fmt = (d: Date) =>
    d.toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })

  const htmlBody = `
    <p>Ciao <strong>${hostNome}</strong>,</p>
    <p>Hai ricevuto una nuova prenotazione per <strong>${strutturaNome}</strong>.
       <span class="badge badge-yellow">In attesa</span></p>
    <table class="table">
      <tr><th>Ospite</th><td>${guestNome} ${guestCognome}</td></tr>
      <tr><th>Email</th><td><a href="mailto:${guestEmail}">${guestEmail}</a></td></tr>
      ${guestTelefono ? `<tr><th>Telefono</th><td>${guestTelefono}</td></tr>` : ''}
      <tr><th>Struttura</th><td>${strutturaNome}</td></tr>
      <tr><th>Arrivo</th><td>${fmt(dataArrivo)}</td></tr>
      ${dataPartenza ? `<tr><th>Partenza</th><td>${fmt(dataPartenza)}</td></tr>` : ''}
      <tr><th>Ospiti</th><td>${numOspiti}</td></tr>
      ${guestNote ? `<tr><th>Note ospite</th><td>${guestNote}</td></tr>` : ''}
    </table>
    <p>
      <a class="btn" href="${process.env.NEXTAUTH_URL}/host/prenotazioni/${prenotazioneId}">
        Gestisci prenotazione →
      </a>
    </p>
    <p style="color:#6b7280;font-size:13px;">
      Puoi confermare, rifiutare o aprire una chat direttamente dal gestionale.
    </p>
  `

  await dispatchMail({
    to: hostEmail,
    subject: `Nuova prenotazione da ${guestNome} ${guestCognome} – ${strutturaNome}`,
    html: base(htmlBody),
  }, hostId)
}

// ─── Conferma Prenotazione (per ospite) ──────────────────────────────────────

export async function sendEmailConfermaPrenotazione(params: {
  guestEmail: string
  guestNome: string
  strutturaNome: string
  hostNome: string
  dataArrivo: Date
  dataPartenza?: Date | null
  numOspiti: number
  prezzoTotale?: number | null
  hostId?: string | null
  strutturaId?: string | null
  pin?: string | null
}) {
  const { guestEmail, guestNome, strutturaNome, hostNome, dataArrivo, dataPartenza, numOspiti, prezzoTotale, hostId, strutturaId, pin } = params
  const fmt = (d: Date) =>
    d.toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })

  const pinBlock = pin ? `
    <tr><th>PIN personale</th><td><strong style="font-size: 18px; letter-spacing: 4px; color: #4f46e5;">${pin}</strong></td></tr>
    <tr><td colspan="2" style="font-size: 11px; color: #6b7280; padding-top: 4px;">
      Usa questo PIN per: Wi-Fi, servizi in camera (QR code), concierge AI e checkout.
      Non condividerlo con altri ospiti.
    </td></tr>
  ` : ''

  const htmlBody = `
    <p>Ciao <strong>${guestNome}</strong>,</p>
    <p>La tua prenotazione per <strong>${strutturaNome}</strong> è stata <strong>confermata</strong>.
       <span class="badge badge-green">Confermata</span></p>
    <table class="table">
      <tr><th>Struttura</th><td>${strutturaNome}</td></tr>
      <tr><th>Organizzatore</th><td>${hostNome}</td></tr>
      <tr><th>Arrivo</th><td>${fmt(dataArrivo)}</td></tr>
      ${dataPartenza ? `<tr><th>Partenza</th><td>${fmt(dataPartenza)}</td></tr>` : ''}
      <tr><th>Ospiti</th><td>${numOspiti}</td></tr>
      ${prezzoTotale != null ? `<tr><th>Totale</th><td>€${prezzoTotale.toFixed(2)}</td></tr>` : ''}
      ${pinBlock}
    </table>
    <p>Per ulteriori informazioni o domande, rispondi a questa email.</p>
  `

  await dispatchMail({
    to: guestEmail,
    subject: `Prenotazione confermata – ${strutturaNome}`,
    html: await baseWithBranding(htmlBody, strutturaId, privacyCtxFrom({ guestEmail, hostId, strutturaNome })),
  }, hostId)
}

// ─── Cancellazione Prenotazione (per ospite) ────────────────────────────────

export async function sendEmailCancellazionePrenotazione(params: {
  guestEmail: string
  guestNome: string
  strutturaNome: string
  hostNome: string
  dataArrivo: Date
  lingua?: string
  strutturaId?: string | null
  hostId?: string | null
}) {
  const { guestEmail, guestNome, strutturaNome, hostNome, dataArrivo, lingua, hostId, strutturaId } = params
  const fmt = (d: Date) =>
    d.toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })

  // Template per lingua
  const testi: Record<string, { subject: string; body: string }> = {
    it: {
      subject: `Prenotazione cancellata – ${strutturaNome}`,
      body: `
        <p>Ciao <strong>${guestNome}</strong>,</p>
        <p>La tua prenotazione per <strong>${strutturaNome}</strong> del <strong>${fmt(dataArrivo)}</strong> è stata <span class="badge" style="background:#fee2e2;color:#991b1b;">Cancellata</span></p>
        <p>Per ulteriori informazioni o per effettuare una nuova prenotazione, contatta <strong>${hostNome}</strong>.</p>
        <p style="color:#6b7280;font-size:13px;">Se ritieni che si tratti di un errore, rispondi a questa email.</p>
      `,
    },
    en: {
      subject: `Booking cancelled – ${strutturaNome}`,
      body: `
        <p>Hi <strong>${guestNome}</strong>,</p>
        <p>Your booking at <strong>${strutturaNome}</strong> for <strong>${fmt(dataArrivo)}</strong> has been <span class="badge" style="background:#fee2e2;color:#991b1b;">Cancelled</span></p>
        <p>For more information or to make a new booking, please contact <strong>${hostNome}</strong>.</p>
      `,
    },
  }

  const t = testi[lingua ?? 'it'] ?? testi.it

  await dispatchMail({
    to: guestEmail,
    subject: t.subject,
    html: base(t.body, null, privacyCtxFrom({ guestEmail, hostId, strutturaNome })),
  }, hostId)
}

// ─── Nuovo Messaggio Chat ─────────────────────────────────────────────────────

export async function sendEmailNuovoMessaggio(params: {
  destinatarioEmail: string
  destinatarioNome: string
  mittenteNome: string
  strutturaNome: string
  testo: string
  chatUrl: string
  chatId?: string | null
  hostId?: string | null
}) {
  const { destinatarioEmail, destinatarioNome, mittenteNome, strutturaNome, testo, chatUrl, chatId, hostId } = params

  // Tag per threading email — permette al sistema IMAP di collegare le risposte alla chat
  const tag = chatId ? ` [OTM-${chatId}]` : ''

  const htmlBody = `
    <p>Ciao <strong>${destinatarioNome}</strong>,</p>
    <p>Hai ricevuto un nuovo messaggio da <strong>${mittenteNome}</strong>
       riguardo la prenotazione per <strong>${strutturaNome}</strong>.</p>
    <blockquote style="border-left:3px solid #4f46e5;margin:12px 0;padding:8px 16px;background:#f5f3ff;border-radius:4px;font-style:italic;color:#374151;">
      ${testo.replace(/\n/g, '<br>')}
    </blockquote>
    <p>
      <a class="btn" href="${chatUrl}">Rispondi nella chat →</a>
    </p>
    <p style="color:#9ca3af;font-size:11px;">
      Puoi anche rispondere direttamente a questa email — il messaggio apparirà nella chat.
    </p>
  `

  await dispatchMail({
    to: destinatarioEmail,
    subject: `Nuovo messaggio da ${mittenteNome} – ${strutturaNome}${tag}`,
    html: base(htmlBody, null, privacyCtxFrom({ guestEmail: destinatarioEmail, hostId, strutturaNome })),
  }, hostId)
}

// ─── SPA: Conferma Appuntamento (per ospite) ─────────────────────────────────

export async function sendEmailConfermaAppuntamentoSpa(params: {
  guestEmail: string
  guestNome: string
  hostNome: string
  servizioNome: string
  dataOra: Date
  durata: number
  prezzoTotale?: number | null
  hostId?: string | null
}) {
  const { guestEmail, guestNome, hostNome, servizioNome, dataOra, durata, prezzoTotale, hostId } = params

  const fmtData = dataOra.toLocaleDateString('it-IT', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
  const fmtOra = dataOra.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })

  const htmlBody = `
    <p>Ciao <strong>${guestNome}</strong>,</p>
    <p>Il tuo appuntamento SPA con <strong>${hostNome}</strong> è stato <strong>confermato</strong>.
       <span class="badge badge-green">Confermato</span></p>
    <table class="table">
      <tr><th>Servizio</th><td>${servizioNome}</td></tr>
      <tr><th>Data</th><td>${fmtData}</td></tr>
      <tr><th>Orario</th><td>${fmtOra}</td></tr>
      <tr><th>Durata</th><td>${durata} minuti</td></tr>
      ${prezzoTotale != null ? `<tr><th>Totale</th><td><strong>€${prezzoTotale.toFixed(2)}</strong></td></tr>` : ''}
    </table>
    <p>Ti aspettiamo! Per disdire o modificare l'appuntamento contatta <strong>${hostNome}</strong>.</p>
    <p style="color:#6b7280;font-size:13px;">Il pagamento avverrà direttamente in struttura.</p>
  `

  await dispatchMail({
    to: guestEmail,
    subject: `Appuntamento SPA confermato – ${servizioNome}`,
    html: base(htmlBody, null, privacyCtxFrom({ guestEmail, hostId, strutturaNome: hostNome })),
  }, hostId)
}

// ─── SPA: Notifica Nuovo Appuntamento (per host) ──────────────────────────────

export async function sendEmailNotificaNuovoAppuntamentoSpa(params: {
  hostEmail: string
  hostNome: string
  guestNome: string
  guestCognome: string
  guestEmail: string
  guestTelefono?: string | null
  servizioNome: string
  dataOra: Date
  durata: number
  prezzoTotale?: number | null
  note?: string | null
  hostId?: string | null
}) {
  const {
    hostEmail, hostNome, guestNome, guestCognome, guestEmail,
    guestTelefono, servizioNome, dataOra, durata, prezzoTotale, note, hostId,
  } = params

  const fmtData = dataOra.toLocaleDateString('it-IT', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
  const fmtOra = dataOra.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })

  const htmlBody = `
    <p>Ciao <strong>${hostNome}</strong>,</p>
    <p>Hai ricevuto una nuova prenotazione SPA online.
       <span class="badge badge-yellow">Da confermare</span></p>
    <table class="table">
      <tr><th>Ospite</th><td>${guestNome} ${guestCognome}</td></tr>
      <tr><th>Email</th><td><a href="mailto:${guestEmail}">${guestEmail}</a></td></tr>
      ${guestTelefono ? `<tr><th>Telefono</th><td>${guestTelefono}</td></tr>` : ''}
      <tr><th>Servizio</th><td>${servizioNome}</td></tr>
      <tr><th>Data</th><td>${fmtData}</td></tr>
      <tr><th>Orario</th><td>${fmtOra}</td></tr>
      <tr><th>Durata</th><td>${durata} minuti</td></tr>
      ${prezzoTotale != null ? `<tr><th>Totale</th><td>€${prezzoTotale.toFixed(2)}</td></tr>` : ''}
      ${note ? `<tr><th>Note ospite</th><td>${note}</td></tr>` : ''}
    </table>
    <p>
      <a class="btn" href="${process.env.NEXTAUTH_URL}/host/spa/appuntamenti">
        Gestisci appuntamento →
      </a>
    </p>
  `

  await dispatchMail({
    to: hostEmail,
    subject: `Nuova prenotazione SPA: ${guestNome} ${guestCognome} – ${servizioNome}`,
    html: base(htmlBody),
  }, hostId)
}

// ─── Reminder Pre-Arrivo (per ospite) ────────────────────────────────────────

export async function sendEmailReminderPreArrivo(params: {
  guestEmail: string
  guestNome: string
  hostNome: string
  strutturaNome: string
  strutturaIndirizzo?: string | null
  strutturaCitta?: string | null
  hostTelefono?: string | null
  dataArrivo: Date
  dataPartenza?: Date | null
  numOspiti: number
  unitaNome?: string | null
  checkInUrl?: string | null
  lingua?: string | null
  hostId?: string | null
}) {
  const {
    guestEmail, guestNome, hostNome, strutturaNome, strutturaIndirizzo,
    strutturaCitta, hostTelefono, dataArrivo, dataPartenza, numOspiti,
    unitaNome, checkInUrl, lingua, hostId,
  } = params

  const fmt = (d: Date) =>
    d.toLocaleDateString(lingua === 'en' ? 'en-GB' : 'it-IT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  const isEN = lingua === 'en'

  const htmlBody = `
    <p>${isEN ? 'Hi' : 'Ciao'} <strong>${guestNome}</strong>,</p>
    <p>${isEN
      ? `Your stay at <strong>${strutturaNome}</strong> is coming up <strong>tomorrow</strong>!`
      : `Il tuo soggiorno presso <strong>${strutturaNome}</strong> è previsto per <strong>domani</strong>!`
    }</p>
    <table class="table">
      <tr><th>${isEN ? 'Property' : 'Struttura'}</th><td>${strutturaNome}${unitaNome ? ` (${unitaNome})` : ''}</td></tr>
      <tr><th>${isEN ? 'Check-in' : 'Arrivo'}</th><td>${fmt(dataArrivo)}</td></tr>
      ${dataPartenza ? `<tr><th>${isEN ? 'Check-out' : 'Partenza'}</th><td>${fmt(dataPartenza)}</td></tr>` : ''}
      <tr><th>${isEN ? 'Guests' : 'Ospiti'}</th><td>${numOspiti}</td></tr>
      ${strutturaIndirizzo ? `<tr><th>${isEN ? 'Address' : 'Indirizzo'}</th><td>${strutturaIndirizzo}${strutturaCitta ? `, ${strutturaCitta}` : ''}</td></tr>` : ''}
      ${hostTelefono ? `<tr><th>${isEN ? 'Contact' : 'Contatto'}</th><td>${hostTelefono}</td></tr>` : ''}
    </table>
    ${checkInUrl ? `
      <p>${isEN
        ? 'Save time at arrival — complete your <strong>online check-in</strong>:'
        : 'Risparmia tempo all\'arrivo — completa il <strong>check-in online</strong>:'
      }</p>
      <p><a class="btn" href="${checkInUrl}">${isEN ? 'Online Check-in →' : 'Check-in online →'}</a></p>
    ` : ''}
    <p style="color:#6b7280;font-size:13px;">
      ${isEN
        ? `We look forward to welcoming you! For any questions, contact <strong>${hostNome}</strong>.`
        : `Ti aspettiamo! Per qualsiasi domanda contatta <strong>${hostNome}</strong>.`
      }
    </p>
  `

  await dispatchMail({
    to: guestEmail,
    subject: isEN
      ? `Reminder: your stay at ${strutturaNome} is tomorrow!`
      : `Promemoria: il tuo soggiorno a ${strutturaNome} è domani!`,
    html: base(htmlBody, null, privacyCtxFrom({ guestEmail, hostId, strutturaNome })),
  }, hostId)
}

// ─── Follow-up Post-Soggiorno (per ospite) ──────────────────────────────────

export async function sendEmailFollowUpPostSoggiorno(params: {
  guestEmail: string
  guestNome: string
  hostNome: string
  strutturaNome: string
  dataArrivo: Date
  dataPartenza: Date
  bookingUrl?: string | null
  lingua?: string | null
  hostId?: string | null
}) {
  const { guestEmail, guestNome, hostNome, strutturaNome, dataArrivo, dataPartenza, bookingUrl, lingua, hostId } = params

  const fmt = (d: Date) =>
    d.toLocaleDateString(lingua === 'en' ? 'en-GB' : 'it-IT', { day: 'numeric', month: 'long' })

  const isEN = lingua === 'en'

  const htmlBody = `
    <p>${isEN ? 'Dear' : 'Caro/a'} <strong>${guestNome}</strong>,</p>
    <p>${isEN
      ? `Thank you for staying at <strong>${strutturaNome}</strong> from ${fmt(dataArrivo)} to ${fmt(dataPartenza)}. We hope you had a wonderful time!`
      : `Grazie per aver soggiornato presso <strong>${strutturaNome}</strong> dal ${fmt(dataArrivo)} al ${fmt(dataPartenza)}. Speriamo che il tuo soggiorno sia stato piacevole!`
    }</p>
    <div style="background:#f5f3ff;border-radius:8px;padding:20px;margin:16px 0;text-align:center;">
      <p style="margin:0 0 8px;font-size:16px;">${isEN ? '⭐ How was your stay?' : '⭐ Com\'è andato il tuo soggiorno?'}</p>
      <p style="margin:0;color:#6b7280;font-size:13px;">
        ${isEN
          ? 'Your feedback helps us improve and helps other travelers choose.'
          : 'Il tuo feedback ci aiuta a migliorare e aiuta altri viaggiatori nella scelta.'
        }
      </p>
    </div>
    <p>${isEN
      ? `We would love to welcome you again. <strong>${hostNome}</strong> is always happy to welcome returning guests.`
      : `Saremmo felici di riavervi come ospiti. <strong>${hostNome}</strong> è sempre lieto di accogliere chi torna.`
    }</p>
    ${bookingUrl ? `
      <p><a class="btn" href="${bookingUrl}">${isEN ? 'Book again →' : 'Prenota di nuovo →'}</a></p>
    ` : ''}
    <p style="color:#6b7280;font-size:13px;">
      ${isEN
        ? `Thank you for choosing ${strutturaNome}!`
        : `Grazie per aver scelto ${strutturaNome}!`
      }
    </p>
  `

  await dispatchMail({
    to: guestEmail,
    subject: isEN
      ? `Thank you for your stay at ${strutturaNome}!`
      : `Grazie per il tuo soggiorno a ${strutturaNome}!`,
    html: base(htmlBody, null, privacyCtxFrom({ guestEmail, hostId, strutturaNome, marketing: true })),
  }, hostId)
}

// ─── SPA: Cancellazione Appuntamento (per ospite) ────────────────────────────

export async function sendEmailCancellazioneAppuntamentoSpa(params: {
  guestEmail: string
  guestNome: string
  hostNome: string
  servizioNome: string
  dataOra: Date
  hostId?: string | null
}) {
  const { guestEmail, guestNome, hostNome, servizioNome, dataOra, hostId } = params

  const fmtData = dataOra.toLocaleDateString('it-IT', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
  const fmtOra = dataOra.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })

  const htmlBody = `
    <p>Ciao <strong>${guestNome}</strong>,</p>
    <p>Il tuo appuntamento SPA è stato <strong>cancellato</strong>.
       <span class="badge" style="background:#fee2e2;color:#991b1b;">Cancellato</span></p>
    <table class="table">
      <tr><th>Servizio</th><td>${servizioNome}</td></tr>
      <tr><th>Data</th><td>${fmtData}</td></tr>
      <tr><th>Orario</th><td>${fmtOra}</td></tr>
    </table>
    <p>Per informazioni o per prenotare un nuovo appuntamento, contatta <strong>${hostNome}</strong>.</p>
    <p style="color:#6b7280;font-size:13px;">Se ritieni che si tratti di un errore, rispondi a questa email.</p>
  `

  await dispatchMail({
    to: guestEmail,
    subject: `Appuntamento SPA cancellato – ${servizioNome}`,
    html: base(htmlBody, null, privacyCtxFrom({ guestEmail, hostId, strutturaNome: hostNome })),
  }, hostId)
}

// ─── SPA: Reminder Appuntamento (per ospite) ─────────────────────────────────

export async function sendEmailReminderAppuntamentoSpa(params: {
  guestEmail: string
  guestNome: string
  hostNome: string
  servizioNome: string
  dataOra: Date
  durata: number
  lingua?: string | null
  hostId?: string | null
}) {
  const { guestEmail, guestNome, hostNome, servizioNome, dataOra, durata, lingua, hostId } = params

  const L = (lingua || 'it').toLowerCase()
  const localeMap: Record<string, string> = { it: 'it-IT', en: 'en-GB', fr: 'fr-FR', de: 'de-DE', es: 'es-ES' }
  const locale = localeMap[L] ?? 'it-IT'

  const fmtData = dataOra.toLocaleDateString(locale, {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
  const fmtOra = dataOra.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })

  const T: Record<string, Record<string, string>> = {
    it: {
      hi: 'Ciao', intro: 'Ti ricordiamo che', tomorrow: 'domani',
      haveApp: 'hai un appuntamento SPA con', service: 'Servizio',
      date: 'Data', time: 'Orario', duration: 'Durata', minutes: 'minuti',
      cancel: 'Per disdire o modificare l\'appuntamento contatta',
      subject: 'Promemoria appuntamento SPA domani',
    },
    en: {
      hi: 'Hi', intro: 'Reminder:', tomorrow: 'tomorrow',
      haveApp: 'you have a SPA appointment with', service: 'Service',
      date: 'Date', time: 'Time', duration: 'Duration', minutes: 'minutes',
      cancel: 'To cancel or reschedule, contact',
      subject: 'SPA appointment reminder — tomorrow',
    },
    fr: {
      hi: 'Bonjour', intro: 'Rappel :', tomorrow: 'demain',
      haveApp: 'vous avez un rendez-vous SPA avec', service: 'Service',
      date: 'Date', time: 'Heure', duration: 'Durée', minutes: 'minutes',
      cancel: 'Pour annuler ou modifier, contactez',
      subject: 'Rappel rendez-vous SPA — demain',
    },
    de: {
      hi: 'Hallo', intro: 'Erinnerung:', tomorrow: 'morgen',
      haveApp: 'Sie haben einen SPA-Termin mit', service: 'Leistung',
      date: 'Datum', time: 'Uhrzeit', duration: 'Dauer', minutes: 'Minuten',
      cancel: 'Zum Stornieren oder Ändern kontaktieren Sie',
      subject: 'SPA-Termin Erinnerung — morgen',
    },
    es: {
      hi: 'Hola', intro: 'Recordatorio:', tomorrow: 'mañana',
      haveApp: 'tienes una cita SPA con', service: 'Servicio',
      date: 'Fecha', time: 'Hora', duration: 'Duración', minutes: 'minutos',
      cancel: 'Para cancelar o modificar contacta con',
      subject: 'Recordatorio cita SPA — mañana',
    },
  }
  const t = T[L] ?? T.it

  const htmlBody = `
    <p>${t.hi} <strong>${guestNome}</strong>,</p>
    <p>${t.intro} <strong>${t.tomorrow}</strong> ${t.haveApp} <strong>${hostNome}</strong>.</p>
    <table class="table">
      <tr><th>${t.service}</th><td>${servizioNome}</td></tr>
      <tr><th>${t.date}</th><td>${fmtData}</td></tr>
      <tr><th>${t.time}</th><td>${fmtOra}</td></tr>
      <tr><th>${t.duration}</th><td>${durata} ${t.minutes}</td></tr>
    </table>
    <p>${t.cancel} <strong>${hostNome}</strong>.</p>
  `

  await dispatchMail({
    to: guestEmail,
    subject: `${t.subject} – ${servizioNome}`,
    html: base(htmlBody, null, privacyCtxFrom({ guestEmail, hostId, strutturaNome: hostNome })),
  }, hostId)
}

// ─── F&B: Conferma Scelte Pasto (per ospite) ────────────────────────────────

export async function sendEmailConfermaPasti(params: {
  guestEmail: string
  guestNome: string
  hostNome: string
  strutturaNome: string
  scelte: { data: string; tipoPasto: string; piattoNome: string }[]
  hostId?: string | null
}) {
  const { guestEmail, guestNome, hostNome, strutturaNome, scelte, hostId } = params

  const righe = scelte.map(s => {
    const data = new Date(s.data).toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'long' })
    const pasto = s.tipoPasto === 'COLAZIONE' ? '🌅 Colazione' : s.tipoPasto === 'PRANZO' ? '🍝 Pranzo' : '🍷 Cena'
    return `<tr><td style="padding:8px 12px;border-bottom:1px solid #f3f4f6;font-size:14px;">${data}</td><td style="padding:8px 12px;border-bottom:1px solid #f3f4f6;font-size:14px;">${pasto}</td><td style="padding:8px 12px;border-bottom:1px solid #f3f4f6;font-size:14px;font-weight:600;">${s.piattoNome}</td></tr>`
  }).join('')

  const htmlBody = `
    <p>Ciao <strong>${guestNome}</strong>,</p>
    <p>Le tue scelte pasto per il soggiorno a <strong>${strutturaNome}</strong> sono state confermate.</p>
    <table class="table">
      <tr>
        <th>Data</th><th>Pasto</th><th>Piatto</th>
      </tr>
      ${righe}
    </table>
    <p>Per qualsiasi modifica contatta <strong>${hostNome}</strong>.</p>
    <p style="color:#6b7280;font-size:13px;">Buon appetito!</p>
  `

  queueMail(`conferma-pasti:${guestEmail}`, {
    to: guestEmail,
    subject: `Conferma scelte pasto – ${strutturaNome}`,
    html: base(htmlBody, null, privacyCtxFrom({ guestEmail, hostId, strutturaNome })),
  }, hostId)
}

// ─── Conferma Ricezione Prenotazione (per ospite) ───────────────────────────

export async function sendEmailConfermaRicezione(params: {
  guestEmail: string
  guestNome: string
  hostNome: string
  strutturaNome: string
  dataArrivo: Date
  dataPartenza?: Date | null
  numOspiti: number
  prezzoTotale?: number | null
  chatUrl: string
  checkInUrl: string
  hostId?: string | null
}) {
  const {
    guestEmail, guestNome, hostNome, strutturaNome,
    dataArrivo, dataPartenza, numOspiti, prezzoTotale,
    chatUrl, checkInUrl, hostId,
  } = params

  const fmt = (d: Date) =>
    d.toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })

  const htmlBody = `
    <p>Ciao <strong>${guestNome}</strong>,</p>
    <p>Abbiamo ricevuto la tua richiesta di prenotazione per <strong>${strutturaNome}</strong>.
       <span class="badge badge-yellow">In attesa di conferma</span></p>
    <p>L'organizzatore <strong>${hostNome}</strong> la esaminerà e ti contatterà al più presto.</p>
    <table class="table">
      <tr><th>Struttura</th><td>${strutturaNome}</td></tr>
      <tr><th>Organizzatore</th><td>${hostNome}</td></tr>
      <tr><th>Arrivo</th><td>${fmt(dataArrivo)}</td></tr>
      ${dataPartenza ? `<tr><th>Partenza</th><td>${fmt(dataPartenza)}</td></tr>` : ''}
      <tr><th>Ospiti</th><td>${numOspiti}</td></tr>
      ${prezzoTotale != null ? `<tr><th>Totale stimato</th><td>€${prezzoTotale.toFixed(2)}</td></tr>` : ''}
    </table>
    <p><a class="btn" href="${chatUrl}">💬 Chatta con l'organizzatore</a></p>
    <p>Completa il <strong>check-in online</strong> per velocizzare l'ingresso:</p>
    <p><a class="btn" style="background:#059669;" href="${checkInUrl}">✅ Check-in online</a></p>
    <p style="color:#6b7280;font-size:13px;">
      Questa è una richiesta di prenotazione, non una conferma. Riceverai un'altra email quando l'organizzatore confermerà.
    </p>
  `

  queueMail(`conferma-ricezione:${guestEmail}`, {
    to: guestEmail,
    subject: `Richiesta ricevuta – ${strutturaNome}`,
    html: base(htmlBody, null, privacyCtxFrom({ guestEmail, hostId, strutturaNome })),
  }, hostId)
}

// ─── Pre-Check-in Online (per ospite) ─────────────────────────────────────────
// Email branded con CTA grande per completare il check-in prima dell'arrivo.

export async function sendEmailPreCheckin(params: {
  guestEmail: string
  guestNome: string
  strutturaNome: string
  strutturaIndirizzo?: string | null
  strutturaCitta?: string | null
  unitaNome?: string | null
  hostNome: string
  hostTelefono?: string | null
  dataArrivo: Date
  dataPartenza?: Date | null
  numOspiti: number
  checkInUrl: string
  lingua?: string | null
  hostId?: string | null
  strutturaId?: string | null
  pin?: string | null
}) {
  const {
    guestEmail, guestNome, strutturaNome, strutturaIndirizzo, strutturaCitta,
    unitaNome, hostNome, hostTelefono, dataArrivo, dataPartenza,
    numOspiti, checkInUrl, lingua, hostId, strutturaId, pin,
  } = params

  const lang = (lingua || 'it') as 'it' | 'en' | 'de' | 'fr'
  const fmtArrivo = dataArrivo.toLocaleDateString(lang === 'it' ? 'it-IT' : lang === 'de' ? 'de-DE' : lang === 'fr' ? 'fr-FR' : 'en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
  const fmtPartenza = dataPartenza?.toLocaleDateString(lang === 'it' ? 'it-IT' : lang === 'de' ? 'de-DE' : lang === 'fr' ? 'fr-FR' : 'en-GB', {
    weekday: 'long', day: 'numeric', month: 'long',
  })

  const subjects: Record<string, string> = {
    it: `Preparati per il soggiorno a ${strutturaNome}`,
    en: `Get ready for your stay at ${strutturaNome}`,
    de: `Bereiten Sie sich auf Ihren Aufenthalt vor – ${strutturaNome}`,
    fr: `Préparez votre séjour à ${strutturaNome}`,
  }

  const ctaLabels: Record<string, string> = {
    it: 'Completa il check-in',
    en: 'Complete check-in',
    de: 'Online einchecken',
    fr: 'Effectuer le check-in',
  }

  const intros: Record<string, string> = {
    it: `Ciao <strong>${guestNome}</strong>,<br>il tuo soggiorno a <strong>${strutturaNome}</strong> si avvicina!`,
    en: `Hi <strong>${guestNome}</strong>,<br>your stay at <strong>${strutturaNome}</strong> is almost here!`,
    de: `Hallo <strong>${guestNome}</strong>,<br>Ihr Aufenthalt in <strong>${strutturaNome}</strong> steht bevor!`,
    fr: `Bonjour <strong>${guestNome}</strong>,<br>votre séjour à <strong>${strutturaNome}</strong> approche !`,
  }

  const bodies: Record<string, string> = {
    it: 'Per velocizzare il tuo arrivo, puoi completare il check-in online adesso. Ti chiederemo i dati di tutti gli ospiti e la firma — così in reception sarà questione di un minuto.',
    en: 'To speed up your arrival, you can complete your online check-in now. We\'ll ask for guest details and a signature — so at reception it will only take a minute.',
    de: 'Um Ihre Ankunft zu beschleunigen, können Sie jetzt Ihren Online-Check-in abschließen. An der Rezeption dauert es dann nur eine Minute.',
    fr: 'Pour accélérer votre arrivée, vous pouvez effectuer votre check-in en ligne maintenant. À la réception, ce sera l\'affaire d\'une minute.',
  }

  const footerNotes: Record<string, string> = {
    it: 'Se preferisci, puoi completare il check-in direttamente in struttura al tuo arrivo.',
    en: 'If you prefer, you can also check in directly at the property on arrival.',
    de: 'Sie können den Check-in auch direkt bei Ihrer Ankunft durchführen.',
    fr: 'Si vous préférez, vous pouvez effectuer le check-in directement sur place.',
  }

  const camera = unitaNome || ''
  const ospiti = numOspiti > 1 ? `${numOspiti} ${lang === 'it' ? 'ospiti' : lang === 'en' ? 'guests' : lang === 'de' ? 'Gäste' : 'personnes'}` : ''
  const pinBlock = pin ? `<tr><th>PIN</th><td style="font-size:18px;letter-spacing:4px;font-weight:700;color:#4f46e5;">${pin}</td></tr>` : ''

  const htmlBody = `
    <p>${intros[lang] || intros.it}</p>

    <table class="table">
      <tr><th>📅 ${lang === 'it' ? 'Arrivo' : lang === 'en' ? 'Arrival' : lang === 'de' ? 'Anreise' : 'Arrivée'}</th><td>${fmtArrivo}</td></tr>
      ${fmtPartenza ? `<tr><th>${lang === 'it' ? 'Partenza' : lang === 'en' ? 'Departure' : lang === 'de' ? 'Abreise' : 'Départ'}</th><td>${fmtPartenza}</td></tr>` : ''}
      ${camera ? `<tr><th>🏠 ${lang === 'it' ? 'Camera' : 'Room'}</th><td>${camera}</td></tr>` : ''}
      ${ospiti ? `<tr><th>${lang === 'it' ? 'Ospiti' : 'Guests'}</th><td>${ospiti}</td></tr>` : ''}
      ${pinBlock}
    </table>

    <p style="margin-top:8px;">${bodies[lang] || bodies.it}</p>

    <p style="text-align:center;margin:24px 0;">
      <a class="btn" href="${checkInUrl}" style="font-size:16px;padding:16px 36px;">
        ${ctaLabels[lang] || ctaLabels.it} →
      </a>
    </p>

    <p style="font-size:12px;color:#9ca3af;margin-top:20px;">
      ${footerNotes[lang] || footerNotes.it}
    </p>

    ${strutturaIndirizzo || strutturaCitta ? `
      <p style="font-size:12px;color:#9ca3af;margin-top:12px;border-top:1px solid #e5e7eb;padding-top:12px;">
        📍 ${[strutturaIndirizzo, strutturaCitta].filter(Boolean).join(', ')}
        ${hostTelefono ? `<br>📞 ${hostTelefono}` : ''}
      </p>
    ` : ''}
  `

  const branding = await getBranding(strutturaId)
  await dispatchMail({
    to: guestEmail,
    subject: subjects[lang] || subjects.it,
    html: base(htmlBody, branding, privacyCtxFrom({ guestEmail, hostId, strutturaNome })),
  }, hostId)
}
