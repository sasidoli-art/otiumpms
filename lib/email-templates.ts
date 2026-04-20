/**
 * Email Template Registry — catalogo di TUTTI i template email del PMS.
 *
 * Ogni template ha:
 *  - metadata (trigger, destinatario, configurabile, ritardo)
 *  - funzione render(ctx, lang) → { subject, bodyHtml }
 *
 * Il wrapping HTML (layout con branding + privacy footer) e' gestito da
 * `renderEmail()` tramite `renderLayout()` in lib/email-layout.ts.
 *
 * Lingue supportate: it (default), en, de, fr.
 * Il fallback per lingua sconosciuta e' sempre italiano.
 */

import { renderLayout, getBranding, privacyCtxFrom, type EmailBranding } from '@/lib/email-layout'

// ─── Metadata registry ──────────────────────────────────────────────────────

export type EmailTemplateId =
  | 'conferma_prenotazione'
  | 'prenotazione_richiesta_host'
  | 'pre_checkin'
  | 'reminder_arrivo'
  | 'benvenuto'
  | 'follow_up'
  | 'cancellazione'
  | 'conferma_spa'
  | 'reminder_spa'

export type Destinatario = 'ospite' | 'host' | 'staff'

export interface EmailTemplate {
  id: EmailTemplateId
  nome: string
  trigger: string
  destinatario: Destinatario
  configurabileHost: boolean
  /** Ritardo in ore dal trigger. Negativo = prima dell'evento. 0 = immediato. */
  ritardo: number
  /** Marketing = richiede link unsubscribe esplicito nel footer */
  marketing?: boolean
}

export const EMAIL_TEMPLATES: EmailTemplate[] = [
  // ── Ciclo prenotazione ──
  {
    id: 'conferma_prenotazione',
    nome: 'Conferma prenotazione',
    trigger: 'Prenotazione confermata (stato CONFERMATA)',
    destinatario: 'ospite',
    configurabileHost: true,
    ritardo: 0,
  },
  {
    id: 'prenotazione_richiesta_host',
    nome: 'Notifica nuova prenotazione',
    trigger: 'Nuova prenotazione ricevuta',
    destinatario: 'host',
    configurabileHost: false,
    ritardo: 0,
  },
  {
    id: 'pre_checkin',
    nome: 'Link check-in online',
    trigger: 'X ore prima dell arrivo (default 72h)',
    destinatario: 'ospite',
    configurabileHost: true,
    ritardo: -72,
  },
  {
    id: 'reminder_arrivo',
    nome: 'Promemoria arrivo',
    trigger: '24 ore prima dell arrivo',
    destinatario: 'ospite',
    configurabileHost: true,
    ritardo: -24,
  },
  {
    id: 'benvenuto',
    nome: 'Benvenuto in struttura',
    trigger: 'Check-in completato (statoCheckIn = VERIFICATO)',
    destinatario: 'ospite',
    configurabileHost: true,
    ritardo: 0,
  },
  {
    id: 'follow_up',
    nome: 'Grazie per il soggiorno',
    trigger: 'Dopo il checkout',
    destinatario: 'ospite',
    configurabileHost: true,
    ritardo: 24,
    marketing: true,
  },
  {
    id: 'cancellazione',
    nome: 'Conferma cancellazione',
    trigger: 'Prenotazione annullata',
    destinatario: 'ospite',
    configurabileHost: true,
    ritardo: 0,
  },
  // ── SPA ──
  {
    id: 'conferma_spa',
    nome: 'Conferma appuntamento SPA',
    trigger: 'Appuntamento SPA creato',
    destinatario: 'ospite',
    configurabileHost: true,
    ritardo: 0,
  },
  {
    id: 'reminder_spa',
    nome: 'Promemoria SPA',
    trigger: '24 ore prima dell appuntamento',
    destinatario: 'ospite',
    configurabileHost: true,
    ritardo: -24,
  },
]

export function getTemplateMeta(id: EmailTemplateId): EmailTemplate | undefined {
  return EMAIL_TEMPLATES.find((t) => t.id === id)
}

// ─── Context + i18n ─────────────────────────────────────────────────────────

export type Lingua = 'it' | 'en' | 'de' | 'fr'

type MinStruttura = {
  id: string
  nome: string
  indirizzo?: string | null
  citta?: string | null
  telefono?: string | null
}

type MinHost = {
  id: string
  nomeAzienda: string
  telefono?: string | null
}

type MinPrenotazione = {
  id: string
  guestNome: string
  guestCognome?: string | null
  guestEmail: string
  guestTelefono?: string | null
  guestNote?: string | null
  guestLingua?: string | null
  dataArrivo: Date
  dataPartenza?: Date | null
  numOspiti: number
  prezzoTotale?: number | null
  pin?: string | null
  checkInToken?: string | null
  unita?: { nome: string } | null
}

type MinAppuntamentoSpa = {
  id: string
  guestNome: string
  guestCognome?: string | null
  guestEmail?: string | null
  guestTelefono?: string | null
  dataOra: Date
  durata: number
  prezzoTotale?: number | null
  note?: string | null
  trattamento?: { nome: string } | null
  percorso?: { nome: string } | null
}

export interface RenderContext {
  struttura?: MinStruttura | null
  host: MinHost
  prenotazione?: MinPrenotazione | null
  appuntamentoSpa?: MinAppuntamentoSpa | null
  lingua?: string | null
  extraData?: Record<string, unknown>
}

function normLingua(l?: string | null): Lingua {
  const low = (l ?? 'it').toLowerCase()
  if (low === 'en' || low === 'de' || low === 'fr') return low
  return 'it'
}

function localeFor(lang: Lingua): string {
  return { it: 'it-IT', en: 'en-GB', de: 'de-DE', fr: 'fr-FR' }[lang]
}

