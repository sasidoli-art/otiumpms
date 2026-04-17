// Multi-lingua email templates - IT, EN, DE, FR, ES

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

interface EmailTemplate {
  oggetto: string
  corpo: string
}

// Helper: replaces {key} placeholders
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

const templates: Record<TipoTemplate, Record<LinguaTemplate, EmailTemplate>> = {
  conferma_prenotazione: {
    it: {
      oggetto: 'Prenotazione confermata - {strutturaNome}',
      corpo: 'Ciao {guestNome},\n\nLa tua prenotazione e` stata confermata!\n\n'
        + 'Struttura: {strutturaNome}{unitaNome}\n'
        + 'Arrivo: {dataArrivo}\n'
        + 'Partenza: {dataPartenza}\n'
        + 'Notti: {numNotti}\n'
        + 'Ospiti: {numOspiti}\n'
        + 'Totale: {prezzoTotale}\n'
        + '{tassaSoggiorno}'
        + '\nPer qualsiasi informazione non esitare a contattarci.\n\nA presto,\n{hostNome}\n{hostTelefono}',
    },
    en: {
      oggetto: 'Booking confirmed - {strutturaNome}',
      corpo: 'Hi {guestNome},\n\nYour booking has been confirmed!\n\n'
        + 'Property: {strutturaNome}{unitaNome}\n'
        + 'Check-in: {dataArrivo}\n'
        + 'Check-out: {dataPartenza}\n'
        + 'Nights: {numNotti}\n'
        + 'Guests: {numOspiti}\n'
        + 'Total: {prezzoTotale}\n'
        + '{tassaSoggiorno}'
        + '\nPlease feel free to contact us for any information.\n\nSee you soon,\n{hostNome}\n{hostTelefono}',
    },
    de: {
      oggetto: 'Buchungsbestaetigung - {strutturaNome}',
      corpo: 'Hallo {guestNome},\n\nIhre Buchung wurde bestaetigt!\n\n'
        + 'Unterkunft: {strutturaNome}{unitaNome}\n'
        + 'Anreise: {dataArrivo}\n'
        + 'Abreise: {dataPartenza}\n'
        + 'Naechte: {numNotti}\n'
        + 'Gaeste: {numOspiti}\n'
        + 'Gesamt: {prezzoTotale}\n'
        + '{tassaSoggiorno}'
        + '\nBis bald,\n{hostNome}\n{hostTelefono}',
    },
    fr: {
      oggetto: 'Reservation confirmee - {strutturaNome}',
      corpo: 'Bonjour {guestNome},\n\nVotre reservation a ete confirmee !\n\n'
        + 'Etablissement : {strutturaNome}{unitaNome}\n'
        + 'Arrivee : {dataArrivo}\n'
        + 'Depart : {dataPartenza}\n'
        + 'Nuits : {numNotti}\n'
        + 'Total : {prezzoTotale}\n'
        + '{tassaSoggiorno}'
        + '\nA bientot,\n{hostNome}',
    },
    es: {
      oggetto: 'Reserva confirmada - {strutturaNome}',
      corpo: 'Hola {guestNome},\n\nTu reserva ha sido confirmada!\n\n'
        + 'Alojamiento: {strutturaNome}{unitaNome}\n'
        + 'Llegada: {dataArrivo}\n'
        + 'Salida: {dataPartenza}\n'
        + 'Noches: {numNotti}\n'
        + 'Total: {prezzoTotale}\n'
        + '{tassaSoggiorno}'
        + '\nHasta pronto,\n{hostNome}',
    },
  },

  richiesta_checkin: {
    it: {
      oggetto: 'Completa il tuo check-in online - {strutturaNome}',
      corpo: 'Ciao {guestNome},\n\n'
        + 'Il tuo arrivo si avvicina! Completa il check-in online:\n\n'
        + '{checkInUrl}\n\n'
        + 'Ci vediamo il {dataArrivo} presso {strutturaNome}.\n\nA presto,\n{hostNome}\n{hostTelefono}',
    },
    en: {
      oggetto: 'Complete your online check-in - {strutturaNome}',
      corpo: 'Hi {guestNome},\n\n'
        + 'Your arrival is approaching! Complete your online check-in:\n\n'
        + '{checkInUrl}\n\n'
        + 'See you on {dataArrivo} at {strutturaNome}.\n\nSee you soon,\n{hostNome}\n{hostTelefono}',
    },
    de: {
      oggetto: 'Online Check-in abschliessen - {strutturaNome}',
      corpo: 'Hallo {guestNome},\n\n'
        + 'Ihre Ankunft naht! Schliessen Sie Ihren Online-Check-in ab:\n\n'
        + '{checkInUrl}\n\n'
        + 'Wir sehen uns am {dataArrivo} in {strutturaNome}.\n\nBis bald,\n{hostNome}',
    },
    fr: {
      oggetto: 'Completez votre check-in en ligne - {strutturaNome}',
      corpo: 'Bonjour {guestNome},\n\n'
        + 'Votre arrivee approche ! Effectuez votre check-in en ligne :\n\n'
        + '{checkInUrl}\n\n'
        + 'A bientot le {dataArrivo} a {strutturaNome}.\n\nCordialement,\n{hostNome}',
    },
    es: {
      oggetto: 'Completa tu check-in online - {strutturaNome}',
      corpo: 'Hola {guestNome},\n\n'
        + 'Tu llegada se acerca! Completa tu check-in online:\n\n'
        + '{checkInUrl}\n\n'
        + 'Nos vemos el {dataArrivo} en {strutturaNome}.\n\nHasta pronto,\n{hostNome}',
    },
  },

  pre_checkin: {
    it: {
      oggetto: 'Preparati per il soggiorno a {strutturaNome}',
      corpo: 'Ciao {guestNome},\n\nil tuo soggiorno a {strutturaNome} si avvicina!\n\n'
        + '📅 Arrivo: {dataArrivo}\n'
        + '🏠 {unitaNome} — {numOspiti} ospiti\n\n'
        + 'Per velocizzare il tuo arrivo, puoi completare il check-in online adesso. '
        + 'Ti chiederemo i dati di tutti gli ospiti e la firma — così in reception sarà questione di un minuto.\n\n'
        + '{checkInUrl}\n\n'
        + 'Se preferisci, puoi completare il check-in direttamente in struttura al tuo arrivo.\n\n'
        + 'A presto,\n{hostNome}\n{hostTelefono}',
    },
    en: {
      oggetto: 'Get ready for your stay at {strutturaNome}',
      corpo: 'Hi {guestNome},\n\nyour stay at {strutturaNome} is almost here!\n\n'
        + '📅 Arrival: {dataArrivo}\n'
        + '🏠 {unitaNome} — {numOspiti} guests\n\n'
        + 'To speed up your arrival, you can complete your online check-in now. '
        + 'We will ask for the details of all guests and a signature — so at reception it will only take a minute.\n\n'
        + '{checkInUrl}\n\n'
        + 'If you prefer, you can also check in directly at the property on arrival.\n\n'
        + 'See you soon,\n{hostNome}\n{hostTelefono}',
    },
    de: {
      oggetto: 'Bereiten Sie sich auf Ihren Aufenthalt in {strutturaNome} vor',
      corpo: 'Hallo {guestNome},\n\nIhr Aufenthalt in {strutturaNome} steht bevor!\n\n'
        + '📅 Anreise: {dataArrivo}\n'
        + '🏠 {unitaNome} — {numOspiti} Gaeste\n\n'
        + 'Um Ihre Ankunft zu beschleunigen, koennen Sie jetzt Ihren Online-Check-in abschliessen.\n\n'
        + '{checkInUrl}\n\n'
        + 'Bis bald,\n{hostNome}\n{hostTelefono}',
    },
    fr: {
      oggetto: 'Preparez votre sejour a {strutturaNome}',
      corpo: 'Bonjour {guestNome},\n\nvotre sejour a {strutturaNome} approche !\n\n'
        + '📅 Arrivee : {dataArrivo}\n'
        + '🏠 {unitaNome} — {numOspiti} personnes\n\n'
        + 'Pour accelerer votre arrivee, vous pouvez effectuer votre check-in en ligne des maintenant.\n\n'
        + '{checkInUrl}\n\n'
        + 'A bientot,\n{hostNome}',
    },
    es: {
      oggetto: 'Preparate para tu estancia en {strutturaNome}',
      corpo: 'Hola {guestNome},\n\ntu estancia en {strutturaNome} esta cerca!\n\n'
        + '📅 Llegada: {dataArrivo}\n'
        + '🏠 {unitaNome} — {numOspiti} huespedes\n\n'
        + 'Para agilizar tu llegada, puedes completar tu check-in online ahora.\n\n'
        + '{checkInUrl}\n\n'
        + 'Hasta pronto,\n{hostNome}',
    },
  },

  reminder_arrivo: {
    it: {
      oggetto: 'Promemoria arrivo domani - {strutturaNome}',
      corpo: 'Ciao {guestNome},\n\n'
        + 'Ti ricordiamo che domani e` previsto il tuo arrivo presso {strutturaNome}.\n\n'
        + 'Arrivo: {dataArrivo}\n'
        + 'Indirizzo: {strutturaIndirizzo}, {strutturaCitta}\n\n'
        + 'Per informazioni: {hostTelefono}\n\nA presto,\n{hostNome}',
    },
    en: {
      oggetto: 'Reminder: arrival tomorrow - {strutturaNome}',
      corpo: 'Hi {guestNome},\n\n'
        + 'Just a reminder that your arrival at {strutturaNome} is scheduled for tomorrow.\n\n'
        + 'Check-in: {dataArrivo}\n'
        + 'Address: {strutturaIndirizzo}, {strutturaCitta}\n\n'
        + 'For information: {hostTelefono}',
    },
    de: {
      oggetto: 'Erinnerung: Ankunft morgen - {strutturaNome}',
      corpo: 'Hallo {guestNome},\n\n'
        + 'Erinnerung: Ihre Ankunft in {strutturaNome} ist fuer morgen geplant.\n\n'
        + 'Anreise: {dataArrivo}\n'
        + 'Fuer Informationen: {hostTelefono}',
    },
    fr: {
      oggetto: 'Rappel: arrivee demain - {strutturaNome}',
      corpo: 'Bonjour {guestNome},\n\n'
        + 'Rappel : votre arrivee a {strutturaNome} est prevue pour demain.\n\n'
        + 'Arrivee : {dataArrivo}\n'
        + 'Pour toute information : {hostTelefono}',
    },
    es: {
      oggetto: 'Recordatorio: llegada manana - {strutturaNome}',
      corpo: 'Hola {guestNome},\n\n'
        + 'Recordatorio: tu llegada a {strutturaNome} esta prevista para manana.\n\n'
        + 'Llegada: {dataArrivo}\n'
        + 'Para informacion: {hostTelefono}',
    },
  },

  cancellazione: {
    it: {
      oggetto: 'Prenotazione cancellata - {strutturaNome}',
      corpo: 'Ciao {guestNome},\n\n'
        + 'La tua prenotazione presso {strutturaNome} per il {dataArrivo} e` stata cancellata.\n\n'
        + 'Per informazioni contattaci.\n\nCordiali saluti,\n{hostNome}',
    },
    en: {
      oggetto: 'Booking cancelled - {strutturaNome}',
      corpo: 'Hi {guestNome},\n\n'
        + 'Your booking at {strutturaNome} for {dataArrivo} has been cancelled.\n\n'
        + 'Please contact us for any questions.',
    },
    de: {
      oggetto: 'Buchung storniert - {strutturaNome}',
      corpo: 'Hallo {guestNome},\n\n'
        + 'Ihre Buchung in {strutturaNome} fuer den {dataArrivo} wurde storniert.\n\n'
        + 'Bitte kontaktieren Sie uns bei Fragen.',
    },
    fr: {
      oggetto: 'Reservation annulee - {strutturaNome}',
      corpo: 'Bonjour {guestNome},\n\n'
        + 'Votre reservation a {strutturaNome} pour le {dataArrivo} a ete annulee.\n\n'
        + 'Contactez-nous pour toute question.',
    },
    es: {
      oggetto: 'Reserva cancelada - {strutturaNome}',
      corpo: 'Hola {guestNome},\n\n'
        + 'Tu reserva en {strutturaNome} para el {dataArrivo} ha sido cancelada.\n\n'
        + 'Contactanos para cualquier consulta.',
    },
  },

  followup_postsoggiorno: {
    it: {
      oggetto: 'Grazie per il tuo soggiorno - {strutturaNome}',
      corpo: 'Caro/a {guestNome},\n\n'
        + 'Grazie per aver soggiornato presso {strutturaNome} dal {dataArrivo} al {dataPartenza}.\n'
        + 'Speriamo che il tuo soggiorno sia stato piacevole!\n\n'
        + 'Il tuo feedback ci aiuta a migliorare. Saremmo felici di riavervi come ospiti.\n\n'
        + 'A presto,\n{hostNome}\n{hostTelefono}',
    },
    en: {
      oggetto: 'Thank you for your stay - {strutturaNome}',
      corpo: 'Dear {guestNome},\n\n'
        + 'Thank you for staying at {strutturaNome} from {dataArrivo} to {dataPartenza}.\n'
        + 'We hope you had a wonderful time!\n\n'
        + 'Your feedback helps us improve. We would love to welcome you again.\n\n'
        + 'Best regards,\n{hostNome}',
    },
    de: {
      oggetto: 'Vielen Dank fuer Ihren Aufenthalt - {strutturaNome}',
      corpo: 'Liebe/r {guestNome},\n\n'
        + 'Vielen Dank fuer Ihren Aufenthalt in {strutturaNome} vom {dataArrivo} bis {dataPartenza}.\n'
        + 'Wir hoffen, es hat Ihnen gefallen!\n\n'
        + 'Bis bald,\n{hostNome}',
    },
    fr: {
      oggetto: 'Merci pour votre sejour - {strutturaNome}',
      corpo: 'Cher/e {guestNome},\n\n'
        + 'Merci pour votre sejour a {strutturaNome} du {dataArrivo} au {dataPartenza}.\n'
        + 'Nous esperons que votre sejour a ete agreable !\n\n'
        + 'A bientot,\n{hostNome}',
    },
    es: {
      oggetto: 'Gracias por tu estancia - {strutturaNome}',
      corpo: 'Querido/a {guestNome},\n\n'
        + 'Gracias por tu estancia en {strutturaNome} del {dataArrivo} al {dataPartenza}.\n'
        + 'Esperamos que hayas disfrutado!\n\n'
        + 'Hasta pronto,\n{hostNome}',
    },
  },

  preventivo: {
    it: {
      oggetto: 'Il tuo preventivo - {strutturaNome}',
      corpo: 'Ciao {guestNome},\n\n'
        + 'Ecco il preventivo per il tuo soggiorno presso {strutturaNome}{unitaNome}:\n\n'
        + 'Arrivo: {dataArrivo}\n'
        + 'Partenza: {dataPartenza}\n'
        + 'Notti: {numNotti}\n'
        + 'Ospiti: {numOspiti}\n'
        + 'Totale stimato: {prezzoTotale}\n'
        + 'Acconto: {acconto}\n\n'
        + 'Per confermare la prenotazione contattaci.\n\nCordiali saluti,\n{hostNome}\n{hostTelefono}',
    },
    en: {
      oggetto: 'Your quote - {strutturaNome}',
      corpo: 'Hi {guestNome},\n\n'
        + 'Here is your quote for your stay at {strutturaNome}{unitaNome}:\n\n'
        + 'Check-in: {dataArrivo}\n'
        + 'Check-out: {dataPartenza}\n'
        + 'Nights: {numNotti}\n'
        + 'Guests: {numOspiti}\n'
        + 'Total: {prezzoTotale}\n\n'
        + 'To confirm your booking, please contact us.\n\nBest regards,\n{hostNome}',
    },
    de: {
      oggetto: 'Ihr Angebot - {strutturaNome}',
      corpo: 'Hallo {guestNome},\n\n'
        + 'Hier ist Ihr Angebot fuer Ihren Aufenthalt in {strutturaNome}{unitaNome}:\n\n'
        + 'Anreise: {dataArrivo}\n'
        + 'Abreise: {dataPartenza}\n'
        + 'Gesamt: {prezzoTotale}\n\n'
        + 'Kontaktieren Sie uns zur Bestaetigung.',
    },
    fr: {
      oggetto: 'Votre devis - {strutturaNome}',
      corpo: 'Bonjour {guestNome},\n\n'
        + 'Voici votre devis pour votre sejour a {strutturaNome}{unitaNome} :\n\n'
        + 'Arrivee : {dataArrivo}\n'
        + 'Depart : {dataPartenza}\n'
        + 'Total : {prezzoTotale}\n\n'
        + 'Contactez-nous pour confirmer votre reservation.',
    },
    es: {
      oggetto: 'Tu presupuesto - {strutturaNome}',
      corpo: 'Hola {guestNome},\n\n'
        + 'Aqui esta tu presupuesto para tu estancia en {strutturaNome}{unitaNome}:\n\n'
        + 'Llegada: {dataArrivo}\n'
        + 'Salida: {dataPartenza}\n'
        + 'Total: {prezzoTotale}\n\n'
        + 'Contactanos para confirmar tu reserva.',
    },
  },
}

