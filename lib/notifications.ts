/**
 * lib/notifications.ts — Sistema notifiche centralizzato.
 *
 * Crea record Notifica nel DB. 18 tipi predefiniti con helper nominali.
 * Non si occupa di push real-time (SSE/WebSocket) — i client fanno polling
 * tramite /api/host/sidebar-badges.
 */
import { prisma } from '@/lib/db'

// ─── Tipi ────────────────────────────────────────────────────────────────────

export type TipoNotifica =
  | 'prenotazione'
  | 'checkin'
  | 'checkout'
  | 'cancellazione'
  | 'richiesta'
  | 'spa'
  | 'manutenzione'
  | 'housekeeping'
  | 'messaggio'
  | 'pagamento'
  | 'fattura'
  | 'alloggiati'
  | 'sistema'
  | 'gdpr'
  | 'abbonamento'
  | 'canale'
  | 'concierge'
  | 'upselling'

export type InviaNotificaInput = {
  hostId: string
  tipo: TipoNotifica
  titolo: string
  messaggio: string
  linkUrl?: string
  urgente?: boolean
  destinatarioUserId?: string
}

// ─── Core ─────────────────────────────────────────────────────────────────────

export async function inviaNotifica(input: InviaNotificaInput): Promise<string> {
  const notifica = await prisma.notifica.create({
    data: {
      hostId: input.hostId,
      tipo: input.tipo,
      titolo: input.titolo,
      messaggio: input.messaggio,
      linkUrl: input.linkUrl ?? null,
      letta: false,
    },
    select: { id: true },
  })
  return notifica.id
}

// ─── Helper per tipo ─────────────────────────────────────────────────────────

export function notificaNuovaPrenotazione(
  hostId: string,
  opts: { guestNome: string; guestCognome: string; strutturaNome: string; prenotazioneId: string; notti: number; importo: number },
) {
  return inviaNotifica({
    hostId,
    tipo: 'prenotazione',
    titolo: `Nuova prenotazione: ${opts.guestNome} ${opts.guestCognome}`,
    messaggio: `${opts.strutturaNome} · ${opts.notti} notti · €${opts.importo.toFixed(0)}`,
    linkUrl: `/host/prenotazioni/${opts.prenotazioneId}`,
  })
}

export function notificaCheckinOnline(
  hostId: string,
  opts: { guestNome: string; guestCognome: string; prenotazioneId: string; numAccompagnatori: number },
) {
  return inviaNotifica({
    hostId,
    tipo: 'checkin',
    titolo: `Check-in online: ${opts.guestNome} ${opts.guestCognome}`,
    messaggio: `Documento e firma acquisiti${opts.numAccompagnatori > 0 ? ` · ${opts.numAccompagnatori} accompagnator${opts.numAccompagnatori === 1 ? 'e' : 'i'}` : ''}`,
    linkUrl: `/host/prenotazioni/${opts.prenotazioneId}`,
  })
}

export function notificaCheckout(
  hostId: string,
  opts: { guestNome: string; guestCognome: string; prenotazioneId: string },
) {
  return inviaNotifica({
    hostId,
    tipo: 'checkout',
    titolo: `Checkout: ${opts.guestNome} ${opts.guestCognome}`,
    messaggio: 'La stanza è ora disponibile per la pulizia.',
    linkUrl: `/host/prenotazioni/${opts.prenotazioneId}`,
  })
}

export function notificaCancellazione(
  hostId: string,
  opts: { guestNome: string; guestCognome: string; prenotazioneId: string; motivo?: string },
) {
  return inviaNotifica({
    hostId,
    tipo: 'cancellazione',
    titolo: `Prenotazione annullata: ${opts.guestNome} ${opts.guestCognome}`,
    messaggio: opts.motivo ?? 'Prenotazione annullata.',
    linkUrl: `/host/prenotazioni/${opts.prenotazioneId}`,
  })
}

export function notificaManutenzioneUrgente(
  hostId: string,
  opts: { titolo: string; unitaNome: string; segnalazioneId: string },
) {
  return inviaNotifica({
    hostId,
    tipo: 'manutenzione',
    titolo: `🔴 Urgente: ${opts.titolo}`,
    messaggio: `Camera/unità: ${opts.unitaNome}`,
    linkUrl: `/host/manutenzione/${opts.segnalazioneId}`,
    urgente: true,
  })
}