function fmtData(d: Date, lang: Lingua): string {
  return d.toLocaleDateString(localeFor(lang), { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}
function fmtDataBreve(d: Date, lang: Lingua): string {
  return d.toLocaleDateString(localeFor(lang), { day: 'numeric', month: 'long' })
}
function fmtOra(d: Date, lang: Lingua): string {
  return d.toLocaleTimeString(localeFor(lang), { hour: '2-digit', minute: '2-digit' })
}

function baseUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || 'http://localhost:3000'
}

// ─── i18n strings ────────────────────────────────────────────────────────────

type I18n = Record<Lingua, Record<string, string>>

const T: I18n = {
  it: {
    hi: 'Ciao', dear: 'Caro/a',
    property: 'Struttura', room: 'Camera', host: 'Organizzatore',
    arrival: 'Arrivo', departure: 'Partenza', guests: 'Ospiti',
    total: 'Totale', pin: 'PIN personale',
    address: 'Indirizzo', contact: 'Contatto',
    service: 'Servizio', date: 'Data', time: 'Orario', duration: 'Durata', minutes: 'minuti',
    confirmed: 'Confermata', pending: 'In attesa', cancelled: 'Cancellata',
    checkIn: 'Check-in online', completeCheckIn: 'Completa il check-in',
    manageBooking: 'Gestisci prenotazione', bookAgain: 'Prenota di nuovo',
    confirmedSpa: 'Confermato', cancelledSpa: 'Cancellato',
    reminderSpaSubject: 'Promemoria appuntamento SPA domani',
    tomorrow: 'domani',
    pinHelp: 'Usa questo PIN per: Wi-Fi, servizi in camera, concierge e checkout. Non condividerlo con altri.',
  },
  en: {
    hi: 'Hi', dear: 'Dear',
    property: 'Property', room: 'Room', host: 'Host',
    arrival: 'Check-in', departure: 'Check-out', guests: 'Guests',
    total: 'Total', pin: 'Your PIN',
    address: 'Address', contact: 'Contact',
    service: 'Service', date: 'Date', time: 'Time', duration: 'Duration', minutes: 'minutes',
    confirmed: 'Confirmed', pending: 'Pending', cancelled: 'Cancelled',
    checkIn: 'Online check-in', completeCheckIn: 'Complete check-in',
    manageBooking: 'Manage booking', bookAgain: 'Book again',
    confirmedSpa: 'Confirmed', cancelledSpa: 'Cancelled',
    reminderSpaSubject: 'SPA appointment reminder — tomorrow',
    tomorrow: 'tomorrow',
    pinHelp: 'Use this PIN for: Wi-Fi, in-room services, concierge and checkout. Do not share it.',
  },
  de: {
    hi: 'Hallo', dear: 'Liebe/r',
    property: 'Unterkunft', room: 'Zimmer', host: 'Gastgeber',
    arrival: 'Anreise', departure: 'Abreise', guests: 'Gäste',
    total: 'Gesamt', pin: 'Ihre PIN',
    address: 'Adresse', contact: 'Kontakt',
    service: 'Leistung', date: 'Datum', time: 'Uhrzeit', duration: 'Dauer', minutes: 'Minuten',
    confirmed: 'Bestätigt', pending: 'Ausstehend', cancelled: 'Storniert',
    checkIn: 'Online Check-in', completeCheckIn: 'Check-in abschließen',
    manageBooking: 'Buchung verwalten', bookAgain: 'Erneut buchen',
    confirmedSpa: 'Bestätigt', cancelledSpa: 'Storniert',
    reminderSpaSubject: 'SPA-Termin Erinnerung — morgen',
    tomorrow: 'morgen',
    pinHelp: 'Verwenden Sie diese PIN für: WLAN, Zimmerservice, Concierge und Checkout. Bitte nicht weitergeben.',
  },
  fr: {
    hi: 'Bonjour', dear: 'Cher/e',
    property: 'Établissement', room: 'Chambre', host: 'Hôte',
    arrival: 'Arrivée', departure: 'Départ', guests: 'Personnes',
    total: 'Total', pin: 'Votre PIN',
    address: 'Adresse', contact: 'Contact',
    service: 'Service', date: 'Date', time: 'Heure', duration: 'Durée', minutes: 'minutes',
    confirmed: 'Confirmée', pending: 'En attente', cancelled: 'Annulée',
    checkIn: 'Check-in en ligne', completeCheckIn: 'Effectuer le check-in',
    manageBooking: 'Gérer la réservation', bookAgain: 'Réserver à nouveau',
    confirmedSpa: 'Confirmé', cancelledSpa: 'Annulé',
    reminderSpaSubject: 'Rappel rendez-vous SPA — demain',
    tomorrow: 'demain',
    pinHelp: 'Utilisez ce PIN pour : Wi-Fi, services en chambre, conciergerie et checkout. Ne le partagez pas.',
  },
}

// ─── Template renderers ─────────────────────────────────────────────────────

type Rendered = { subject: string; bodyHtml: string }

function renderConfermaPrenotazione(ctx: RenderContext, lang: Lingua): Rendered {
  const p = ctx.prenotazione!
  const strutturaNome = ctx.struttura?.nome ?? ctx.host.nomeAzienda
  const t = T[lang]
  const pinBlock = p.pin ? `
    <tr><th>${t.pin}</th><td><strong style="font-size:18px;letter-spacing:4px;color:#4f46e5;">${p.pin}</strong></td></tr>
    <tr><td colspan="2" style="font-size:11px;color:#6b7280;padding-top:4px;">${t.pinHelp}</td></tr>
  ` : ''

  const greeting = {
    it: `Ciao <strong>${p.guestNome}</strong>, la tua prenotazione per <strong>${strutturaNome}</strong> è stata <strong>confermata</strong>.`,
    en: `Hi <strong>${p.guestNome}</strong>, your booking at <strong>${strutturaNome}</strong> has been <strong>confirmed</strong>.`,
    de: `Hallo <strong>${p.guestNome}</strong>, Ihre Buchung bei <strong>${strutturaNome}</strong> wurde <strong>bestätigt</strong>.`,
    fr: `Bonjour <strong>${p.guestNome}</strong>, votre réservation à <strong>${strutturaNome}</strong> a été <strong>confirmée</strong>.`,
  }[lang]

  const subject = {
    it: `Prenotazione confermata – ${strutturaNome}`,
    en: `Booking confirmed – ${strutturaNome}`,
    de: `Buchung bestätigt – ${strutturaNome}`,
    fr: `Réservation confirmée – ${strutturaNome}`,
  }[lang]

  const bodyHtml = `
    <p>${greeting} <span class="badge badge-green">${t.confirmed}</span></p>
    <table class="table">
      <tr><th>${t.property}</th><td>${strutturaNome}${p.unita?.nome ? ` (${p.unita.nome})` : ''}</td></tr>
      <tr><th>${t.host}</th><td>${ctx.host.nomeAzienda}</td></tr>
      <tr><th>${t.arrival}</th><td>${fmtData(p.dataArrivo, lang)}</td></tr>
      ${p.dataPartenza ? `<tr><th>${t.departure}</th><td>${fmtData(p.dataPartenza, lang)}</td></tr>` : ''}
      <tr><th>${t.guests}</th><td>${p.numOspiti}</td></tr>
      ${p.prezzoTotale != null ? `<tr><th>${t.total}</th><td>€${p.prezzoTotale.toFixed(2)}</td></tr>` : ''}
      ${pinBlock}
    </table>
  `
  return { subject, bodyHtml }
}

function renderPrenotazioneRichiestaHost(ctx: RenderContext, _lang: Lingua): Rendered {
  // Email per host: sempre in italiano
  const p = ctx.prenotazione!
  const strutturaNome = ctx.struttura?.nome ?? '—'
  const subject = `Nuova prenotazione da ${p.guestNome} ${p.guestCognome ?? ''} – ${strutturaNome}`
  const bodyHtml = `
    <p>Ciao <strong>${ctx.host.nomeAzienda}</strong>,</p>
    <p>Hai ricevuto una nuova prenotazione per <strong>${strutturaNome}</strong>.
       <span class="badge badge-yellow">In attesa</span></p>
    <table class="table">
      <tr><th>Ospite</th><td>${p.guestNome} ${p.guestCognome ?? ''}</td></tr>
      <tr><th>Email</th><td><a href="mailto:${p.guestEmail}">${p.guestEmail}</a></td></tr>
      ${p.guestTelefono ? `<tr><th>Telefono</th><td>${p.guestTelefono}</td></tr>` : ''}
      <tr><th>Struttura</th><td>${strutturaNome}</td></tr>
      <tr><th>Arrivo</th><td>${fmtData(p.dataArrivo, 'it')}</td></tr>
      ${p.dataPartenza ? `<tr><th>Partenza</th><td>${fmtData(p.dataPartenza, 'it')}</td></tr>` : ''}
      <tr><th>Ospiti</th><td>${p.numOspiti}</td></tr>
      ${p.guestNote ? `<tr><th>Note ospite</th><td>${p.guestNote}</td></tr>` : ''}
    </table>
    <p><a class="btn" href="${baseUrl()}/host/prenotazioni/${p.id}">Gestisci prenotazione →</a></p>
  `
  return { subject, bodyHtml }
}

function renderPreCheckin(ctx: RenderContext, lang: Lingua): Rendered {
  const p = ctx.prenotazione!
  const strutturaNome = ctx.struttura?.nome ?? ctx.host.nomeAzienda
  const t = T[lang]
  const checkInUrl = p.checkInToken ? `${baseUrl()}/checkin/${p.checkInToken}` : `${baseUrl()}/checkin`

  const subject = {
    it: `Preparati per il soggiorno a ${strutturaNome}`,
    en: `Get ready for your stay at ${strutturaNome}`,
    de: `Bereiten Sie sich auf Ihren Aufenthalt vor – ${strutturaNome}`,
    fr: `Préparez votre séjour à ${strutturaNome}`,
  }[lang]

  const intro = {
    it: `Ciao <strong>${p.guestNome}</strong>,<br>il tuo soggiorno a <strong>${strutturaNome}</strong> si avvicina!`,
    en: `Hi <strong>${p.guestNome}</strong>,<br>your stay at <strong>${strutturaNome}</strong> is almost here!`,
    de: `Hallo <strong>${p.guestNome}</strong>,<br>Ihr Aufenthalt in <strong>${strutturaNome}</strong> steht bevor!`,
    fr: `Bonjour <strong>${p.guestNome}</strong>,<br>votre séjour à <strong>${strutturaNome}</strong> approche !`,
  }[lang]

  const body = {
    it: 'Per velocizzare il tuo arrivo, puoi completare il check-in online adesso. Ti chiederemo i dati di tutti gli ospiti e la firma.',
    en: 'To speed up your arrival, you can complete your online check-in now. We will ask for guest details and a signature.',
    de: 'Um Ihre Ankunft zu beschleunigen, können Sie jetzt Ihren Online-Check-in abschließen.',
    fr: 'Pour accélérer votre arrivée, vous pouvez effectuer votre check-in en ligne maintenant.',
  }[lang]

  const pinBlock = p.pin ? `<tr><th>${t.pin}</th><td style="font-size:18px;letter-spacing:4px;font-weight:700;color:#4f46e5;">${p.pin}</td></tr>` : ''

  const bodyHtml = `
    <p>${intro}</p>
    <table class="table">
      <tr><th>${t.arrival}</th><td>${fmtData(p.dataArrivo, lang)}</td></tr>
      ${p.dataPartenza ? `<tr><th>${t.departure}</th><td>${fmtData(p.dataPartenza, lang)}</td></tr>` : ''}
      ${p.unita?.nome ? `<tr><th>${t.room}</th><td>${p.unita.nome}</td></tr>` : ''}
      <tr><th>${t.guests}</th><td>${p.numOspiti}</td></tr>
      ${pinBlock}
    </table>
    <p>${body}</p>
    <p style="text-align:center;margin:24px 0;">
      <a class="btn" href="${checkInUrl}" style="font-size:16px;padding:16px 36px;">${t.completeCheckIn} →</a>
    </p>
    ${ctx.struttura?.indirizzo || ctx.struttura?.citta ? `
      <p style="font-size:12px;color:#9ca3af;margin-top:12px;border-top:1px solid #e5e7eb;padding-top:12px;">
        📍 ${[ctx.struttura.indirizzo, ctx.struttura.citta].filter(Boolean).join(', ')}
        ${ctx.host.telefono ? `<br>📞 ${ctx.host.telefono}` : ''}
      </p>` : ''}
  `
  return { subject, bodyHtml }
}

function renderReminderArrivo(ctx: RenderContext, lang: Lingua): Rendered {
  const p = ctx.prenotazione!
  const strutturaNome = ctx.struttura?.nome ?? ctx.host.nomeAzienda
  const t = T[lang]
  const checkInUrl = p.checkInToken ? `${baseUrl()}/checkin/${p.checkInToken}` : null

  const subject = {
    it: `Promemoria: il tuo soggiorno a ${strutturaNome} è domani!`,
    en: `Reminder: your stay at ${strutturaNome} is tomorrow!`,
    de: `Erinnerung: Ihr Aufenthalt in ${strutturaNome} ist morgen!`,
    fr: `Rappel : votre séjour à ${strutturaNome} est demain !`,
  }[lang]

  const intro = {
    it: `Ciao <strong>${p.guestNome}</strong>, il tuo soggiorno presso <strong>${strutturaNome}</strong> è previsto per <strong>domani</strong>!`,
    en: `Hi <strong>${p.guestNome}</strong>, your stay at <strong>${strutturaNome}</strong> is coming up <strong>tomorrow</strong>!`,
    de: `Hallo <strong>${p.guestNome}</strong>, Ihr Aufenthalt in <strong>${strutturaNome}</strong> beginnt <strong>morgen</strong>!`,
    fr: `Bonjour <strong>${p.guestNome}</strong>, votre séjour à <strong>${strutturaNome}</strong> est prévu <strong>demain</strong> !`,
  }[lang]

  const outro = {
    it: `Ti aspettiamo! Per qualsiasi domanda contatta <strong>${ctx.host.nomeAzienda}</strong>.`,
    en: `We look forward to welcoming you! For any questions, contact <strong>${ctx.host.nomeAzienda}</strong>.`,
    de: `Wir freuen uns auf Sie! Fragen? Kontaktieren Sie <strong>${ctx.host.nomeAzienda}</strong>.`,
    fr: `Nous vous attendons ! Pour toute question, contactez <strong>${ctx.host.nomeAzienda}</strong>.`,
  }[lang]

  const bodyHtml = `
    <p>${intro}</p>
    <table class="table">
      <tr><th>${t.property}</th><td>${strutturaNome}${p.unita?.nome ? ` (${p.unita.nome})` : ''}</td></tr>
      <tr><th>${t.arrival}</th><td>${fmtData(p.dataArrivo, lang)}</td></tr>
      ${p.dataPartenza ? `<tr><th>${t.departure}</th><td>${fmtData(p.dataPartenza, lang)}</td></tr>` : ''}
      <tr><th>${t.guests}</th><td>${p.numOspiti}</td></tr>
      ${ctx.struttura?.indirizzo ? `<tr><th>${t.address}</th><td>${ctx.struttura.indirizzo}${ctx.struttura.citta ? `, ${ctx.struttura.citta}` : ''}</td></tr>` : ''}
      ${ctx.host.telefono ? `<tr><th>${t.contact}</th><td>${ctx.host.telefono}</td></tr>` : ''}
    </table>
    ${checkInUrl ? `
      <p><a class="btn" href="${checkInUrl}">${t.completeCheckIn} →</a></p>
    ` : ''}
    <p style="color:#6b7280;font-size:13px;">${outro}</p>
  `
  return { subject, bodyHtml }
}

function renderBenvenuto(ctx: RenderContext, lang: Lingua): Rendered {
  const p = ctx.prenotazione!
  const strutturaNome = ctx.struttura?.nome ?? ctx.host.nomeAzienda

  const subject = {
    it: `Benvenuto a ${strutturaNome}!`,
    en: `Welcome to ${strutturaNome}!`,
    de: `Willkommen in ${strutturaNome}!`,
    fr: `Bienvenue à ${strutturaNome} !`,
  }[lang]

  const body = {
    it: `<p>Ciao <strong>${p.guestNome}</strong>,</p><p>Benvenuto/a presso <strong>${strutturaNome}</strong>! Il tuo check-in è stato registrato con successo.</p><p>${p.pin ? `Il tuo PIN personale è <strong style="font-size:18px;letter-spacing:4px;color:#4f46e5;">${p.pin}</strong>. Ti servirà per Wi-Fi, servizi in camera, concierge e checkout.` : ''}</p><p>Per qualsiasi richiesta, il nostro staff è a tua disposizione. Ti auguriamo un soggiorno piacevole!</p>`,
    en: `<p>Hi <strong>${p.guestNome}</strong>,</p><p>Welcome to <strong>${strutturaNome}</strong>! Your check-in has been successfully registered.</p><p>${p.pin ? `Your personal PIN is <strong style="font-size:18px;letter-spacing:4px;color:#4f46e5;">${p.pin}</strong>. Use it for Wi-Fi, in-room services, concierge and checkout.` : ''}</p><p>For any request, our staff is at your disposal. We wish you a pleasant stay!</p>`,
    de: `<p>Hallo <strong>${p.guestNome}</strong>,</p><p>Willkommen bei <strong>${strutturaNome}</strong>! Ihr Check-in wurde erfolgreich registriert.</p><p>${p.pin ? `Ihre persönliche PIN lautet <strong style="font-size:18px;letter-spacing:4px;color:#4f46e5;">${p.pin}</strong>.` : ''}</p><p>Für jede Anfrage steht unser Team zur Verfügung. Wir wünschen einen angenehmen Aufenthalt!</p>`,
    fr: `<p>Bonjour <strong>${p.guestNome}</strong>,</p><p>Bienvenue à <strong>${strutturaNome}</strong> ! Votre check-in a été enregistré avec succès.</p><p>${p.pin ? `Votre PIN personnel est <strong style="font-size:18px;letter-spacing:4px;color:#4f46e5;">${p.pin}</strong>.` : ''}</p><p>Notre équipe est à votre disposition. Nous vous souhaitons un agréable séjour !</p>`,
  }[lang]

  return { subject, bodyHtml: body }
}

function renderFollowUp(ctx: RenderContext, lang: Lingua): Rendered {
  const p = ctx.prenotazione!
  const strutturaNome = ctx.struttura?.nome ?? ctx.host.nomeAzienda
  const bookingUrl = ctx.struttura ? `${baseUrl()}/book/${ctx.struttura.id}` : null
  const t = T[lang]

  const subject = {
    it: `Grazie per il tuo soggiorno a ${strutturaNome}!`,
    en: `Thank you for your stay at ${strutturaNome}!`,
    de: `Vielen Dank für Ihren Aufenthalt – ${strutturaNome}!`,
    fr: `Merci pour votre séjour à ${strutturaNome} !`,
  }[lang]

  const openingGreeting = {
    it: `${t.dear} <strong>${p.guestNome}</strong>,`,
    en: `${t.dear} <strong>${p.guestNome}</strong>,`,
    de: `${t.dear} <strong>${p.guestNome}</strong>,`,
    fr: `${t.dear} <strong>${p.guestNome}</strong>,`,
  }[lang]

  const thanks = {
    it: `Grazie per aver soggiornato presso <strong>${strutturaNome}</strong>${p.dataPartenza ? ` dal ${fmtDataBreve(p.dataArrivo, lang)} al ${fmtDataBreve(p.dataPartenza, lang)}` : ''}. Speriamo che il tuo soggiorno sia stato piacevole!`,
    en: `Thank you for staying at <strong>${strutturaNome}</strong>${p.dataPartenza ? ` from ${fmtDataBreve(p.dataArrivo, lang)} to ${fmtDataBreve(p.dataPartenza, lang)}` : ''}. We hope you had a wonderful time!`,
    de: `Vielen Dank für Ihren Aufenthalt in <strong>${strutturaNome}</strong>${p.dataPartenza ? ` vom ${fmtDataBreve(p.dataArrivo, lang)} bis ${fmtDataBreve(p.dataPartenza, lang)}` : ''}. Wir hoffen, es hat Ihnen gefallen!`,
    fr: `Merci pour votre séjour à <strong>${strutturaNome}</strong>${p.dataPartenza ? ` du ${fmtDataBreve(p.dataArrivo, lang)} au ${fmtDataBreve(p.dataPartenza, lang)}` : ''}. Nous espérons que votre séjour a été agréable !`,
  }[lang]

  const feedbackTitle = {
    it: '⭐ Com\'è andato il tuo soggiorno?',
    en: '⭐ How was your stay?',
    de: '⭐ Wie war Ihr Aufenthalt?',
    fr: '⭐ Comment s\'est passé votre séjour ?',
  }[lang]

  const feedbackBody = {
    it: 'Il tuo feedback ci aiuta a migliorare e aiuta altri viaggiatori nella scelta.',
    en: 'Your feedback helps us improve and helps other travelers choose.',
    de: 'Ihr Feedback hilft uns zu verbessern und anderen Reisenden bei der Wahl.',
    fr: 'Votre avis nous aide à nous améliorer et guide d\'autres voyageurs.',
  }[lang]

  const bodyHtml = `
    <p>${openingGreeting}</p>
    <p>${thanks}</p>
    <div style="background:#f5f3ff;border-radius:8px;padding:20px;margin:16px 0;text-align:center;">
      <p style="margin:0 0 8px;font-size:16px;">${feedbackTitle}</p>
      <p style="margin:0;color:#6b7280;font-size:13px;">${feedbackBody}</p>
    </div>
    ${bookingUrl ? `<p style="text-align:center;"><a class="btn" href="${bookingUrl}">${t.bookAgain} →</a></p>` : ''}
  `
  return { subject, bodyHtml }
}

function renderCancellazione(ctx: RenderContext, lang: Lingua): Rendered {
  const p = ctx.prenotazione!
  const strutturaNome = ctx.struttura?.nome ?? ctx.host.nomeAzienda
  const t = T[lang]

  const subject = {
    it: `Prenotazione cancellata – ${strutturaNome}`,
    en: `Booking cancelled – ${strutturaNome}`,
    de: `Buchung storniert – ${strutturaNome}`,
    fr: `Réservation annulée – ${strutturaNome}`,
  }[lang]

  const body = {
    it: `<p>Ciao <strong>${p.guestNome}</strong>,</p><p>La tua prenotazione per <strong>${strutturaNome}</strong> del <strong>${fmtData(p.dataArrivo, lang)}</strong> è stata <span class="badge badge-red">${t.cancelled}</span></p><p>Per informazioni contatta <strong>${ctx.host.nomeAzienda}</strong>.</p>`,
    en: `<p>Hi <strong>${p.guestNome}</strong>,</p><p>Your booking at <strong>${strutturaNome}</strong> for <strong>${fmtData(p.dataArrivo, lang)}</strong> has been <span class="badge badge-red">${t.cancelled}</span></p><p>For more information, please contact <strong>${ctx.host.nomeAzienda}</strong>.</p>`,
    de: `<p>Hallo <strong>${p.guestNome}</strong>,</p><p>Ihre Buchung bei <strong>${strutturaNome}</strong> für <strong>${fmtData(p.dataArrivo, lang)}</strong> wurde <span class="badge badge-red">${t.cancelled}</span></p><p>Bei Fragen kontaktieren Sie <strong>${ctx.host.nomeAzienda}</strong>.</p>`,
    fr: `<p>Bonjour <strong>${p.guestNome}</strong>,</p><p>Votre réservation à <strong>${strutturaNome}</strong> pour le <strong>${fmtData(p.dataArrivo, lang)}</strong> a été <span class="badge badge-red">${t.cancelled}</span></p><p>Pour toute information, contactez <strong>${ctx.host.nomeAzienda}</strong>.</p>`,
  }[lang]

  return { subject, bodyHtml: body }
}

function renderConfermaSpa(ctx: RenderContext, lang: Lingua): Rendered {
  const a = ctx.appuntamentoSpa!
  const servizioNome = a.trattamento?.nome ?? a.percorso?.nome ?? 'Trattamento SPA'
  const t = T[lang]

  const subject = {
    it: `Appuntamento SPA confermato – ${servizioNome}`,
    en: `SPA appointment confirmed – ${servizioNome}`,
    de: `SPA-Termin bestätigt – ${servizioNome}`,
    fr: `Rendez-vous SPA confirmé – ${servizioNome}`,
  }[lang]

  const intro = {
    it: `Ciao <strong>${a.guestNome}</strong>, il tuo appuntamento SPA con <strong>${ctx.host.nomeAzienda}</strong> è stato <strong>confermato</strong>.`,
    en: `Hi <strong>${a.guestNome}</strong>, your SPA appointment with <strong>${ctx.host.nomeAzienda}</strong> has been <strong>confirmed</strong>.`,
    de: `Hallo <strong>${a.guestNome}</strong>, Ihr SPA-Termin bei <strong>${ctx.host.nomeAzienda}</strong> wurde <strong>bestätigt</strong>.`,
    fr: `Bonjour <strong>${a.guestNome}</strong>, votre rendez-vous SPA avec <strong>${ctx.host.nomeAzienda}</strong> est <strong>confirmé</strong>.`,
  }[lang]

  const bodyHtml = `
    <p>${intro} <span class="badge badge-green">${t.confirmedSpa}</span></p>
    <table class="table">
      <tr><th>${t.service}</th><td>${servizioNome}</td></tr>
      <tr><th>${t.date}</th><td>${fmtData(a.dataOra, lang)}</td></tr>
      <tr><th>${t.time}</th><td>${fmtOra(a.dataOra, lang)}</td></tr>
      <tr><th>${t.duration}</th><td>${a.durata} ${t.minutes}</td></tr>
      ${a.prezzoTotale != null ? `<tr><th>${t.total}</th><td><strong>€${a.prezzoTotale.toFixed(2)}</strong></td></tr>` : ''}
    </table>
  `
  return { subject, bodyHtml }
}

function renderReminderSpa(ctx: RenderContext, lang: Lingua): Rendered {
  const a = ctx.appuntamentoSpa!
  const servizioNome = a.trattamento?.nome ?? a.percorso?.nome ?? 'Trattamento SPA'
  const t = T[lang]

  const intro = {
    it: `Ti ricordiamo che <strong>${t.tomorrow}</strong> hai un appuntamento SPA con <strong>${ctx.host.nomeAzienda}</strong>.`,
    en: `Reminder: <strong>${t.tomorrow}</strong> you have a SPA appointment with <strong>${ctx.host.nomeAzienda}</strong>.`,
    de: `Erinnerung: <strong>${t.tomorrow}</strong> haben Sie einen SPA-Termin bei <strong>${ctx.host.nomeAzienda}</strong>.`,
    fr: `Rappel : <strong>${t.tomorrow}</strong> vous avez un rendez-vous SPA avec <strong>${ctx.host.nomeAzienda}</strong>.`,
  }[lang]

  const subject = `${t.reminderSpaSubject} – ${servizioNome}`

  const bodyHtml = `
    <p>${t.hi} <strong>${a.guestNome}</strong>,</p>
    <p>${intro}</p>
    <table class="table">
      <tr><th>${t.service}</th><td>${servizioNome}</td></tr>
      <tr><th>${t.date}</th><td>${fmtData(a.dataOra, lang)}</td></tr>
      <tr><th>${t.time}</th><td>${fmtOra(a.dataOra, lang)}</td></tr>
      <tr><th>${t.duration}</th><td>${a.durata} ${t.minutes}</td></tr>
    </table>
  `
  return { subject, bodyHtml }
}

// ─── Dispatch table ─────────────────────────────────────────────────────────

const RENDERERS: Record<EmailTemplateId, (ctx: RenderContext, lang: Lingua) => Rendered> = {
  conferma_prenotazione: renderConfermaPrenotazione,
  prenotazione_richiesta_host: renderPrenotazioneRichiestaHost,
  pre_checkin: renderPreCheckin,
  reminder_arrivo: renderReminderArrivo,
  benvenuto: renderBenvenuto,
  follow_up: renderFollowUp,
  cancellazione: renderCancellazione,
  conferma_spa: renderConfermaSpa,
  reminder_spa: renderReminderSpa,
}

/**
 * Customizzazioni opzionali del host per questo template.
 * Caricate da `ConfigEmail` — se il record manca, usa i default del template.
 */
export interface TemplateOverride {
  oggettoCustom?: string | null
  messaggioCustom?: string | null
  attiva?: boolean
}

/**
 * Render di un template email in HTML + subject.
 *
 *  - Seleziona il renderer per templateId
 *  - Sceglie la lingua (fallback it)
 *  - Applica eventuali override del host (oggetto + messaggio custom)
 *  - Avvolge il body nel layout (header/footer) con branding struttura
 *  - Aggiunge privacy footer (con link portale + unsubscribe se marketing)
 *  - Usa struttura.colorePrimario per CTA
 *
 * Per default, se `override` non e` passato, il renderer carica la
 * `ConfigEmail` del host automaticamente. Passa override=null per disabilitare.
 */
export async function renderEmail(
  templateId: EmailTemplateId,
  ctx: RenderContext,
  override?: TemplateOverride | null,
): Promise<{ subject: string; html: string }> {
  const lang = normLingua(ctx.lingua ?? ctx.prenotazione?.guestLingua ?? 'it')
  const renderer = RENDERERS[templateId]
  if (!renderer) throw new Error(`Template email sconosciuto: ${templateId}`)

  const meta = getTemplateMeta(templateId)

  // Load host override from ConfigEmail if not explicitly passed
  let resolvedOverride: TemplateOverride | null = override ?? null
  if (override === undefined && meta?.configurabileHost) {
    resolvedOverride = await loadHostConfig(ctx.host.id, templateId)
  }

  const base = renderer(ctx, lang)
  const subject = resolvedOverride?.oggettoCustom?.trim()
    ? resolvedOverride.oggettoCustom
    : base.subject

  // Injection del messaggio custom (solo se non vuoto)
  const customBlock = resolvedOverride?.messaggioCustom?.trim()
    ? `<div style="margin-top:16px;padding:14px 18px;border-radius:8px;background:#f9fafb;border-left:3px solid ${'#4f46e5'};color:#374151;line-height:1.55;white-space:pre-wrap;">${escapeBasicHtml(resolvedOverride.messaggioCustom)}</div>`
    : ''

  const bodyHtml = base.bodyHtml + customBlock

  const branding: EmailBranding | null = ctx.struttura
    ? await getBranding(ctx.struttura.id)
    : null

  // Privacy footer solo per email ospite (non per notifica host)
  const strutturaNome = ctx.struttura?.nome ?? ctx.host.nomeAzienda
  const privacy = meta?.destinatario === 'ospite' && ctx.prenotazione?.guestEmail
    ? privacyCtxFrom({
        guestEmail: ctx.prenotazione.guestEmail,
        hostId: ctx.host.id,
        strutturaNome,
        marketing: meta.marketing ?? false,
      })
    : meta?.destinatario === 'ospite' && ctx.appuntamentoSpa?.guestEmail
    ? privacyCtxFrom({
        guestEmail: ctx.appuntamentoSpa.guestEmail,
        hostId: ctx.host.id,
        strutturaNome,
        marketing: false,
      })
    : null

  const html = renderLayout(bodyHtml, branding, privacy)
  return { subject, html }
}

async function loadHostConfig(hostId: string, templateId: EmailTemplateId): Promise<TemplateOverride | null> {
  try {
    const { prisma } = await import('@/lib/db')
    const cfg = await prisma.configEmail.findUnique({
      where: { hostId_templateId: { hostId, templateId } },
    })
    if (!cfg) return null
    return {
      oggettoCustom: cfg.oggettoCustom,
      messaggioCustom: cfg.messaggioCustom,
      attiva: cfg.attiva,
    }
  } catch { return null }
}

function escapeBasicHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br>')
}

