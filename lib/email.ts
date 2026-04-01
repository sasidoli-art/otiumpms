import nodemailer from 'nodemailer'
import { prisma } from '@/lib/db'
import { emailQueue } from '@/lib/email-queue'

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
    const host = await prisma.host.findUnique({
      where: { id: hostId },
      select: { smtpHost: true, smtpPort: true, smtpUser: true, smtpPass: true, emailMittente: true },
    })
    if (host?.smtpUser && host.smtpPass && host.smtpHost) {
      const t = nodemailer.createTransport({
        host: host.smtpHost,
        port: host.smtpPort ?? 587,
        secure: (host.smtpPort ?? 587) === 465,
        auth: { user: host.smtpUser, pass: host.smtpPass },
      })
      return {
        transporter: t,
        from: host.emailMittente ?? host.smtpUser,
      }
    }
  }
  // Fallback: SMTP globale della piattaforma
  const t = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: Number(process.env.SMTP_PORT) || 587,
    secure: false,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  })
  return {
    transporter: t,
    from: `"Otium Week" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
  }
}

/** Helper interno: invia una email usando il transporter corretto per il host. */
async function dispatchMail(
  opts: { to: string; subject: string; html: string },
  hostId?: string | null,
) {
  const { transporter, from } = await getTransporterAndFrom(hostId)
  await transporter.sendMail({ from, ...opts })
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
}) {
  const html = base(`<div style="white-space: pre-wrap; font-size: 14px; color: #374151;">${params.text.replace(/\n/g, '<br>')}</div>`)
  await dispatchMail({ to: params.to, subject: params.subject, html }, params.hostId)
}

function base(contenuto: string): string {
  return `
    <!DOCTYPE html>
    <html lang="it">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f4f4f5; margin: 0; padding: 0; }
        .wrapper { max-width: 560px; margin: 32px auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,.12); }
        .header { background: #4f46e5; padding: 24px 32px; }
        .header h1 { color: #ffffff; margin: 0; font-size: 20px; font-weight: 700; }
        .body { padding: 28px 32px; color: #374151; line-height: 1.6; }
        .body p { margin: 0 0 14px; }
        .table { width: 100%; border-collapse: collapse; margin: 16px 0; }
        .table th { background: #f9fafb; text-align: left; padding: 8px 12px; font-size: 12px; text-transform: uppercase; color: #6b7280; border-bottom: 1px solid #e5e7eb; }
        .table td { padding: 10px 12px; border-bottom: 1px solid #f3f4f6; font-size: 14px; }
        .btn { display: inline-block; background: #4f46e5; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 600; font-size: 14px; margin: 8px 0; }
        .footer { padding: 16px 32px; background: #f9fafb; font-size: 12px; color: #9ca3af; text-align: center; }
        .badge { display: inline-block; padding: 2px 10px; border-radius: 12px; font-size: 12px; font-weight: 600; }
        .badge-yellow { background: #fef9c3; color: #854d0e; }
        .badge-green { background: #dcfce7; color: #166534; }
      </style>
    </head>
    <body>
      <div class="wrapper">
        <div class="header"><h1>Otium Week — Gestionale</h1></div>
        <div class="body">${contenuto}</div>
        <div class="footer">Otium Week · otiumweek.it</div>
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
}) {
  const { guestEmail, guestNome, strutturaNome, hostNome, dataArrivo, dataPartenza, numOspiti, prezzoTotale, hostId } = params
  const fmt = (d: Date) =>
    d.toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })

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
    </table>
    <p>Per ulteriori informazioni o domande, rispondi a questa email.</p>
  `

  await dispatchMail({
    to: guestEmail,
    subject: `Prenotazione confermata – ${strutturaNome}`,
    html: base(htmlBody),
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
  hostId?: string | null
}) {
  const { guestEmail, guestNome, strutturaNome, hostNome, dataArrivo, lingua, hostId } = params
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
    html: base(t.body),
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
  hostId?: string | null
}) {
  const { destinatarioEmail, destinatarioNome, mittenteNome, strutturaNome, testo, chatUrl, hostId } = params

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
  `

  await dispatchMail({
    to: destinatarioEmail,
    subject: `Nuovo messaggio da ${mittenteNome} – ${strutturaNome}`,
    html: base(htmlBody),
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
    html: base(htmlBody),
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
    html: base(htmlBody),
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
    html: base(htmlBody),
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
    html: base(htmlBody),
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
  hostId?: string | null
}) {
  const { guestEmail, guestNome, hostNome, servizioNome, dataOra, durata, hostId } = params

  const fmtData = dataOra.toLocaleDateString('it-IT', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
  const fmtOra = dataOra.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })

  const htmlBody = `
    <p>Ciao <strong>${guestNome}</strong>,</p>
    <p>Ti ricordiamo che <strong>domani</strong> hai un appuntamento SPA con <strong>${hostNome}</strong>.</p>
    <table class="table">
      <tr><th>Servizio</th><td>${servizioNome}</td></tr>
      <tr><th>Data</th><td>${fmtData}</td></tr>
      <tr><th>Orario</th><td>${fmtOra}</td></tr>
      <tr><th>Durata</th><td>${durata} minuti</td></tr>
    </table>
    <p>Per disdire o modificare l'appuntamento contatta <strong>${hostNome}</strong>.</p>
  `

  await dispatchMail({
    to: guestEmail,
    subject: `Promemoria appuntamento SPA domani – ${servizioNome}`,
    html: base(htmlBody),
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
    html: base(htmlBody),
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
    html: base(htmlBody),
  }, hostId)
}