export function getEmailTemplate(
  tipo: TipoTemplate,
  lingua: LinguaTemplate,
  data: TemplateData
): EmailTemplate {
  const tpl = templates[tipo]?.[lingua] ?? templates[tipo]?.it
  return {
    oggetto: r(tpl.oggetto, data),
    corpo: r(tpl.corpo, data),
  }
}

export const LINGUE_DISPONIBILI: { value: LinguaTemplate; label: string; flag: string }[] = [
  { value: 'it', label: 'Italiano', flag: 'IT' },
  { value: 'en', label: 'English', flag: 'EN' },
  { value: 'de', label: 'Deutsch', flag: 'DE' },
  { value: 'fr', label: 'Francais', flag: 'FR' },
  { value: 'es', label: 'Espanol', flag: 'ES' },
]

export const TIPI_TEMPLATE: { value: TipoTemplate; label: string }[] = [
  { value: 'conferma_prenotazione', label: 'Conferma prenotazione' },
  { value: 'richiesta_checkin', label: 'Richiesta check-in online' },
  { value: 'reminder_arrivo', label: 'Promemoria arrivo' },
  { value: 'followup_postsoggiorno', label: 'Follow-up post-soggiorno' },
  { value: 'cancellazione', label: 'Cancellazione' },
  { value: 'preventivo', label: 'Preventivo' },
]