/**
 * Controlla se un template e` attivo per questo host (rispetta `attiva` in ConfigEmail).
 * Default: true se nessuna config.
 */
export async function isTemplateAttivo(hostId: string, templateId: EmailTemplateId): Promise<boolean> {
  const meta = getTemplateMeta(templateId)
  if (!meta?.configurabileHost) return true // i template non configurabili sono sempre attivi
  try {
    const { prisma } = await import('@/lib/db')
    const cfg = await prisma.configEmail.findUnique({
      where: { hostId_templateId: { hostId, templateId } },
      select: { attiva: true },
    })
    if (!cfg) return true
    return cfg.attiva
  } catch { return true }
}

// ─── Legacy shim — mantiene API usata dalla UI email-automatiche ────────────
// TODO: migrare prenotazione-actions.tsx alla nuova API e rimuovere questo blocco.

export type LinguaTemplate = 'it' | 'en' | 'de' | 'fr' | 'es'
export type TipoTemplate =
  | 'conferma_prenotazione'
  | 'richiesta_checkin'
  | 'pre_checkin'
  | 'reminder_arrivo'
  | 'cancellazione'
  | 'preventivo'
  | 'followup_postsoggiorno'

export interface TemplateData {
  guestNome: string
  guestCognome?: string
  strutturaNome: string
  strutturaIndirizzo?: string
  strutturaCitta?: string
  unitaNome?: string
  dataArrivo: string
  dataPartenza?: string
  numNotti?: number
  numOspiti?: number
  prezzoTotale?: string
  tassaSoggiorno?: string
  acconto?: string
  hostNome?: string
  hostTelefono?: string
  checkInUrl?: string
}