export function notificaTaskHK(
  hostId: string,
  opts: { unitaNome: string; taskId: string },
) {
  return inviaNotifica({
    hostId,
    tipo: 'housekeeping',
    titolo: `Task HK completato: ${opts.unitaNome}`,
    messaggio: 'La stanza è stata segnata come pulita.',
    linkUrl: `/host/housekeeping`,
  })
}

export function notificaNuovoMessaggio(
  hostId: string,
  opts: { guestNome: string; prenotazioneId: string; anteprima: string },
) {
  return inviaNotifica({
    hostId,
    tipo: 'messaggio',
    titolo: `Messaggio da ${opts.guestNome}`,
    messaggio: opts.anteprima.substring(0, 100),
    linkUrl: `/host/prenotazioni/${opts.prenotazioneId}`,
  })
}

export function notificaNuovoAppuntamentoSpa(
  hostId: string,
  opts: { guestNome: string; guestCognome: string; servizioNome: string; dataFmt: string; oraFmt: string },
) {
  return inviaNotifica({
    hostId,
    tipo: 'spa',
    titolo: 'Nuovo appuntamento SPA',
    messaggio: `${opts.guestNome} ${opts.guestCognome} — "${opts.servizioNome}" il ${opts.dataFmt} alle ${opts.oraFmt}`,
    linkUrl: '/host/spa/appuntamenti',
  })
}

export function notificaPagamentoSpa(
  hostId: string,
  opts: { guestNome: string; importo: number; appuntamentoId: string },
) {
  return inviaNotifica({
    hostId,
    tipo: 'pagamento',
    titolo: `Pagamento SPA: €${opts.importo.toFixed(2)}`,
    messaggio: `${opts.guestNome} · pagamento riscosso`,
    linkUrl: `/host/spa/appuntamenti`,
  })
}

export function notificaFatturaEmessa(
  hostId: string,
  opts: { numero: string; importo: number; fatturaId: string },
) {
  return inviaNotifica({
    hostId,
    tipo: 'fattura',
    titolo: `Fattura emessa: ${opts.numero}`,
    messaggio: `Totale: €${opts.importo.toFixed(2)}`,
    linkUrl: `/host/fatture/${opts.fatturaId}`,
  })
}

export function notificaEscalationConcierge(
  hostId: string,
  opts: { guestNome: string; conversazioneId: string; motivo: string },
) {
  return inviaNotifica({
    hostId,
    tipo: 'concierge',
    titolo: `Escalation concierge: ${opts.guestNome}`,
    messaggio: opts.motivo,
    linkUrl: `/host/concierge/${opts.conversazioneId}`,
    urgente: true,
  })
}

export function notificaSistema(
  hostId: string,
  opts: { titolo: string; messaggio: string; linkUrl?: string; urgente?: boolean },
) {
  return inviaNotifica({
    hostId,
    tipo: 'sistema',
    titolo: opts.titolo,
    messaggio: opts.messaggio,
    linkUrl: opts.linkUrl,
    urgente: opts.urgente,
  })
}

export function notificaAbbonamento(
  hostId: string,
  opts: { messaggio: string; linkUrl?: string },
) {
  return inviaNotifica({
    hostId,
    tipo: 'abbonamento',
    titolo: 'Abbonamento',
    messaggio: opts.messaggio,
    linkUrl: opts.linkUrl ?? '/host/abbonamento',
  })
}

export function notificaSincronizzazioneCanale(
  hostId: string,
  opts: { canaleNome: string; nBlocchi: number },
) {
  return inviaNotifica({
    hostId,
    tipo: 'canale',
    titolo: `Canale sincronizzato: ${opts.canaleNome}`,
    messaggio: `${opts.nBlocchi} blocchi importati`,
    linkUrl: '/host/canali',
  })
}

export function notificaUpselling(
  hostId: string,
  opts: { guestNome: string; servizio: string; prenotazioneId: string },
) {
  return inviaNotifica({
    hostId,
    tipo: 'upselling',
    titolo: `Upselling accettato: ${opts.guestNome}`,
    messaggio: opts.servizio,
    linkUrl: `/host/prenotazioni/${opts.prenotazioneId}`,
  })
}