function r(tpl: string, data: TemplateData): string {
  const unita = data.unitaNome ? ' (' + data.unitaNome + ')' : ''
  return tpl
    .replace(/{guestNome}/g, data.guestNome)
    .replace(/{guestCognome}/g, data.guestCognome ?? '')
    .replace(/{strutturaNome}/g, data.strutturaNome)
    .replace(/{unitaNome}/g, unita)
    .replace(/{strutturaIndirizzo}/g, data.strutturaIndirizzo ?? '')
    .replace(/{strutturaCitta}/g, data.strutturaCitta ?? '')
    .replace(/{dataArrivo}/g, data.dataArrivo)
    .replace(/{dataPartenza}/g, data.dataPartenza ?? '')
    .replace(/{numNotti}/g, String(data.numNotti ?? ''))
    .replace(/{numOspiti}/g, String(data.numOspiti ?? ''))
    .replace(/{prezzoTotale}/g, data.prezzoTotale ?? '')
    .replace(/{tassaSoggiorno}/g, data.tassaSoggiorno ? `Tassa di soggiorno: ${data.tassaSoggiorno}/notte/persona\n` : '')
    .replace(/{acconto}/g, data.acconto ?? '')
    .replace(/{hostNome}/g, data.hostNome ?? '')
    .replace(/{hostTelefono}/g, data.hostTelefono ?? '')
    .replace(/{checkInUrl}/g, data.checkInUrl ?? '')
}

const LEGACY_TEMPLATES: Record<TipoTemplate, Record<LinguaTemplate, { oggetto: string; corpo: string }>> = {
  conferma_prenotazione: {
    it: { oggetto: 'Prenotazione confermata - {strutturaNome}', corpo: 'Ciao {guestNome},\n\nLa tua prenotazione e` stata confermata!\n\nStruttura: {strutturaNome}{unitaNome}\nArrivo: {dataArrivo}\nPartenza: {dataPartenza}\nNotti: {numNotti}\nOspiti: {numOspiti}\nTotale: {prezzoTotale}\n{tassaSoggiorno}\nA presto,\n{hostNome}\n{hostTelefono}' },
    en: { oggetto: 'Booking confirmed - {strutturaNome}', corpo: 'Hi {guestNome},\n\nYour booking has been confirmed!\n\nProperty: {strutturaNome}{unitaNome}\nCheck-in: {dataArrivo}\nCheck-out: {dataPartenza}\nNights: {numNotti}\nGuests: {numOspiti}\nTotal: {prezzoTotale}\n\nSee you soon,\n{hostNome}\n{hostTelefono}' },
    de: { oggetto: 'Buchungsbestaetigung - {strutturaNome}', corpo: 'Hallo {guestNome},\n\nIhre Buchung wurde bestaetigt!\n\nUnterkunft: {strutturaNome}{unitaNome}\nAnreise: {dataArrivo}\nAbreise: {dataPartenza}\nGesamt: {prezzoTotale}\n\nBis bald,\n{hostNome}' },
    fr: { oggetto: 'Reservation confirmee - {strutturaNome}', corpo: 'Bonjour {guestNome},\n\nVotre reservation a ete confirmee !\n\nEtablissement : {strutturaNome}{unitaNome}\nArrivee : {dataArrivo}\nDepart : {dataPartenza}\nTotal : {prezzoTotale}\n\nA bientot,\n{hostNome}' },
    es: { oggetto: 'Reserva confirmada - {strutturaNome}', corpo: 'Hola {guestNome},\n\nTu reserva ha sido confirmada!\n\nAlojamiento: {strutturaNome}{unitaNome}\nLlegada: {dataArrivo}\nSalida: {dataPartenza}\nTotal: {prezzoTotale}\n\nHasta pronto,\n{hostNome}' },
  },
  richiesta_checkin: {
    it: { oggetto: 'Completa il tuo check-in online - {strutturaNome}', corpo: 'Ciao {guestNome},\n\nCompleta il check-in online:\n{checkInUrl}\n\nA presto,\n{hostNome}' },
    en: { oggetto: 'Complete your online check-in - {strutturaNome}', corpo: 'Hi {guestNome},\n\nComplete your online check-in:\n{checkInUrl}\n\nSee you soon,\n{hostNome}' },
    de: { oggetto: 'Online Check-in - {strutturaNome}', corpo: 'Hallo {guestNome},\n\nOnline-Check-in:\n{checkInUrl}\n\nBis bald,\n{hostNome}' },
    fr: { oggetto: 'Check-in en ligne - {strutturaNome}', corpo: 'Bonjour {guestNome},\n\nCheck-in en ligne :\n{checkInUrl}\n\nA bientot,\n{hostNome}' },
    es: { oggetto: 'Check-in online - {strutturaNome}', corpo: 'Hola {guestNome},\n\nCheck-in online:\n{checkInUrl}\n\nHasta pronto,\n{hostNome}' },
  },
  pre_checkin: {
    it: { oggetto: 'Preparati per il soggiorno a {strutturaNome}', corpo: 'Ciao {guestNome},\n\nIl tuo soggiorno si avvicina. Completa il check-in online:\n{checkInUrl}\n\nA presto,\n{hostNome}' },
    en: { oggetto: 'Get ready for your stay at {strutturaNome}', corpo: 'Hi {guestNome},\n\nYour stay is almost here. Complete your online check-in:\n{checkInUrl}\n\nSee you soon,\n{hostNome}' },
    de: { oggetto: 'Bereiten Sie sich auf Ihren Aufenthalt vor - {strutturaNome}', corpo: 'Hallo {guestNome},\n\nIhr Aufenthalt steht bevor. Online-Check-in:\n{checkInUrl}\n\nBis bald,\n{hostNome}' },
    fr: { oggetto: 'Preparez votre sejour a {strutturaNome}', corpo: 'Bonjour {guestNome},\n\nVotre sejour approche. Check-in en ligne :\n{checkInUrl}\n\nA bientot,\n{hostNome}' },
    es: { oggetto: 'Preparate para tu estancia en {strutturaNome}', corpo: 'Hola {guestNome},\n\nTu estancia se acerca. Check-in online:\n{checkInUrl}\n\nHasta pronto,\n{hostNome}' },
  },
  reminder_arrivo: {
    it: { oggetto: 'Promemoria arrivo domani - {strutturaNome}', corpo: 'Ciao {guestNome},\n\nTi ricordiamo che domani e` previsto il tuo arrivo presso {strutturaNome}.\nArrivo: {dataArrivo}\nIndirizzo: {strutturaIndirizzo}, {strutturaCitta}\n\nA presto,\n{hostNome}' },
    en: { oggetto: 'Reminder: arrival tomorrow - {strutturaNome}', corpo: 'Hi {guestNome},\n\nReminder: arrival tomorrow at {strutturaNome}.\nCheck-in: {dataArrivo}\nAddress: {strutturaIndirizzo}, {strutturaCitta}' },
    de: { oggetto: 'Erinnerung: Ankunft morgen - {strutturaNome}', corpo: 'Hallo {guestNome},\n\nErinnerung: Ankunft morgen in {strutturaNome}.\nAnreise: {dataArrivo}' },
    fr: { oggetto: 'Rappel: arrivee demain - {strutturaNome}', corpo: 'Bonjour {guestNome},\n\nArrivee demain a {strutturaNome}.\nArrivee : {dataArrivo}' },
    es: { oggetto: 'Recordatorio: llegada manana - {strutturaNome}', corpo: 'Hola {guestNome},\n\nLlegada manana a {strutturaNome}.\nLlegada: {dataArrivo}' },
  },
  cancellazione: {
    it: { oggetto: 'Prenotazione cancellata - {strutturaNome}', corpo: 'Ciao {guestNome},\n\nLa tua prenotazione presso {strutturaNome} per il {dataArrivo} e` stata cancellata.\n\nCordiali saluti,\n{hostNome}' },
    en: { oggetto: 'Booking cancelled - {strutturaNome}', corpo: 'Hi {guestNome},\n\nYour booking at {strutturaNome} for {dataArrivo} has been cancelled.' },
    de: { oggetto: 'Buchung storniert - {strutturaNome}', corpo: 'Hallo {guestNome},\n\nIhre Buchung in {strutturaNome} fuer den {dataArrivo} wurde storniert.' },
    fr: { oggetto: 'Reservation annulee - {strutturaNome}', corpo: 'Bonjour {guestNome},\n\nVotre reservation a {strutturaNome} pour le {dataArrivo} a ete annulee.' },
    es: { oggetto: 'Reserva cancelada - {strutturaNome}', corpo: 'Hola {guestNome},\n\nTu reserva en {strutturaNome} para el {dataArrivo} ha sido cancelada.' },
  },
  followup_postsoggiorno: {
    it: { oggetto: 'Grazie per il tuo soggiorno - {strutturaNome}', corpo: 'Caro/a {guestNome},\n\nGrazie per aver soggiornato presso {strutturaNome} dal {dataArrivo} al {dataPartenza}.\n\nA presto,\n{hostNome}' },
    en: { oggetto: 'Thank you for your stay - {strutturaNome}', corpo: 'Dear {guestNome},\n\nThank you for staying at {strutturaNome} from {dataArrivo} to {dataPartenza}.\n\nBest regards,\n{hostNome}' },
    de: { oggetto: 'Vielen Dank - {strutturaNome}', corpo: 'Liebe/r {guestNome},\n\nVielen Dank fuer Ihren Aufenthalt in {strutturaNome} vom {dataArrivo} bis {dataPartenza}.' },
    fr: { oggetto: 'Merci pour votre sejour - {strutturaNome}', corpo: 'Cher/e {guestNome},\n\nMerci pour votre sejour a {strutturaNome} du {dataArrivo} au {dataPartenza}.' },
    es: { oggetto: 'Gracias por tu estancia - {strutturaNome}', corpo: 'Querido/a {guestNome},\n\nGracias por tu estancia en {strutturaNome} del {dataArrivo} al {dataPartenza}.' },
  },
  preventivo: {
    it: { oggetto: 'Il tuo preventivo - {strutturaNome}', corpo: 'Ciao {guestNome},\n\nPreventivo per {strutturaNome}{unitaNome}:\nArrivo: {dataArrivo}\nPartenza: {dataPartenza}\nNotti: {numNotti}\nTotale: {prezzoTotale}\nAcconto: {acconto}\n\n{hostNome}' },
    en: { oggetto: 'Your quote - {strutturaNome}', corpo: 'Hi {guestNome},\n\nQuote for {strutturaNome}{unitaNome}:\nCheck-in: {dataArrivo}\nCheck-out: {dataPartenza}\nNights: {numNotti}\nTotal: {prezzoTotale}\n\n{hostNome}' },
    de: { oggetto: 'Ihr Angebot - {strutturaNome}', corpo: 'Hallo {guestNome},\n\nAngebot fuer {strutturaNome}{unitaNome}:\nAnreise: {dataArrivo}\nAbreise: {dataPartenza}\nGesamt: {prezzoTotale}' },
    fr: { oggetto: 'Votre devis - {strutturaNome}', corpo: 'Bonjour {guestNome},\n\nDevis pour {strutturaNome}{unitaNome}:\nArrivee : {dataArrivo}\nDepart : {dataPartenza}\nTotal : {prezzoTotale}' },
    es: { oggetto: 'Tu presupuesto - {strutturaNome}', corpo: 'Hola {guestNome},\n\nPresupuesto para {strutturaNome}{unitaNome}:\nLlegada: {dataArrivo}\nSalida: {dataPartenza}\nTotal: {prezzoTotale}' },
  },
}

export function getEmailTemplate(
  tipo: TipoTemplate,
  lingua: LinguaTemplate,
  data: TemplateData,
): { oggetto: string; corpo: string } {
  const tpl = LEGACY_TEMPLATES[tipo]?.[lingua] ?? LEGACY_TEMPLATES[tipo]?.it
  return {
    oggetto: r(tpl.oggetto, data),
    corpo: r(tpl.corpo, data),
  }
}

export const LINGUE_DISPONIBILI: { value: LinguaTemplate; label: string; flag: string }[] = [
  { value: 'it', label: 'Italiano', flag: 'IT' },
  { value: 'en', label: 'English', flag: 'EN' },
  { value: 'de', label: 'Deutsch', flag: 'DE' },
  { value: 'fr', label: 'Français', flag: 'FR' },
  { value: 'es', label: 'Español', flag: 'ES' },
]

export const TIPI_TEMPLATE: { value: TipoTemplate; label: string }[] = [
  { value: 'conferma_prenotazione', label: 'Conferma prenotazione' },
  { value: 'richiesta_checkin', label: 'Richiesta check-in online' },
  { value: 'pre_checkin', label: 'Pre check-in' },
  { value: 'reminder_arrivo', label: 'Promemoria arrivo' },
  { value: 'followup_postsoggiorno', label: 'Follow-up post-soggiorno' },
  { value: 'cancellazione', label: 'Cancellazione' },
  { value: 'preventivo', label: 'Preventivo' },
]
